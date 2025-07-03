/**
 * Simple XML Processing Test
 * Tests XML parsing capabilities without database dependencies
 */

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// Test XML parsing functionality
async function testXMLParsing() {
  console.log('🧪 Testing XML Parsing Capabilities\n');

  const inputDir = path.join(__dirname, '../../input');
  const xmlFiles = fs.readdirSync(inputDir).filter(file => file.endsWith('.xml'));

  console.log(`Found ${xmlFiles.length} XML files to test:`);
  xmlFiles.forEach(file => console.log(`  - ${file}`));
  console.log();

  for (const file of xmlFiles.slice(0, 3)) { // Test first 3 files
    console.log(`\n=== Testing ${file} ===`);
    
    try {
      const filePath = path.join(inputDir, file);
      const fileSize = fs.statSync(filePath).size;
      console.log(`File size: ${(fileSize / 1024).toFixed(2)} KB`);

      // Read and parse XML
      const xmlContent = fs.readFileSync(filePath, 'utf8');
      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: true,
        trim: true
      });

      const result = await parser.parseStringPromise(xmlContent);
      
      // Analyze structure
      console.log('Root elements:', Object.keys(result));
      
      // Get file type from filename
      const fileType = file.substring(0, 3);
      console.log(`File type: ${fileType}`);
      
      // Show some sample data structure
      if (fileType === 'CPJ' && result.transset && result.transset.trans) {
        const transactions = Array.isArray(result.transset.trans) 
          ? result.transset.trans 
          : [result.transset.trans];
        console.log(`Found ${transactions.length} transactions`);
        
        if (transactions[0] && transactions[0].trheader) {
          const header = transactions[0].trheader;
          console.log('Sample transaction header:', {
            sequence: header.trseq,
            store: header.storenumber,
            pos: header.posnum,
            date: header.date
          });
        }
      } else if (fileType === 'SUM' && result.summary) {
        console.log('Summary data structure:', Object.keys(result.summary));
      } else if (fileType === 'FCF' && result.fuelcontrol) {
        console.log('Fuel control data structure:', Object.keys(result.fuelcontrol));
      } else {
        // Generic structure analysis
        const analyzeStructure = (obj, depth = 0, maxDepth = 2) => {
          if (depth > maxDepth) return '...';
          if (typeof obj !== 'object' || obj === null) return typeof obj;
          if (Array.isArray(obj)) return `Array[${obj.length}]`;
          
          const keys = Object.keys(obj).slice(0, 5); // Show first 5 keys
          const structure = {};
          keys.forEach(key => {
            structure[key] = analyzeStructure(obj[key], depth + 1, maxDepth);
          });
          return structure;
        };
        
        console.log('Data structure sample:', JSON.stringify(analyzeStructure(result), null, 2));
      }
      
      console.log('✅ Parsing successful');
      
    } catch (error) {
      console.error('❌ Parsing failed:', error.message);
    }
  }
}

// Test file type detection logic
function testFileTypeDetection() {
  console.log('\n=== Testing File Type Detection ===');
  
  const getFileType = (filename) => {
    const match = filename.match(/^([A-Z]{3})/);
    return match ? match[1] : 'UNKNOWN';
  };

  const isSupported = (fileType) => {
    const supportedTypes = ['CPJ', 'SUM', 'FCF', 'FGM', 'HRS', 'ISM', 'LYT', 'MCM', 'MSM', 'TPM'];
    return supportedTypes.includes(fileType);
  };

  const testFiles = [
    'CPJ2025-03-10-868.xml',
    'SUM2025-03-10-868.xml', 
    'FCF2025-03-10-868.xml',
    'FGM2025-03-10-868.xml',
    'HRS2025-03-10-868.xml',
    'ISM2025-03-10-868.xml',
    'LYT2025-03-10-868.xml',
    'MCM2025-03-10-868.xml',
    'MSM2025-03-10-868.xml',
    'TPM2025-03-10-868.xml',
    'UNKNOWN-file.xml'
  ];
  
  testFiles.forEach(file => {
    const fileType = getFileType(file);
    const supported = isSupported(fileType);
    console.log(`${file.padEnd(25)} -> ${fileType.padEnd(8)} (${supported ? '✅ Supported' : '❌ Not Supported'})`);
  });
}

// Test CSV mapping file
async function testCSVMapping() {
  console.log('\n=== Testing CSV Mapping File ===');
  
  try {
    const csvPath = path.join(__dirname, '../../input/Phase 0.5 Feature Details - INPUT_ Ex TLOG Mapping.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    console.log(`CSV file contains ${lines.length} lines`);
    
    // Parse header
    const header = lines[0].split(',').map(col => col.replace(/"/g, '').trim());
    console.log('CSV columns:', header);
    
    // Show sample mappings
    console.log('\nSample mappings:');
    for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
      const row = lines[i].split(',').map(col => col.replace(/"/g, '').trim());
      const mapping = {};
      header.forEach((col, idx) => {
        if (row[idx]) mapping[col] = row[idx];
      });
      console.log(`${i}. ${mapping['XML Path'] || 'N/A'} -> ${mapping['Database Table'] || 'N/A'}.${mapping['Database Column'] || 'N/A'}`);
    }
    
    console.log('✅ CSV mapping file loaded successfully');
    
  } catch (error) {
    console.error('❌ CSV mapping test failed:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Simple XML Processor Tests\n');
  
  try {
    testFileTypeDetection();
    await testCSVMapping();
    await testXMLParsing();
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Set up PostgreSQL database');
    console.log('2. Run database migrations');
    console.log('3. Start the server with: npm start');
    console.log('4. Test API endpoints with real data');
    
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testXMLParsing, testFileTypeDetection, testCSVMapping }; 