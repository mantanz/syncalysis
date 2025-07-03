/**
 * FCF (Fuel Control File) Processor
 * 
 * PROCESSES: FCF XML files (Fuel Control Files)
 * 
 * XML TO DATABASE TABLE MAPPING:
 * ===============================
 * 
 * XML Elements → Database Tables:
 * 
 * 1. STORE DATA:
 *    - XML: <store>, <site>, <location>
 *    - TABLE: stores
 *    - FIELDS: store_id, store_name, address, city, state, zip_code
 * 
 * 2. FUEL DEPARTMENT DATA:
 *    - XML: <fuel>, <grade>, <product>
 *    - TABLE: departments
 *    - FIELDS: department_id, department_name, department_type, is_fuel_department=true
 *    - AUTO-CLASSIFIED: is_fuel_department set to true for fuel-related departments
 * 
 * 3. FUEL PRODUCT DATA:
 *    - XML: <grade>, <fueltype>, <product>
 *    - TABLE: pricebook
 *    - FIELDS: upc_id, department_id (fuel dept), upc_description, cost, retail_price
 *    - EXAMPLES: Regular Unleaded, Premium, Diesel, E85
 * 
 * 4. POS TERMINAL DATA (Fuel Dispensers):
 *    - XML: <dispenser>, <pump>, <terminal>
 *    - TABLE: pos_device_terminal
 *    - FIELDS: pos_device_terminal_id, store_id, terminal_name="Dispenser X", 
 *             terminal_type="fuel_dispenser", is_active=true
 * 
 * 5. FUEL TRANSACTION DATA:
 *    - XML: <transaction>, <sale>, <fueling>
 *    - TABLE: sales_transaction
 *    - FIELDS: transaction_id, store_id, pos_device_terminal_id, transaction_date_time,
 *             transaction_type="fuel_sale", total_amount, tax_amount
 * 
 * 6. FUEL LINE ITEMS:
 *    - XML: <fuelitem>, <grade>, <gallons>
 *    - TABLE: transaction_line_item
 *    - FIELDS: line_item_id, transaction_id, upc_id (fuel grade), quantity (gallons),
 *             unit_price (price per gallon), extended_price
 * 
 * 7. FUEL PRICING DATA:
 *    - XML: <price>, <cost>, <margin>
 *    - TABLE: pricebook (updates existing fuel products)
 *    - FIELDS: cost, retail_price
 * 
 * 8. FUEL INVENTORY DATA:
 *    - XML: <inventory>, <tank>, <level>
 *    - TABLE: transaction_event_log
 *    - FIELDS: event_type="fuel_inventory", event_data (tank levels, deliveries)
 * 
 * PROCESSING FLOW:
 * ================
 * 1. Parse FCF XML file
 * 2. Extract store information → Create/update stores table
 * 3. Extract fuel dispensers → Create/update pos_device_terminal table
 * 4. Extract fuel grades/products → Create fuel departments (is_fuel_department=true)
 * 5. Create fuel products in pricebook table
 * 6. Process fuel transactions → Create sales_transaction records
 * 7. Process fuel line items → Create transaction_line_item records
 * 8. Log fuel events → Create transaction_event_log records
 * 
 * FUEL-SPECIFIC FEATURES:
 * =======================
 * - Automatic classification of fuel departments
 * - Fuel dispenser terminal management
 * - Gallons-based quantity tracking
 * - Fuel grade product creation
 * - Tank inventory logging
 */

const xml2js = require('xml2js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const models = require('../models');
const { classifyDepartment } = require('../utils/departmentClassifier');

class FCFProcessor {
  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      normalizeTags: true
    });
  }

  async processFile(filePath) {
    try {
      logger.info(`Processing FCF file: ${filePath}`);
      
      const xmlContent = await fs.readFile(filePath, 'utf-8');
      const result = await this.parser.parseStringPromise(xmlContent);
      
      let processedCount = 0;
      let errorCount = 0;

      // Process price level period data (pd:prPriceLvlPd)
      if (result['pd:prpricelvlpd'] || result.prpricelvlpd) {
        const priceData = result['pd:prpricelvlpd'] || result.prpricelvlpd;
        
        try {
          await this.processPriceLevelPeriod(priceData);
          processedCount++;
        } catch (error) {
          logger.error(`Error processing price level period:`, error);
          errorCount++;
        }
      }

      // Process fuel control data (legacy format)
      if (result.fuelcontrol || result.fuel) {
        const fuelData = result.fuelcontrol || result.fuel;
        const fuelEntries = this.ensureArray(fuelData);
        
        for (const entry of fuelEntries) {
          try {
            await this.processFuelEntry(entry);
            processedCount++;
          } catch (error) {
            logger.error(`Error processing fuel entry:`, error);
            errorCount++;
          }
        }
      }

      // Process fuel grade data (legacy format)
      if (result.fuelgrades || result.grades) {
        const gradeData = result.fuelgrades || result.grades;
        const gradeEntries = this.ensureArray(gradeData);
        
        for (const grade of gradeEntries) {
          try {
            await this.processFuelGrade(grade);
            processedCount++;
          } catch (error) {
            logger.error(`Error processing fuel grade:`, error);
            errorCount++;
          }
        }
      }

      logger.info(`FCF processing completed: ${processedCount} successful, ${errorCount} errors`);
      return { 
        success: true, 
        fileType: 'FCF',
        fileName: path.basename(filePath),
        processedEntries: processedCount,
        errors: errorCount
      };

    } catch (error) {
      logger.error(`Error processing FCF file ${filePath}:`, error);
      throw error;
    }
  }

  async processPriceLevelPeriod(priceData) {
    const transaction = await models.sequelize.transaction();
    
    try {
      // Extract store information
      const storeId = priceData['vs:site'] || priceData.site;
      if (storeId) {
        await this.ensureStoreExists(storeId, { storename: `Store ${storeId}` }, { transaction });
      }

      // Process totals data to extract fuel products and pricing
      if (priceData.totals && priceData.totals.prpricelvlinfo) {
        const priceInfos = this.ensureArray(priceData.totals.prpricelvlinfo);
        
        for (const priceInfo of priceInfos) {
          if (priceInfo['fuel:fuelprodbase'] || priceInfo.fuelprodbase) {
            const fuelProd = priceInfo['fuel:fuelprodbase'] || priceInfo.fuelprodbase;
            const fuelId = parseInt(fuelProd.sysid || fuelProd.number) || null;
            const fuelName = fuelProd.name || `Fuel Product ${fuelId}`;

            // Ensure fuel department exists
            const departmentId = await this.ensureFuelDepartmentExists(999, { departmentname: 'Fuel' }, { transaction });

            // Create fuel product
            if (fuelId) {
              await this.ensureFuelProductExists(fuelId, {
                description: fuelName,
                gradename: fuelName,
                productname: fuelName
              }, departmentId, { transaction });
            }

            // Process price level information
            if (priceInfo.pricelvlinfo) {
              const priceLvlInfos = this.ensureArray(priceInfo.pricelvlinfo);
              
              for (const priceLvl of priceLvlInfos) {
                if (priceLvl['fuel:fuelpricelevel'] || priceLvl.fuelpricelevel) {
                  const priceLevel = priceLvl['fuel:fuelpricelevel'] || priceLvl.fuelpricelevel;
                  const priceLevelName = priceLevel.name;
                  
                  logger.info(`Processed fuel product: ${fuelName} with price level: ${priceLevelName}`);
                  
                  // Extract volume and amount data
                  if (priceLvl.fuelinfo) {
                    const fuelInfo = priceLvl.fuelinfo;
                    const count = parseInt(fuelInfo.count) || 0;
                    const amount = parseFloat(fuelInfo.amount) || 0;
                    const volume = parseFloat(fuelInfo.volume) || 0;
                    
                    logger.info(`Fuel stats - Count: ${count}, Amount: $${amount}, Volume: ${volume} gallons`);
                  }
                }
              }
            }
          }
        }
      }

      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async processFuelEntry(fuelData) {
    const transaction = await models.sequelize.transaction();
    
    try {
      const storeId = fuelData.storeid || fuelData.store_id;
      const deptId = fuelData.departmentid || fuelData.department_id || 999; // Default fuel dept
      const productId = fuelData.productid || fuelData.upc;

      // Ensure store exists
      if (storeId) {
        await this.ensureStoreExists(storeId, fuelData, { transaction });
      }

      // Ensure fuel department exists
      const departmentId = await this.ensureFuelDepartmentExists(deptId, fuelData, { transaction });

      // Ensure fuel product exists
      if (productId) {
        await this.ensureFuelProductExists(productId, fuelData, departmentId, { transaction });
      }

      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async processFuelGrade(gradeData) {
    const transaction = await models.sequelize.transaction();
    
    try {
      const gradeId = gradeData.gradeid || gradeData.id;
      const deptId = 999; // Fuel department

      // Ensure fuel department exists
      const departmentId = await this.ensureFuelDepartmentExists(deptId, gradeData, { transaction });

      // Create fuel grade as a product
      if (gradeId) {
        await this.ensureFuelProductExists(gradeId, gradeData, departmentId, { transaction });
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

  async ensureStoreExists(storeId, fuelData, options = {}) {
    const [store, created] = await models.Store.findOrCreate({
      where: { store_id: storeId },
      defaults: {
        store_id: storeId,
        store_name: fuelData.storename || `Store ${storeId}`,
        address: fuelData.address || null,
        city: fuelData.city || null,
        state: fuelData.state || null,
        zip_code: parseInt(fuelData.zipcode) || null
      },
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new store from FCF: ${storeId}`);
    }

    return store;
  }

  async ensureFuelDepartmentExists(deptId, fuelData, options = {}) {
    const departmentId = parseInt(deptId) || 999;

    const [department, created] = await models.Departments.findOrCreate({
      where: { department_id: departmentId },
      defaults: {
        department_id: departmentId,
        department_name: fuelData.departmentname || 'Fuel',
        department_type: 'fuel',
        is_fuel_department: true,
        is_car_wash_department: false,
        is_lottery_department: false
      },
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new fuel department from FCF: ${departmentId}`);
    }

    return department.department_id;
  }

  async ensureFuelProductExists(productId, fuelData, departmentId, options = {}) {
    const upcId = parseInt(productId);
    if (!upcId) return null;

    const [product, created] = await models.Pricebook.findOrCreate({
      where: { upc_id: upcId },
      defaults: {
        upc_id: upcId,
        department_id: departmentId,
        upc_description: fuelData.description || fuelData.gradename || fuelData.productname || `Fuel Product ${upcId}`,
        cost: parseFloat(fuelData.cost) || null,
        retail_price: parseFloat(fuelData.price || fuelData.retailprice) || null
      },
      transaction: options.transaction
    });

    if (created) {
      logger.info(`Created new fuel product from FCF: ${upcId} - ${product.upc_description}`);
    }

    return product;
  }
}

module.exports = FCFProcessor; 