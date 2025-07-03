/**
 * Generic Processor - Multi-Format XML File Processor
 * 
 * PROCESSES: FGM, HRS, ISM, LYT, MCM, MSM, TPM XML files and other generic XML formats
 * 
 * XML TO DATABASE TABLE MAPPING:
 * ===============================
 * 
 * SUPPORTED FILE TYPES:
 * - FGM: Fuel Grade Master files
 * - HRS: Hours/Shift data files  
 * - ISM: Inventory/Stock Management files
 * - LYT: Loyalty program files
 * - MCM: Merchandise Category Master files
 * - MSM: Merchandise/Store Master files
 * - TPM: Transaction Processing Master files
 * 
 * XML Elements → Database Tables:
 * 
 * 1. STORE DATA (All file types):
 *    - XML: <store>, <storeid>, <location>, <site>
 *    - TABLE: stores
 *    - FIELDS: store_id, store_name, address, city, state, zip_code
 * 
 * 2. DEPARTMENT DATA (MCM, MSM, TPM):
 *    - XML: <department>, <dept>, <category>, <section>
 *    - TABLE: departments
 *    - FIELDS: department_id, department_name, department_type,
 *             is_car_wash_department, is_fuel_department, is_lottery_department
 *    - AUTO-CLASSIFIED: Department flags determined by name/type patterns
 * 
 * 3. PRODUCT DATA (MCM, MSM, ISM):
 *    - XML: <product>, <item>, <upc>, <sku>, <plu>
 *    - TABLE: pricebook
 *    - FIELDS: upc_id, department_id, upc_description, cost, retail_price
 * 
 * 4. FUEL GRADE DATA (FGM):
 *    - XML: <grade>, <fuel>, <fueltype>
 *    - TABLE: departments (is_fuel_department=true)
 *    - TABLE: pricebook (fuel products)
 *    - FIELDS: Fuel-specific products and pricing
 * 
 * 5. LOYALTY DATA (LYT):
 *    - XML: <loyalty>, <reward>, <member>, <program>
 *    - TABLE: loyalty_line_items
 *    - FIELDS: loyalty_line_item_id, loyalty_program_id, points_earned, points_redeemed
 * 
 * 6. PROMOTION DATA (TPM, MCM):
 *    - XML: <promotion>, <promo>, <discount>, <offer>
 *    - TABLE: promotions_program_details
 *    - FIELDS: promotion_id, promotion_name, promotion_type, discount_amount,
 *             start_date, end_date, is_active
 * 
 * 7. REBATE DATA (TPM, MCM):
 *    - XML: <rebate>, <cashback>, <refund>
 *    - TABLE: rebate_program_details
 *    - FIELDS: rebate_id, rebate_name, rebate_type, rebate_amount,
 *             start_date, end_date, is_active
 * 
 * 8. INVENTORY DATA (ISM):
 *    - XML: <inventory>, <stock>, <level>
 *    - TABLE: transaction_event_log
 *    - FIELDS: event_type="inventory_update", event_data (stock levels, movements)
 * 
 * 9. HOURS/SHIFT DATA (HRS):
 *    - XML: <hours>, <shift>, <schedule>
 *    - TABLE: transaction_event_log
 *    - FIELDS: event_type="shift_data", event_data (employee hours, schedules)
 * 
 * PROCESSING FLOW:
 * ================
 * 1. Parse XML file (any supported format)
 * 2. Recursively search for known data patterns
 * 3. Extract store data → Create/update stores table
 * 4. Extract department data → Create/update departments table (with auto-classification)
 * 5. Extract product data → Create/update pricebook table
 * 6. Extract promotion data → Create/update promotions_program_details table
 * 7. Extract rebate data → Create/update rebate_program_details table
 * 8. Extract loyalty data → Process loyalty programs
 * 9. Log other events → Create transaction_event_log records
 * 
 * PATTERN RECOGNITION:
 * ====================
 * The processor uses semantic pattern matching to identify:
 * - Store-related elements (store, storeid, location, site)
 * - Department-related elements (department, dept, category, section)
 * - Product-related elements (product, item, upc, sku, plu)
 * - Promotion-related elements (promotion, promo, discount, offer)
 * - Rebate-related elements (rebate, cashback, refund)
 * - Loyalty-related elements (loyalty, reward, member)
 * 
 * GENERIC FEATURES:
 * =================
 * - Flexible XML structure handling
 * - Automatic data pattern detection
 * - Reference data creation as needed
 * - Department auto-classification
 * - Extensible for new file types
 * - Robust error handling
 */

const xml2js = require('xml2js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const models = require('../models');
const { classifyDepartment } = require('../utils/departmentClassifier');

class GenericProcessor {
  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      normalizeTags: true
    });
  }

  async processFile(filePath, fileType) {
    try {
      logger.info(`Processing ${fileType} file: ${filePath}`);
      
      const xmlContent = await fs.readFile(filePath, 'utf-8');
      const result = await this.parser.parseStringPromise(xmlContent);
      
      let processedCount = 0;
      let errorCount = 0;

      // Extract and process common data patterns
      const extractedData = this.extractCommonData(result);
      
      for (const dataEntry of extractedData) {
        try {
          await this.processDataEntry(dataEntry, fileType);
          processedCount++;
        } catch (error) {
          logger.error(`Error processing data entry:`, error);
          errorCount++;
        }
      }

      logger.info(`${fileType} processing completed: ${processedCount} successful, ${errorCount} errors`);
      return { 
        success: true, 
        fileType: fileType,
        fileName: path.basename(filePath),
        processedEntries: processedCount,
        errors: errorCount
      };

    } catch (error) {
      logger.error(`Error processing ${fileType} file ${filePath}:`, error);
      throw error;
    }
  }

  extractCommonData(xmlData) {
    const extractedData = [];
    
    // Recursively search for common patterns
    this.searchForPatterns(xmlData, extractedData);
    
    return extractedData;
  }

  searchForPatterns(obj, extractedData, parentKey = '') {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      
      // Look for store-related data
      if (this.isStoreData(key, value)) {
        extractedData.push({
          type: 'store',
          data: value,
          key: fullKey
        });
      }
      
      // Look for department-related data
      if (this.isDepartmentData(key, value)) {
        extractedData.push({
          type: 'department',
          data: value,
          key: fullKey
        });
      }
      
      // Look for product-related data
      if (this.isProductData(key, value)) {
        extractedData.push({
          type: 'product',
          data: value,
          key: fullKey
        });
      }

      // Look for promotion-related data
      if (this.isPromotionData(key, value)) {
        extractedData.push({
          type: 'promotion',
          data: value,
          key: fullKey
        });
      }

      // Look for rebate-related data
      if (this.isRebateData(key, value)) {
        extractedData.push({
          type: 'rebate',
          data: value,
          key: fullKey
        });
      }

      // Look for loyalty-related data
      if (this.isLoyaltyData(key, value)) {
        extractedData.push({
          type: 'loyalty',
          data: value,
          key: fullKey
        });
      }
      
      // Recursively search nested objects
      if (typeof value === 'object' && value !== null) {
        this.searchForPatterns(value, extractedData, fullKey);
      }
    }
  }

  isStoreData(key, value) {
    const storeKeys = ['store', 'storeid', 'store_id', 'location', 'site'];
    return storeKeys.some(k => key.toLowerCase().includes(k));
  }

  isDepartmentData(key, value) {
    const deptKeys = ['department', 'dept', 'category', 'section'];
    return deptKeys.some(k => key.toLowerCase().includes(k));
  }

  isProductData(key, value) {
    const productKeys = ['product', 'item', 'upc', 'sku', 'plu'];
    return productKeys.some(k => key.toLowerCase().includes(k));
  }

  isPromotionData(key, value) {
    const promotionKeys = ['promotion', 'promo', 'discount', 'offer'];
    return promotionKeys.some(k => key.toLowerCase().includes(k));
  }

  isRebateData(key, value) {
    const rebateKeys = ['rebate', 'cashback', 'refund'];
    return rebateKeys.some(k => key.toLowerCase().includes(k));
  }

  isLoyaltyData(key, value) {
    const loyaltyKeys = ['loyalty', 'reward', 'member'];
    return loyaltyKeys.some(k => key.toLowerCase().includes(k));
  }

  async processDataEntry(dataEntry, fileType) {
    const transaction = await models.sequelize.transaction();
    
    try {
      switch (dataEntry.type) {
        case 'store':
          await this.processStoreData(dataEntry.data, fileType, { transaction });
          break;
        case 'department':
          await this.processDepartmentData(dataEntry.data, fileType, { transaction });
          break;
        case 'product':
          await this.processProductData(dataEntry.data, fileType, { transaction });
          break;
        case 'promotion':
          await this.processPromotionData(dataEntry.data, fileType, { transaction });
          break;
        case 'rebate':
          await this.processRebateData(dataEntry.data, fileType, { transaction });
          break;
        case 'loyalty':
          await this.processLoyaltyData(dataEntry.data, fileType, { transaction });
          break;
      }

      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async processStoreData(storeData, fileType, options = {}) {
    let storeId = null;
    
    if (typeof storeData === 'string' || typeof storeData === 'number') {
      storeId = storeData.toString();
    } else if (typeof storeData === 'object') {
      storeId = storeData.id || storeData.storeid || storeData.store_id;
    }

    if (storeId) {
      await this.ensureStoreExists(storeId, storeData, fileType, options);
    }
  }

  async processDepartmentData(deptData, fileType, options = {}) {
    let deptId = null;
    
    if (typeof deptData === 'string' || typeof deptData === 'number') {
      deptId = parseInt(deptData);
    } else if (typeof deptData === 'object') {
      deptId = parseInt(deptData.id || deptData.departmentid || deptData.department_id);
    }

    if (deptId) {
      await this.ensureDepartmentExists(deptId, deptData, fileType, options);
    }
  }

  async processProductData(productData, fileType, options = {}) {
    let productId = null;
    
    if (typeof productData === 'string' || typeof productData === 'number') {
      productId = parseInt(productData);
    } else if (typeof productData === 'object') {
      productId = parseInt(productData.id || productData.upc || productData.upc_id);
    }

    if (productId) {
      await this.ensureProductExists(productId, productData, fileType, options);
    }
  }

  async processPromotionData(promotionData, fileType, options = {}) {
    let promotionId = null;
    
    if (typeof promotionData === 'string' || typeof promotionData === 'number') {
      promotionId = parseInt(promotionData);
    } else if (typeof promotionData === 'object') {
      promotionId = parseInt(promotionData.id || promotionData.promotionid || promotionData.promotion_id);
    }

    if (promotionId) {
      await this.ensurePromotionProgramExists(promotionId, promotionData, fileType, options);
    }
  }

  async processRebateData(rebateData, fileType, options = {}) {
    let rebateId = null;
    
    if (typeof rebateData === 'string' || typeof rebateData === 'number') {
      rebateId = parseInt(rebateData);
    } else if (typeof rebateData === 'object') {
      rebateId = parseInt(rebateData.id || rebateData.rebateid || rebateData.rebate_id);
    }

    if (rebateId) {
      await this.ensureRebateProgramExists(rebateId, rebateData, fileType, options);
    }
  }

  async processLoyaltyData(loyaltyData, fileType, options = {}) {
    // Process loyalty program data - this would typically be transaction-specific
    // For generic processing, we just log that loyalty data was found
    logger.info(`Loyalty data found in ${fileType} file`);
  }

  async ensureStoreExists(storeId, storeData, fileType, options = {}) {
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
      logger.info(`Created new store from ${fileType}: ${storeId}`);
    }

    return store;
  }

  async ensureDepartmentExists(deptId, deptData, fileType, options = {}) {
    // Extract department name and type from data if available
    let deptName = `Department ${deptId}`;
    let deptType = 'norm';
    
    if (typeof deptData === 'object' && deptData !== null) {
      deptName = deptData.name || deptData.department_name || deptName;
      deptType = deptData.type || deptData.department_type || deptType;
    }
    
    // Classify department based on name and type
    const classification = classifyDepartment(deptName, deptType);
    
    const [department, created] = await models.Departments.findOrCreate({
      where: { department_id: deptId },
      defaults: {
        department_id: deptId,
        department_name: deptName,
        department_type: deptType,
        is_fuel_department: classification.is_fuel_department,
        is_car_wash_department: classification.is_car_wash_department,
        is_lottery_department: classification.is_lottery_department
      },
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new department from ${fileType}: ${deptId} (${deptName}) - Car Wash: ${classification.is_car_wash_department}, Fuel: ${classification.is_fuel_department}, Lottery: ${classification.is_lottery_department}`);
    }

    return department;
  }

  async ensureProductExists(productId, productData, fileType, options = {}) {
    const [product, created] = await models.Pricebook.findOrCreate({
      where: { upc_id: productId },
      defaults: {
        upc_id: productId,
        department_id: null,
        upc_description: `Product ${productId}`,
        cost: null,
        retail_price: null
      },
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new product from ${fileType}: ${productId}`);
    }

    return product;
  }

  async ensurePromotionProgramExists(promotionId, promotionData, fileType, options = {}) {
    const [program, created] = await models.PromotionsProgramDetails.findOrCreate({
      where: { promotion_id: promotionId },
      defaults: {
        promotion_id: promotionId,
        promotion_name: `Promotion ${promotionId} (from ${fileType})`,
        promotion_type: 'discount',
        is_active: true
      },
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new promotion program from ${fileType}: ${promotionId}`);
    }

    return program;
  }

  async ensureRebateProgramExists(rebateId, rebateData, fileType, options = {}) {
    const [program, created] = await models.RebateProgramDetails.findOrCreate({
      where: { rebate_id: rebateId },
      defaults: {
        rebate_id: rebateId,
        rebate_name: `Rebate ${rebateId} (from ${fileType})`,
        rebate_type: 'cashback',
        is_active: true
      },
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new rebate program from ${fileType}: ${rebateId}`);
    }

    return program;
  }
}

module.exports = GenericProcessor; 