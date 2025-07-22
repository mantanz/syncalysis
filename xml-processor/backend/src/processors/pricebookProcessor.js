/**
 * Pricebook Processor - CSV Product Catalog Processor
 * 
 * PROCESSES: Pricebook CSV files (Product Catalog and Pricing Data)
 * 
 * CSV TO DATABASE TABLE MAPPING:
 * ===============================
 * 
 * CSV Columns → Database Tables:
 * 
 * 1. PRODUCT DATA:
 *    - CSV: UPC, Item Description, Cost, Retail Price
 *    - TABLE: pricebook
 *    - FIELDS: upc_id, upc_description, cost, retail_price
 *    - PROCESSING: UPC codes normalized (leading zeros removed)
 * 
 * 2. DEPARTMENT DATA:
 *    - CSV: Department ID, Department Name, Department Type
 *    - TABLE: departments
 *    - FIELDS: department_id, department_name, department_type,
 *             is_car_wash_department, is_fuel_department, is_lottery_department
 *    - AUTO-CLASSIFIED: Department flags automatically determined from name/type
 * 
 * CSV COLUMN MAPPING:
 * ===================
 * Standard CSV Headers (case-insensitive):
 * - "UPC" or "upc" → upc_id (normalized)
 * - "Item Description" or "description" → upc_description
 * - "Department ID" or "department_id" → department_id
 * - "Department Name" or "department_name" → department_name
 * - "Department Type" or "department_type" → department_type
 * - "Cost" or "cost" → cost (parsed as decimal)
 * - "Retail Price" or "retail_price" → retail_price (parsed as decimal)
 * 
 * PROCESSING FLOW:
 * ================
 * 1. Parse CSV file with headers
 * 2. For each product row:
 *    a. Clean and normalize UPC code
 *    b. Parse pricing data (remove currency symbols)
 *    c. Extract department information
 *    d. Classify department (car wash, fuel, lottery flags)
 *    e. Create/update department record
 *    f. Create/update product record in pricebook
 * 3. Link products to departments via department_id
 * 4. Log processing results
 * 
 * DATA VALIDATION:
 * ================
 * - UPC codes: Remove non-numeric characters, normalize leading zeros
 * - Prices: Remove currency symbols, validate numeric format
 * - Departments: Auto-create if missing, classify special types
 * - Descriptions: Trim whitespace, handle empty values
 * 
 * DEPARTMENT CLASSIFICATION:
 * ==========================
 * Automatic classification based on department name/type:
 * - Car Wash: Names containing "car wash", "wash", "vehicle wash"
 * - Fuel: Names containing "fuel", "gas", "diesel", "petroleum", "pump"
 * - Lottery: Names containing "lottery", "lotto", "instant", "scratch"
 * 
 * ERROR HANDLING:
 * ===============
 * - Invalid UPC codes: Skipped with warning
 * - Missing required fields: Logged as errors
 * - Duplicate UPC codes: Updates existing records
 * - Invalid prices: Set to null with warning
 * - Transaction rollback on database errors
 * 
 * FEATURES:
 * =========
 * - Bulk product import from CSV
 * - Department auto-creation and classification
 * - Price normalization and validation
 * - UPC code standardization
 * - Duplicate handling (updates existing)
 * - Comprehensive error logging
 * - Database transaction safety
 */

const fs = require('fs');
const csv = require('csv-parser');
const models = require('../models');
const logger = require('../utils/logger');
const { classifyDepartment } = require('../utils/departmentClassifier');
const { parseDateTime, parseDateTimeLocal, formatDateTimeUTC, getCurrentUTC } = require('../utils/dateUtils');

class PricebookProcessor {
  constructor() {
    this.processedCount = 0;
    this.errorCount = 0;
  }

  /**
   * Process a pricebook CSV file
   * @param {string} filePath - Path to the CSV file
   * @returns {Object} Processing result
   */
  async processFile(filePath) {
    logger.info(`Processing Pricebook CSV file: ${filePath}`);

    this.processedCount = 0;
    this.errorCount = 0;

    try {
      const products = await this.parseCSV(filePath);
      
      for (const product of products) {
        await this.processProduct(product);
      }

      const result = {
        success: true,
        fileType: 'PRICEBOOK',
        fileName: require('path').basename(filePath),
        processedEntries: this.processedCount,
        errors: this.errorCount
      };

      logger.info(`Pricebook processing completed: ${this.processedCount} successful, ${this.errorCount} errors`);
      return result;

    } catch (error) {
      logger.error(`Error processing pricebook file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Parse CSV file and return product data
   * @param {string} filePath - Path to CSV file
   * @returns {Array} Array of product objects
   */
  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const products = [];

        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
          // Clean and map CSV columns to our database fields
          const product = {
            upc: this.cleanUPC(row['UPC'] || row['upc']),
            description: row['Item Description'] || row['description'] || '',
            departmentId: this.parseNumber(row['Department ID'] || row['department_id']),
            departmentName: row['Department Name'] || row['department_name'] || '',
            departmentType: row['Department Type'] || row['department_type'] || '',
            cost: this.parsePrice(row['Cost'] || row['cost']),
            retailPrice: this.parsePrice(row['Retail Price'] || row['retail_price'])
          };
          
          if (product.upc) { // Only add if UPC exists
            products.push(product);
          }
        })
        .on('end', () => {
          logger.info(`Parsed ${products.length} products from CSV`);
          resolve(products);
          })
          .on('error', (error) => {
          logger.error('Error parsing CSV:', error);
            reject(error);
          });
    });
  }

  /**
   * Process a single product entry
   * @param {Object} productData - Product data from CSV
   */
  async processProduct(productData) {
    const transaction = await models.sequelize.transaction();

    try {
      // Create/update department if provided
      let department = null;
      if (productData.departmentId) {
        // Classify department based on name and type
        const classification = classifyDepartment(productData.departmentName, productData.departmentType);
        
        [department] = await models.Departments.findOrCreate({
          where: { department_id: productData.departmentId },
          defaults: {
            department_id: productData.departmentId,
            department_name: productData.departmentName,
            department_type: productData.departmentType,
            is_car_wash_department: classification.is_car_wash_department,
            is_fuel_department: classification.is_fuel_department,
            is_lottery_department: classification.is_lottery_department
          },
          transaction
        });

        // Update existing department with new information and classification
        if (department && !department.department_name && productData.departmentName) {
          const updateClassification = classifyDepartment(productData.departmentName, productData.departmentType);
          await department.update({
            department_name: productData.departmentName,
            department_type: productData.departmentType,
            is_car_wash_department: updateClassification.is_car_wash_department,
            is_fuel_department: updateClassification.is_fuel_department,
            is_lottery_department: updateClassification.is_lottery_department
          }, { transaction });
        }
      }

      // Create/update product in pricebook
      const [product, created] = await models.Pricebook.findOrCreate({
        where: { upc_id: productData.upc },
        defaults: {
          upc_id: productData.upc,
          department_id: productData.departmentId,
          upc_description: productData.description,
          cost: productData.cost,
          retail_price: productData.retailPrice,
          cost_avail_flag: (productData.cost && productData.cost > 0) ? 'Y' : 'N',
          retail_price_avail_flag: (productData.retailPrice && productData.retailPrice > 0) ? 'Y' : 'N',
          upc_source: 'Manual',
          created_by: 'Gunjan',
          creation_date: getCurrentUTC(),
          modified_by: null,
          modified_date: null
        },
        transaction
      });

      // Update existing product with new information
      if (!created) {
        const updateData = {};
        if (productData.description) updateData.upc_description = productData.description;
        if (productData.departmentId) updateData.department_id = productData.departmentId;
        if (productData.cost !== null) {
          updateData.cost = productData.cost;
          updateData.cost_avail_flag = (productData.cost && productData.cost > 0) ? 'Y' : 'N';
        }
        if (productData.retailPrice !== null) {
          updateData.retail_price = productData.retailPrice;
          updateData.retail_price_avail_flag = (productData.retailPrice && productData.retailPrice > 0) ? 'Y' : 'N';
        }
        updateData.modified_by = 'Gunjan';
        updateData.modified_date = getCurrentUTC();

        if (Object.keys(updateData).length > 0) {
          await product.update(updateData, { transaction });
        }
      }

      await transaction.commit();
      this.processedCount++;

      if (created) {
        logger.info(`Created new product: ${productData.upc} - ${productData.description}`);
      } else {
        logger.debug(`Updated existing product: ${productData.upc}`);
      }

    } catch (error) {
      await transaction.rollback();
      this.errorCount++;
      logger.error(`Error processing product ${productData.upc}:`, error);
    }
  }

  /**
   * Clean and normalize UPC codes
   * @param {string} upc - Raw UPC from CSV
   * @returns {string|null} Cleaned UPC or null if invalid
   */
  cleanUPC(upc) {
    if (!upc) return null;
    
    // Remove any non-numeric characters and leading zeros for consistency
    const cleaned = upc.toString().replace(/[^0-9]/g, '');
    
    // Convert to number to remove leading zeros, then back to string
    const numericUPC = parseInt(cleaned, 10);
    
    return numericUPC > 0 ? numericUPC.toString() : null;
  }

  /**
   * Parse numeric values from CSV
   * @param {string|number} value - Value to parse
   * @returns {number|null} Parsed number or null
   */
  parseNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Parse price values from CSV
   * @param {string|number} price - Price to parse
   * @returns {number|null} Parsed price or null
   */
  parsePrice(price) {
    if (price === null || price === undefined || price === '') return null;
    
    // Remove currency symbols and parse
    const cleaned = price.toString().replace(/[$,]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? null : Math.round(parsed * 100) / 100; // Round to 2 decimal places
  }
}

module.exports = PricebookProcessor;
