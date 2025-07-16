/**
 * Processor Index - Factory for XML Processors
 * 
 * Provides access to all XML processors and determines which processor
 * to use based on file type.
 */

const CPJProcessor = require('./cpjProcessor');
const FCFProcessor = require('./fcfProcessor');
const GenericProcessor = require('./genericProcessor');
const PricebookProcessor = require('./pricebookProcessor');
const logger = require('../utils/logger');

class ProcessorFactory {
  constructor() {
    this.processors = {
      'CPJ': new CPJProcessor(),
      'FCF': new FCFProcessor(),
      'GENERIC': new GenericProcessor(),
      'PRICEBOOK': new PricebookProcessor()
    };
  }

  /**
   * Get the appropriate processor for a file
   * @param {string} filePath - Path to the XML file
   * @returns {Object} Processor instance
   */
  getProcessor(filePath) {
    const fileType = this.getFileType(filePath);
    
    // Return specific processor if available
    if (this.processors[fileType]) {
      logger.info(`Using ${fileType} processor for file: ${filePath}`);
      return this.processors[fileType];
    }
    
    // Fall back to generic processor
    logger.info(`Using generic processor for file type ${fileType}: ${filePath}`);
    return this.processors['GENERIC'];
  }

  /**
   * Process a file using the appropriate processor
   * @param {string} filePath - Path to the XML file
   * @returns {Object} Processing result
   */
  async processFile(filePath) {
    try {
      const fileType = this.getFileType(filePath);
      
      if (this.processors[fileType]) {
        return await this.processors[fileType].processFile(filePath);
      } else {
        // Use generic processor with file type parameter
        return await this.processors['GENERIC'].processFile(filePath, fileType);
      }
    } catch (error) {
      logger.error(`Error processing file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Process multiple files
   * @param {Array<string>} filePaths - Array of file paths
   * @returns {Array<Object>} Processing results
   */
  async processFiles(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
      try {
        const result = await this.processFile(filePath);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to process file ${filePath}:`, error);
        results.push({
          success: false,
          filePath,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Extract file type from filename
   * @param {string} filePath - Path to the file
   * @returns {string} File type (CPJ, SUM, FCF, PRICEBOOK, etc.)
   */
  getFileType(filePath) {
    const fileName = require('path').basename(filePath).toLowerCase();
    
    // Check for CSV files first
    if (fileName.endsWith('.csv')) {
      if (fileName.includes('pricebook')) {
        return 'PRICEBOOK';
      }
      return 'CSV'; // Generic CSV handler could be added later
    }
    
    // XML files - extract 3-letter prefix
    const match = fileName.match(/^([A-Z]{3})/i);
    return match ? match[1].toUpperCase() : 'UNKNOWN';
  }

  /**
   * Get list of supported file types
   * @returns {Array<string>} Supported file types
   */
  getSupportedFileTypes() {
    return Object.keys(this.processors).filter(type => type !== 'GENERIC');
  }

  /**
   * Check if a file type is supported
   * @param {string} fileType - File type to check
   * @returns {boolean} True if supported
   */
  isSupported(fileType) {
    return this.processors.hasOwnProperty(fileType) || fileType === 'GENERIC';
  }
}

// Export both the factory and individual processors
module.exports = {
  ProcessorFactory,
  CPJProcessor,
  FCFProcessor,
  GenericProcessor,
  PricebookProcessor
};

// Export a default instance for convenience
module.exports.default = new ProcessorFactory();
