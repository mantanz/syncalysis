require('dotenv').config();
const path = require('path');
const { ProcessorFactory } = require('./src/processors');
const logger = require('./src/utils/logger');

async function testFGMProcessor() {
  try {
    console.log('=== FGM Processor Test ===');
    
    const filePath = path.resolve('../../input/FGM2025-03-10-868.xml');
    console.log('Processing FGM file:', filePath);
    
    // Create processor factory instance
    const factory = new ProcessorFactory();
    const processor = factory.getProcessor(filePath);
    console.log('Processor type:', processor.constructor.name);
    
    // Process the file
    const startTime = Date.now();
    const result = await processor.processFile(filePath, 'FGM');
    const endTime = Date.now();
    
    console.log('\n=== Processing Results ===');
    console.log('Success:', result.success);
    console.log('File Type:', result.fileType);
    console.log('File Name:', result.fileName);
    console.log('Processed Entries:', result.processedEntries || 0);
    console.log('Errors:', result.errors || 0);
    console.log('Processing Time:', (endTime - startTime) + 'ms');
    
    console.log('\n=== Test Completed Successfully ===');
    
  } catch (error) {
    console.error('\n=== Error Processing FGM File ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testFGMProcessor(); 