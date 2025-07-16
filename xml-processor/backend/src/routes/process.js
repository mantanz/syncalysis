/**
 * Processing Routes
 * 
 * API endpoints for processing XML files
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { ProcessorFactory } = require('../processors');
const logger = require('../utils/logger');

const router = express.Router();
const processorFactory = new ProcessorFactory();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Keep original filename
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept XML and CSV files
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml' || ext === '.xml' ||
        file.mimetype === 'text/csv' || file.mimetype === 'application/csv' || ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only XML and CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

/**
 * POST /api/process/upload
 * Upload and process a single XML or CSV file
 */
router.post('/upload', upload.single('xmlFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    
    logger.info(`Processing uploaded file: ${fileName}`);

    // Process the file
    const result = await processorFactory.processFile(filePath);

    // Clean up uploaded file
    await fs.unlink(filePath);

    res.json({
      success: true,
      fileName: fileName,
      result: result
    });

  } catch (error) {
    logger.error('Error processing uploaded file:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/process/file
 * Process a file from the input directory
 */
router.post('/file', async (req, res) => {
  try {
    const { fileName } = req.body;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: 'fileName is required'
      });
    }

    const filePath = path.join(__dirname, '../../../input', fileName);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    logger.info(`Processing file from input directory: ${fileName}`);

    // Process the file
    const result = await processorFactory.processFile(filePath);

    res.json({
      success: true,
      fileName: fileName,
      result: result
    });

  } catch (error) {
    logger.error('Error processing file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/process/batch
 * Process multiple files from the input directory
 */
router.post('/batch', async (req, res) => {
  try {
    const { fileNames } = req.body;

    if (!fileNames || !Array.isArray(fileNames)) {
      return res.status(400).json({
        success: false,
        error: 'fileNames array is required'
      });
    }

    const inputDir = path.join(__dirname, '../../../input');
    const filePaths = fileNames.map(fileName => path.join(inputDir, fileName));

    // Verify all files exist
    for (const filePath of filePaths) {
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          error: `File not found: ${path.basename(filePath)}`
        });
      }
    }

    logger.info(`Processing batch of ${fileNames.length} files`);

    // Process all files
    const results = await processorFactory.processFiles(filePaths);

    res.json({
      success: true,
      processedCount: results.filter(r => r.success).length,
      errorCount: results.filter(r => !r.success).length,
      results: results
    });

  } catch (error) {
    logger.error('Error processing batch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/process/files
 * List available files in the input directory
 */
router.get('/files', async (req, res) => {
  try {
    const inputDir = path.join(__dirname, '../../../input');
    const files = await fs.readdir(inputDir);
    
    // Filter for XML files
    const xmlFiles = files.filter(file => 
      path.extname(file).toLowerCase() === '.xml'
    );

    // Group by file type
    const filesByType = {};
    xmlFiles.forEach(file => {
      const fileType = processorFactory.getFileType(file);
      if (!filesByType[fileType]) {
        filesByType[fileType] = [];
      }
      filesByType[fileType].push(file);
    });

    res.json({
      success: true,
      totalFiles: xmlFiles.length,
      filesByType: filesByType,
      supportedTypes: processorFactory.getSupportedFileTypes()
    });

  } catch (error) {
    logger.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/process/status
 * Get processing status and supported file types
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    supportedFileTypes: processorFactory.getSupportedFileTypes(),
    version: '1.0.0',
    status: 'ready'
  });
});

module.exports = router; 