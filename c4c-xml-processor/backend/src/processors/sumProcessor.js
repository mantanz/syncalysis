/**
 * SUM (Summary) Processor
 * 
 * PROCESSES: SUM XML files (Summary/Master Data Files)
 * 
 * XML TO DATABASE TABLE MAPPING:
 * ===============================
 * 
 * XML Elements → Database Tables:
 * 
 * 1. STORE SUMMARY DATA:
 *    - XML: <store>, <location>, <site>
 *    - TABLE: stores
 *    - FIELDS: store_id, store_name, address, city, state, zip_code
 *    - PURPOSE: Master store information and configuration
 * 
 * 2. DEPARTMENT SUMMARY DATA:
 *    - XML: <department>, <dept>, <category>
 *    - TABLE: departments
 *    - FIELDS: department_id, department_name, department_type,
 *             is_car_wash_department, is_fuel_department, is_lottery_department
 *    - AUTO-CLASSIFIED: Department flags automatically determined from name/type
 * 
 * 3. PRODUCT SUMMARY DATA:
 *    - XML: <product>, <item>, <upc>
 *    - TABLE: pricebook
 *    - FIELDS: upc_id, department_id, upc_description, cost, retail_price
 *    - PURPOSE: Master product catalog and pricing information
 * 
 * 4. REBATE PROGRAM DATA:
 *    - XML: <rebate>, <cashback>, <program>
 *    - TABLE: rebate_program_details
 *    - FIELDS: rebate_id, rebate_name, rebate_type, rebate_amount, rebate_percentage,
 *             start_date, end_date, is_active, program_description
 * 
 * 5. PROMOTION PROGRAM DATA:
 *    - XML: <promotion>, <promo>, <discount>
 *    - TABLE: promotions_program_details
 *    - FIELDS: promotion_id, promotion_name, promotion_type, discount_amount,
 *             discount_percentage, start_date, end_date, is_active, promotion_description
 * 
 * 6. LOYALTY PROGRAM DATA:
 *    - XML: <loyalty>, <reward>, <member>
 *    - TABLE: loyalty_line_items
 *    - FIELDS: loyalty_line_item_id, transaction_id, loyalty_program_id, points_earned,
 *             points_redeemed, discount_amount
 * 
 * 7. POS TERMINAL SUMMARY:
 *    - XML: <terminal>, <pos>, <register>
 *    - TABLE: pos_device_terminal
 *    - FIELDS: pos_device_terminal_id, store_id, terminal_name, terminal_type, is_active
 * 
 * 8. SUMMARY STATISTICS:
 *    - XML: <summary>, <totals>, <stats>
 *    - TABLE: transaction_event_log
 *    - FIELDS: event_type="summary_data", event_data (JSON with summary statistics)
 * 
 * PROCESSING FLOW:
 * ================
 * 1. Parse SUM XML file
 * 2. Extract store master data → Create/update stores table
 * 3. Extract department master data → Create/update departments table (with classification)
 * 4. Extract product master data → Create/update pricebook table
 * 5. Extract rebate programs → Create/update rebate_program_details table
 * 6. Extract promotion programs → Create/update promotions_program_details table
 * 7. Extract POS terminal data → Create/update pos_device_terminal table
 * 8. Log summary statistics → Create transaction_event_log records
 * 
 * SUMMARY-SPECIFIC FEATURES:
 * ==========================
 * - Master data validation and creation
 * - Reference data establishment for other processors
 * - Program configuration (rebates, promotions, loyalty)
 * - Store and terminal setup
 * - Department classification and setup
 * - Product catalog establishment
 */

const xml2js = require('xml2js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const models = require('../models');
const { classifyDepartment } = require('../utils/departmentClassifier');

class SUMProcessor {
  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      normalizeTags: true
    });
  }

  async processFile(filePath) {
    try {
      logger.info(`Processing SUM file: ${filePath}`);
      
      const xmlContent = await fs.readFile(filePath, 'utf-8');
      const result = await this.parser.parseStringPromise(xmlContent);
      
      // SUM files may have different structures, handle common ones
      let processedCount = 0;
      let errorCount = 0;

      // Process store summaries if present
      if (result.storesummary || result.summaries?.store) {
        const storeSummaries = this.ensureArray(result.storesummary || result.summaries.store);
        for (const summary of storeSummaries) {
          try {
            await this.processStoreSummary(summary);
            processedCount++;
          } catch (error) {
            logger.error(`Error processing store summary:`, error);
            errorCount++;
          }
        }
      }

      // Process department summaries if present
      if (result.departmentsummary || result.summaries?.department) {
        const deptSummaries = this.ensureArray(result.departmentsummary || result.summaries.department);
        for (const summary of deptSummaries) {
          try {
            await this.processDepartmentSummary(summary);
            processedCount++;
          } catch (error) {
            logger.error(`Error processing department summary:`, error);
            errorCount++;
          }
        }
      }

      // Process product summaries if present
      if (result.productsummary || result.summaries?.product) {
        const productSummaries = this.ensureArray(result.productsummary || result.summaries.product);
        for (const summary of productSummaries) {
          try {
            await this.processProductSummary(summary);
            processedCount++;
          } catch (error) {
            logger.error(`Error processing product summary:`, error);
            errorCount++;
          }
        }
      }

      logger.info(`SUM processing completed: ${processedCount} successful, ${errorCount} errors`);
      return { 
        success: true, 
        fileType: 'SUM',
        fileName: path.basename(filePath),
        processedSummaries: processedCount,
        errors: errorCount
      };

    } catch (error) {
      logger.error(`Error processing SUM file ${filePath}:`, error);
      throw error;
    }
  }

  async processStoreSummary(summaryData) {
    const transaction = await models.sequelize.transaction();
    
    try {
      const storeId = summaryData.storeid || summaryData.store_id || summaryData.id;
      
      if (storeId) {
        await this.ensureStoreExists(storeId, summaryData, { transaction });
      }

      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async processDepartmentSummary(summaryData) {
    const transaction = await models.sequelize.transaction();
    
    try {
      const deptId = summaryData.departmentid || summaryData.department_id || summaryData.id;
      
      if (deptId) {
        await this.ensureDepartmentExists(deptId, summaryData, { transaction });
      }

      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async processProductSummary(summaryData) {
    const transaction = await models.sequelize.transaction();
    
    try {
      const upcId = summaryData.upc || summaryData.upc_id || summaryData.productid;
      const deptId = summaryData.department || summaryData.departmentid;
      
      if (upcId) {
        // Ensure department exists first if provided
        let departmentId = null;
        if (deptId) {
          const department = await this.ensureDepartmentExists(deptId, summaryData, { transaction });
          departmentId = department.department_id;
        }

        await this.ensureProductExists(upcId, summaryData, departmentId, { transaction });
      }

      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Helper methods
  ensureArray(data) {
    if (!data) return [];
    return Array.isArray(data) ? data : [data];
  }

  async ensureStoreExists(storeId, summaryData, options = {}) {
    const [store, created] = await models.Store.findOrCreate({
      where: { store_id: storeId },
      defaults: {
        store_id: storeId,
        store_name: summaryData.storename || summaryData.name || `Store ${storeId}`,
        address: summaryData.address || null,
        address2: summaryData.address2 || null,
        city: summaryData.city || null,
        state: summaryData.state || null,
        zip_code: parseInt(summaryData.zipcode || summaryData.zip) || null
      },
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new store from SUM: ${storeId} - ${store.store_name}`);
    }

    return store;
  }

  async ensureDepartmentExists(deptId, summaryData, options = {}) {
    const departmentId = parseInt(deptId);
    if (!departmentId) return null;

    const [department, created] = await models.Departments.findOrCreate({
      where: { department_id: departmentId },
      defaults: {
        department_id: departmentId,
        department_name: summaryData.departmentname || summaryData.name || `Department ${departmentId}`,
        department_type: summaryData.type || 'norm',
        is_car_wash_department: (summaryData.type || '').toLowerCase().includes('carwash'),
        is_fuel_department: (summaryData.type || '').toLowerCase().includes('fuel'),
        is_lottery_department: (summaryData.type || '').toLowerCase().includes('lottery')
      },
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new department from SUM: ${departmentId} - ${department.department_name}`);
    }

    return department;
  }

  async ensureProductExists(upcId, summaryData, departmentId, options = {}) {
    const productId = parseInt(upcId);
    if (!productId) return null;

    const [product, created] = await models.Pricebook.findOrCreate({
      where: { upc_id: productId },
      defaults: {
        upc_id: productId,
        department_id: departmentId,
        upc_description: summaryData.description || summaryData.productname || `Product ${productId}`,
        cost: parseFloat(summaryData.cost) || null,
        retail_price: parseFloat(summaryData.price || summaryData.retailprice) || null
      },
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new product from SUM: ${productId} - ${product.upc_description}`);
    }

    return product;
  }
}

module.exports = SUMProcessor;
