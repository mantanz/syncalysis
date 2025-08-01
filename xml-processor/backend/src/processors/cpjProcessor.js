/**
 * CPJ (Customer Point of Sale Journal) Processor
 * 
 * PROCESSES: CPJ XML files (Customer Point of Sale Journal)
 * 
 * XML TO DATABASE TABLE MAPPING:
 * ===============================
 * 
 * XML Elements → Database Tables:
 * 
 * 1. STORE DATA:
 *    - XML: <store>, <storeid>, <location>
 *    - TABLE: stores
 *    - FIELDS: store_id, store_name, address, city, state, zip_code
 * 
 * 2. TRANSACTION DATA:
 *    - XML: <transaction>, <trans>, <receipt>
 *    - TABLE: sales_transaction
 *    - FIELDS: transaction_id, store_id, pos_device_terminal_id, transaction_date_time,
 *             transaction_type, total_amount, tax_amount, discount_amount, tender_amount
 * 
 * 3. TRANSACTION LINE ITEMS:
 *    - XML: <lineitem>, <item>, <product>
 *    - TABLE: transaction_line_item
 *    - FIELDS: line_item_id, transaction_id, upc_id, quantity, unit_price, 
 *             extended_price, discount_amount
 * 
 * 4. POS TERMINAL DATA:
 *    - XML: <terminal>, <pos>, <register>
 *    - TABLE: pos_device_terminal
 *    - FIELDS: pos_device_terminal_id, store_id, terminal_name, terminal_type, is_active
 * 
 * 5. PAYMENT DATA:
 *    - XML: <payment>, <tender>, <cash>, <credit>, <debit>
 *    - TABLE: payment
 *    - FIELDS: payment_id, transaction_id, payment_type, payment_amount, 
 *             payment_method, authorization_code
 * 
 * 6. TAX DATA:
 *    - XML: <tax>, <taxline>
 *    - TABLE: transaction_line_item_tax
 *    - FIELDS: tax_id, line_item_id, tax_type, tax_rate, tax_amount
 * 
 * 7. PROMOTION DATA:
 *    - XML: <promotion>, <discount>, <coupon>
 *    - TABLE: promotions_line_item
 *    - FIELDS: promotion_line_item_id, line_item_id, promotion_id, discount_amount
 *    - RELATED TABLE: promotions_program_details (auto-created if missing)
 * 
 * 8. LOYALTY DATA:
 *    - XML: <loyalty>, <reward>, <member>
 *    - TABLE: transaction_loyalty
 *    - FIELDS: loyalty_transaction_uuid, transaction_id, loyalty_account_number,
 *             loyalty_auto_discount, loyalty_earned_points, loyalty_redeemed_points
 * 
 * 9. DEPARTMENT DATA (Reference):
 *    - XML: <department>, <dept>
 *    - TABLE: departments
 *    - FIELDS: department_id, department_name, department_type, 
 *             is_car_wash_department, is_fuel_department, is_lottery_department
 * 
 * 10. PRODUCT DATA (Reference):
 *     - XML: <upc>, <product>, <item>
 *     - TABLE: pricebook
 *     - FIELDS: upc_id, department_id, upc_description, cost, retail_price
 * 
 * 11. TRANSACTION EVENT LOG:
 *     - XML: <event>, <log>, <activity>
 *     - TABLE: transaction_event_log
 *     - FIELDS: event_id, transaction_id, event_type, event_timestamp, event_data
 * 
 * PROCESSING FLOW:
 * ================
 * 1. Parse CPJ XML file
 * 2. Extract store information → Create/update stores table
 * 3. Extract POS terminal data → Create/update pos_device_terminal table
 * 4. Filter transactions → Only process "network sale" and "sale" transaction types
 * 5. Extract transaction header → Create sales_transaction record
 * 6. Process line items → Create transaction_line_item records
 * 7. Process payments → Create payment records
 * 8. Process taxes → Create transaction_line_item_tax records
 * 9. Process promotions → Create promotions_line_item records
 * 10. Process loyalty data → Create transaction_loyalty records
 * 11. Create reference data (departments, products) as needed
 * 12. Log events → Create transaction_event_log records
 */

const xml2js = require('xml2js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const models = require('../models');
const { classifyDepartment } = require('../utils/departmentClassifier');
const { getCurrentUTC, parseDateTimePreserveFormat } = require('../utils/dateUtils');

class CPJProcessor {
  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      normalizeTags: true
    });
  }

  async processFile(filePath) {
    try {
      logger.info(`Processing CPJ file: ${filePath}`);
      
      const xmlContent = await fs.readFile(filePath, 'utf-8');
      const result = await this.parser.parseStringPromise(xmlContent);
      
      if (!result.transset) {
        throw new Error('Invalid CPJ file structure - missing transset');
      }

      const transactions = Array.isArray(result.transset.trans) 
        ? result.transset.trans 
        : [result.transset.trans];

      let processedCount = 0;
      let errorCount = 0;

      logger.info(`Found ${transactions.length} transactions to process`);

      for (const transaction of transactions) {
        try {
        await this.processTransaction(transaction);
          processedCount++;
        } catch (error) {
          // Get transaction ID safely for error logging
          const transactionId = this.getTransactionId(transaction);
          logger.error(`Error processing transaction ${transactionId}:`, error);
          errorCount++;
        }
      }

      logger.info(`CPJ processing completed: ${processedCount} successful, ${errorCount} errors`);
      return { 
        success: true, 
        fileType: 'CPJ',
        fileName: path.basename(filePath),
        processedTransactions: processedCount,
        errors: errorCount
      };

    } catch (error) {
      logger.error(`Error processing CPJ file ${filePath}:`, error);
      throw error;
    }
  }

  // Add a helper method to safely get transaction ID
  getTransactionId(transaction) {
    try {
      // Try multiple possible locations for transaction ID
      return transaction?.trheader?.trticknum?.trseq || 
             transaction?.trheader?.trseq ||
             transaction?.trheader?.transactionid ||
             transaction?.transactionid ||
             transaction?.id ||
             null;
    } catch (error) {
      return null;
    }
  }

  async processTransaction(transData) {
    const transaction = await models.sequelize.transaction();  

    try {
      const header = transData.trheader || {};
      const values = transData.trvalue || {};
      const lines = transData.trlines || {};
      const paylines = transData.trpaylines || {};
      const loyalty = transData.trloyalty || {};

      // Process "network sale", "sale", "nosale", "refund sale", and "void" transaction types
      const transactionType = transData.type || '';
      const allowedTypes = ['network sale', 'sale', 'nosale', 'refund sale', 'void'];
      
      if (!allowedTypes.includes(transactionType)) {
        logger.info(`Skipping transaction type: ${transactionType}`);
        await transaction.commit();
        return;
      }

      // Safely extract posnum with proper null checking
      const posnum = header.posnum || header.trticknum?.posnum;
      const posnumInt = posnum ? parseInt(posnum) : null;
      const storePosUniqueId = header.storenumber && posnumInt ? `${header.storenumber}-${posnumInt}` : null;
      const isVoid = this.isTransactionVoid(transData.type);
      // Ensure store exists
      if (header.storenumber) {
        await this.ensureStoreExists(header.storenumber, { transaction });
      }

      // Ensure POS terminal exists
      if (posnumInt && header.storenumber) {
        await this.ensurePosTerminalExists(storePosUniqueId, posnumInt, header.storenumber, { transaction });
      }

      // Process transaction event log
      const eventLog = await this.processTransactionEventLog(header, values, { transaction });

      // Create sales transaction
      const salesTransaction = await this.createSalesTransaction(
        transData,
        header, 
        values, 
        storePosUniqueId,
        eventLog?.transaction_event_log_id, 
        { transaction }
      );
      
      // Process line items
      if (lines.trline) {
        const lineItems = Array.isArray(lines.trline) ? lines.trline : [lines.trline];
        for (const lineItem of lineItems) {
          await this.processTransactionLineItem(isVoid, salesTransaction.transaction_id, salesTransaction.sales_transaction_unique_id, lineItem, { transaction });
        }
      }

      // Process payments
      if (paylines.trpayline) {
        const payments = Array.isArray(paylines.trpayline) ? paylines.trpayline : [paylines.trpayline];
        for (const payment of payments) {
          await this.processPayment(salesTransaction.transaction_id, salesTransaction.sales_transaction_unique_id, payment, header, { transaction });
        }
      }

      // Process loyalty programs
      if (loyalty.trloyaltyprogram) {
        await this.processLoyaltyProgram(salesTransaction.transaction_id, salesTransaction.sales_transaction_unique_id, loyalty, { transaction });
      }

      await transaction.commit();

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async processTransactionEventLog(header, values, options = {}) {
    // Add more robust checking for required fields
    const termMsgSN = header.termmsgsn?._ || '';
    const termValue = header.termmsgsn?.term || '';
    const trSeq = header.trticknum?.trseq || header.trseq || '';
    
    if (!termMsgSN && !trSeq) {
      logger.warn('Skipping transaction event log - missing required fields');
      return null;
    }

    // Compute transaction_event_log_id as <termMsgSN term= + - + termMsgSN>
    const transactionEventLogId = termValue && termMsgSN ? `${termValue}-${termMsgSN}` : `seq-${trSeq}`;

    const eventLogData = {
      transaction_event_log_id: transactionEventLogId,
      duration: parseInt(header.duration) || null,
      event_type: header.termmsgsn?.type || '',
      verifone_transaction_serial_number: parseInt(header.truniquesn) || null,
      customer_dob_entry_method: values.custdob?.dobEntryMeth || null,
      customer_dob: values.custdob?._ || null,
      customer_age: values.custdob?.custAge || null,
      terminal_serial_number: header.termmsgsn?._ || null
    };

    const [eventLog, created] = await models.TransactionEventLog.findOrCreate({
      where: { transaction_event_log_id: eventLogData.transaction_event_log_id },
      defaults: eventLogData,
      transaction: options.transaction
    });

    return eventLog;
  }

  async createSalesTransaction(transData, header, values, storePosUniqueId, eventLogId, options = {}) {
    // Add more robust field extraction with fallbacks
    const transactionData = {
      sales_transaction_unique_id: header.uniqueid || `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transaction_id: parseInt(header.trticknum?.trseq) || parseInt(header.trseq) || null,
      store_id: header.storenumber || null,
      store_pos_unique_id: storePosUniqueId,
      original_register_id: parseInt(header.troriginalticknum?.posnum) || null,
      original_transaction_id: parseInt(header.troriginalticknum?.trseq) || null,
      transaction_event_log_id: eventLogId,
      cashier_session: parseInt(header.cashier?.period) || null,
      employee_id: parseInt(header.cashier?.sysid) || null,
      employee_name: header.cashier?._ || null,
      cashier_system_id: parseInt(header.cashier?.sysid) || null,
      food_stamp_eligible_total: values.trfstmp?.trfstmptot ? parseFloat(values.trfstmp?.trfstmptot) || null : null,
      grand_totalizer: parseFloat(values.trgtotalizer) || null,
      total_amount: parseFloat(values.trtotwtax) || null,
      total_no_tax: parseFloat(values.trtotnotax) || null,
      total_tax_amount: parseFloat(values.trtottax) || null,
      transaction_datetime: header.date,  // Store the original string directly
      transaction_type: transData.type,
      is_fuel_prepay: transData.fuelPrepay === 'true' || transData.fuelPrepay === true,
      is_fuel_prepay_completion: transData.fuelPrepayCompletion === 'true' || transData.fuelPrepayCompletion === true,
      is_rollback: transData.rollback === 'true' || transData.rollback === true,
      is_suspended: transData.suspended === 'true' || transData.suspended === true,
      was_recalled: transData.recalled === 'true' || transData.recalled === true
    };
    console.log('---------------------------------------');
    console.log(header.date);
    console.log(transactionData.transaction_datetime);
    
    const [salesTransaction, created] = await models.SalesTransaction.findOrCreate({
      where: { sales_transaction_unique_id: transactionData.sales_transaction_unique_id },
      defaults: transactionData,
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new sales transaction: ${salesTransaction.sales_transaction_unique_id}`);
    }

    return salesTransaction;
  }
  

  async processTransactionLineItem(isVoid, transactionId, salesTransactionUniqueId, lineData, options = {}) {
    // Ensure department exists
    let departmentId = null;
    if (lineData.trldept?.number || lineData.trldept) {
      departmentId = await this.ensureDepartmentExists(lineData, options);
    }

    // Ensure product exists in pricebook
    let upcId = null;
    if (lineData.trlupc) {
      upcId = await this.ensureProductExists(lineData, departmentId, transactionId, options);
    }
   
    const lineItemData = {
      transaction_id: transactionId,
      sales_transaction_unique_id: salesTransactionUniqueId,
      upc_id: upcId,
      category_name: lineData.trlcat?._ || null,
      category_number: parseInt(lineData.trlcat?.number) || null,
      department: departmentId,
      department_name:  lineData.trldept._ || null,
      department_type: (lineData.trldept?.type === 'norm' ? 'Inside Sales' : lineData.trldept?.type) || null,
      has_birthday_verification: typeof lineData.trlflags.trlbdayverif === 'string',
      has_category_override: typeof lineData.trlflags.trlcatcust === 'string',
      has_department_override: typeof lineData.trlflags.trlupddepcust === 'string',
      has_loyalty_line_discount: typeof lineData.trlflags.trlloylndisc === 'string',
      has_mix_match_promotion: typeof lineData.trlflags.trlmatch === 'string',
      has_plu_override: typeof lineData.trlflags.trlupdplucust === 'string',
      is_ebt_eligible: typeof lineData.trlflags.trlfstmp === 'string',
      is_plu_item: typeof lineData.trlflags.trlplu === 'string',
      line_total: parseFloat(lineData.trllinetot),
      network_code: parseInt(lineData.trlnetwcode),
      quantity: parseFloat(lineData.trlqty),
      transaction_line_type: lineData.type,
      unit_price: parseFloat(lineData.trlunitprice) || null,
      upc_description: lineData.trldesc || null,
      upc_entry_type: lineData.trlupcentry?.type || null,
      upc_modifier: typeof lineData.trlmodifier === 'string' ? parseInt(lineData.trlmodifier) : null,
      // New car wash related fields
      car_wash_package: parseInt(lineData.trlcw?.trlcwlineix) || null,
      car_wash_code: parseInt(lineData.trlcw?.trlcwcode) || null,
      car_wash_promo_type: lineData.trlcw?.trlcwpromo?.type || null,
      car_wash_promo_amount: parseFloat(lineData.trlcw?.trlcwpromo?._) || null,
      // New flag fields
      is_fuel_only: typeof lineData.trlflags.trlfuelonly === 'string',
      is_fuel_sale: typeof lineData.trlflags.trlfuelsale === 'string',
      is_lottery_payout: lineData.trlflags.trlnegative?.cause === 'negDept',
      is_line_void: typeof lineData.trlflags.trlnetvoid === 'string',
      has_special_discount: typeof lineData.trlflags.trlspdisc === 'string',
      // New transaction void field - calculate based on transaction type
      is_transaction_void: isVoid
    };

    const lineItem = await models.TransactionLineItem.create(lineItemData, {
      transaction: options.transaction
    });

          // Process tax information
      if (lineData.trltaxes) {
        await this.processLineItemTax(lineItem.line_item_uuid, lineData, transactionId, salesTransactionUniqueId, options);
      }

    // Process promotions
    if (lineData.trlmixmatches?.trlmatchline) {
      await this.processPromotionLineItem(lineItem.line_item_uuid, lineData, options);
    }

    // Process loyalty discounts
    if (lineData.trlolnitemdisc) {
      await this.processLoyaltyLineItem(lineItem.line_item_uuid, lineData, transactionId, salesTransactionUniqueId, options);
    }

    return lineItem;
  }

  // Add helper method to determine if transaction is void
  isTransactionVoid(transactionType) {
    if (!transactionType) return false;
    
    // Convert to lowercase for case-insensitive comparison
    const type = transactionType.toLowerCase();
    
    // Transaction types that indicate void
    const voidTypes = ['void'];
    
    return voidTypes.includes(type);
  }

  async processLineItemTax(lineItemUuid, lineData, transactionId, salesTransactionUniqueId, options = {}) {
    const taxData = lineData.trltaxes;
    if (!taxData) return;
    
    const taxes = Array.isArray(taxData) ? taxData : [taxData];
    
    for (const tax of taxes) {
    const taxLineData = {
        line_item_uuid: lineItemUuid,
        transaction_id: transactionId,
        sales_transaction_unique_id: salesTransactionUniqueId,
        tax_line_amount: parseFloat(tax.trltax?._) || null,
        tax_line_category: tax.trltax?.cat || null,
        tax_line_rate: parseFloat(tax.trlrate?._) || null,
        tax_line_sys_id: parseInt(tax.trltax?.sysid) || null
      };

      await models.TransactionLineItemTax.create(taxLineData, {
        transaction: options.transaction
      });
    }
  }

  async processPromotionLineItem(lineItemUuid, lineData, options = {}) {
    const promotionId = parseInt(lineData.trlmixmatches?.trlmatchline?.trlpromotionid?._) || null;
    const upcId = parseInt(lineData.trlupc) || null;
    
    // Ensure promotion program exists if promotion ID is provided
    if (promotionId) {
      await this.ensurePromotionProgramExists(promotionId, lineData.trlmixmatches?.trlmatchline, options);
      
      // Create promotion UPC linkage if both promotion and UPC exist
      if (upcId) {
        await this.ensurePromotionUPCLinkage(promotionId, upcId, options);
      }
    }

    // Calculate line item promo amount: promo_amount / matched_units
    const promoAmount = parseFloat(lineData.trlmixmatches?.trlmatchline?.trlpromoamount) || 0;
    const matchedUnits = parseFloat(lineData.trlmixmatches?.trlmatchline?.trlmatchquantity) || 1;
    const lineItemPromoAmount = matchedUnits > 0 ? promoAmount / matchedUnits : promoAmount;

    const promotionData = {
      line_item_uuid: lineItemUuid,
      promotion_id: promotionId,
      match_price: parseFloat(lineData.trlmixmatches?.trlmatchline?.trlmatchprice) || null,
      match_quantity: matchedUnits,
      mix_group_id: parseInt(lineData.trlmixmatches?.trlmatchline?.trlmatchmixes) || null,
      line_item_promo_amount: lineItemPromoAmount,
      promotion_name: lineData.trlmixmatches?.trlmatchline?.trlmatchname || null,
      promotion_type: lineData.trlmixmatches?.trlmatchline?.trlpromotionid?.promotype || ''
    };

    await models.PromotionsLineItem.create(promotionData, {
      transaction: options.transaction
    });
  }

  async processLoyaltyLineItem(lineItemUuid, lineData, transactionId, salesTransactionUniqueId, options = {}) {
    const loyaltyData = {
      line_item_uuid: lineItemUuid,
      transaction_id: transactionId,
      sales_transaction_unique_id: salesTransactionUniqueId,
      loyalty_discount_amount: parseFloat(lineData.trlolnitemdisc?.discamt) || null,
      loyalty_quantity_applied: parseFloat(lineData.trlolnitemdisc?.qty) || null,
      loyalty_tax_credit: parseFloat(lineData.trlolnitemdisc?.taxcred)
    };

    await models.LoyaltyLineItems.create(loyaltyData, {
      transaction: options.transaction
    });
  }

  async processPayment(transactionId, salesTransactionUniqueId, paymentData, header, options = {}) {
    const mopCode = parseInt(paymentData.trppaycode?.mop) || null;
    const paymentInfo = {
      transaction_id: transactionId,
      sales_transaction_unique_id: salesTransactionUniqueId,
      authorization_code: parseInt(paymentData.trpcardinfo?.trpcauthcode) || null,
      cc_name: paymentData.trpcardinfo?.trpcccname._ || null,
      mop_amount: parseFloat(paymentData.trpamt) || null,
      mop_code: mopCode,
      payment_entry_method: paymentData.trppaycode?._ || null,
      payment_timestamp: (mopCode === 1 ? header.date : paymentData.trpcardinfo?.trpcauthdatetime) || null,  // Store as string directly
      payment_type: paymentData.type || null
    };
    await models.Payment.create(paymentInfo, {
      transaction: options.transaction
    });
  }

  async processLoyaltyProgram(transactionId, salesTransactionUniqueId, loyaltyData, options = {}) {
    // Process transaction-level loyalty data
    const loyaltyProgram = loyaltyData.trloyaltyprogram || loyaltyData;
    
    if (loyaltyProgram) {
      const transactionLoyaltyData = {
        transaction_id: transactionId,
        sales_transaction_unique_id: salesTransactionUniqueId,
        loyalty_account_number: loyaltyProgram.trloaccount || null,
        loyalty_auto_discount: parseFloat(loyaltyProgram.trloautodisc),
        loyalty_customer_discount: parseFloat(loyaltyProgram.trlocustdisc),
        loyalty_entry_method: loyaltyProgram.trloentrymeth || null,
        loyalty_sub_total: parseFloat(loyaltyProgram.trlosubtotal) || null,
        loyalty_program_name: loyaltyProgram.programID  || 'Default Loyalty Program'
      };

      await models.TransactionLoyalty.create(transactionLoyaltyData, {
        transaction: options.transaction
      });
    }
  }

  // Helper methods to ensure reference data exists
  async ensureStoreExists(storeId, options = {}) {
    const [store, created] = await models.Store.findOrCreate({
      where: { store_id: storeId },
      defaults: {
        store_id: storeId,
        store_name: `Store ${storeId}`,
        address: null,
        city: null,
        state: null,
        zip_code: null
      },
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new store: ${storeId}`);
    }

    return store;
  }

  async ensurePosTerminalExists(storePosUniqueId, registerId, storeId, options = {}) {
    const [terminal, created] = await models.PosDeviceTerminal.findOrCreate({
      where: { store_pos_unique_id: storePosUniqueId },
      defaults: {
        store_pos_unique_id: storePosUniqueId,
        register_id: registerId,
        store_id: storeId,
        device_type: ''
      },
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new POS terminal: ${registerId} for store ${storeId}`);
    }

    return terminal;
  }

  async ensureDepartmentExists(lineData, options = {}) {
    const deptNumber = parseInt(lineData.trldept?.number) || null;
    const deptName =    lineData.trldept._ || null;
    const deptType = (lineData.trldept?.type === 'norm' ? 'Inside Sales' : lineData.trldept?.type) || null;

    if (!deptNumber) return null;
    const classification = classifyDepartment(deptName, deptType);
    const [department, created] = await models.Departments.findOrCreate({
      where: { department_id: deptNumber },
      defaults: {
        department_id: deptNumber,
        department_name: deptName || `Department ${deptNumber}`,
        department_type: deptType,
        is_car_wash_department: classification.is_car_wash_department,
        is_fuel_department: classification.is_fuel_department,
        is_lottery_department: classification.is_lottery_department
      },
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new department: ${deptNumber} - ${deptName}`);
    }

    return department.department_id;
  }

  async ensureProductExists(lineData, departmentId, transactionId, options = {}) {
    const upcId = parseInt(lineData.trlupc) || null;
    if (!upcId) return null;

    const [product, created] = await models.Pricebook.findOrCreate({
      where: { upc_id: upcId },
      defaults: {
        upc_id: upcId,
        department_id: departmentId,
        upc_description: lineData.trldesc || `Product ${upcId}`,
        cost: null,
        retail_price: parseFloat(lineData.trlunitprice) || null,
        cost_avail_flag: 'N',
        retail_price_avail_flag: lineData.trlunitprice ? 'Y' : 'N',
        upc_source: transactionId ? transactionId.toString() : null,
        created_by: 'TLOG',
        creation_date: getCurrentUTC(),
        modified_by: null,
        modified_date: null
      },
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new product: ${upcId} - ${lineData.trldesc} (from transaction ${transactionId})`);
    }

    return product.upc_id;
  }

  async ensurePromotionProgramExists(promotionId, promotionData, options = {}) {
    const [program, created] = await models.PromotionsProgramDetails.findOrCreate({
      where: { promotion_id: promotionId },
      defaults: {
        promotion_id: promotionId,
        promotion_name: promotionData.trlmatchname || `Promotion ${promotionId}`,
        promo_desc: promotionData.description || null,
        promo_amount: parseFloat(promotionData.trlpromoamount) || null,
        promo_percent: null,
        promotion_discount_method: null,
        mfg_multi_pack_flag: false,
        outlet_multi_pack_flag: false,
        tob_promo_flag: false,
        effective_start_date: null,
        effective_end_date: null,
        manufacturer_name: null,
        mfg_multi_pack_qty: null,
        mfg_promo_desc: null,
        outlet_multi_pack_qty: null,
        provider_name: null,
        store_pays_amount: null,
        store_pays_disc_type: null,
        store_pays_percent: null,
        vendor_pays_amount: null,
        vendor_pays_disc_type: null,
        vendor_pays_percent: null
      },
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new promotion program: ${promotionId} - ${program.promotion_name}`);
    }

    return program;
  }

  async ensureRebateProgramExists(rebateId, rebateData, options = {}) {
    const [program, created] = await models.RebateProgramDetails.findOrCreate({
      where: { rebate_id: rebateId },
      defaults: {
        rebate_id: rebateId,
        rebate_name: rebateData.name || `Rebate ${rebateId}`,
        rebate_description: rebateData.description || null,
        rebate_type: rebateData.type || 'cashback',
        rebate_amount: parseFloat(rebateData.amount) || null,
        rebate_percentage: parseFloat(rebateData.percentage) || null,
        is_active: true,
        rebate_code: rebateData.code || null,
        vendor_id: rebateData.vendor || null,
        product_category: rebateData.category || null
      },
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new rebate program: ${rebateId} - ${program.rebate_name}`);
    }

    return program;
  }

  async ensurePromotionUPCLinkage(promotionId, upcId, options = {}) {
    try {
      // Use raw SQL instead of findOrCreate
      const [existing] = await models.sequelize.query(`
        SELECT promotion_id, upc_id 
        FROM promotion_upc_linkage 
        WHERE promotion_id = :promotionId AND upc_id = :upcId
      `, {
        replacements: { promotionId, upcId },
        transaction: options.transaction
      });

      if (existing.length === 0) {
        // Insert new record
        await models.sequelize.query(`
          INSERT INTO promotion_upc_linkage (promotion_id, upc_id, is_active)
          VALUES (:promotionId, :upcId, true)
        `, {
          replacements: { promotionId, upcId },
          transaction: options.transaction
        });
        
        logger.info(`Created new promotion UPC linkage: Promotion ${promotionId} - UPC ${upcId}`);
      }

      return { promotion_id: promotionId, upc_id: upcId };
    } catch (error) {
      logger.warn(`Failed to create promotion UPC linkage: ${error.message}`);
      return null;
    }
  }

  async ensureRebateUPCLinkage(rebateId, upcId, options = {}) {
    try {
      const [linkage, created] = await models.RebateUPCLinkage.findOrCreate({
        where: { 
          rebate_id: rebateId,
          upc_id: upcId
        },
        defaults: {
          rebate_id: rebateId,
          upc_id: upcId,
          is_active: true
        },
        transaction: options.transaction
      });

      if (created) {
        logger.info(`Created new rebate UPC linkage: Rebate ${rebateId} - UPC ${upcId}`);
      }

      return linkage;
    } catch (error) {
      logger.warn(`Failed to create rebate UPC linkage: ${error.message}`);
      return null;
    }
  }
}

module.exports = CPJProcessor;
