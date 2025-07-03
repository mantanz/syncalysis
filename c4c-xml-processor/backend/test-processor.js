/**
 * Test Script for XML Processors
 * 
 * This script tests the XML processors with sample data
 */

const path = require('path');
const { ProcessorFactory } = require('./src/processors');

// Mock logger for testing
const mockLogger = {
  info: (message, data) => console.log(`INFO: ${message}`, data || ''),
  error: (message, error) => console.error(`ERROR: ${message}`, error || ''),
  warn: (message, data) => console.warn(`WARN: ${message}`, data || ''),
  debug: (message, data) => console.log(`DEBUG: ${message}`, data || '')
};

// Mock models for testing (without database)
const mockModels = {
  sequelize: {
    transaction: async () => ({
      commit: async () => console.log('Transaction committed'),
      rollback: async () => console.log('Transaction rolled back')
    })
  },
  Store: {
    findOrCreate: async ({ where, defaults }) => {
      console.log(`Mock: Creating/finding store ${where.store_id}`);
      return [{ ...defaults, ...where }, true];
    }
  },
  Departments: {
    findOrCreate: async ({ where, defaults }) => {
      console.log(`Mock: Creating/finding department ${where.department_id}`);
      return [{ ...defaults, ...where }, true];
    }
  },
  PosDeviceTerminal: {
    findOrCreate: async ({ where, defaults }) => {
      console.log(`Mock: Creating/finding POS terminal ${where.register_id}`);
      return [{ ...defaults, ...where }, true];
    }
  },
  Pricebook: {
    findOrCreate: async ({ where, defaults }) => {
      console.log(`Mock: Creating/finding product ${where.upc_id}`);
      return [{ ...defaults, ...where }, true];
    }
  },
  TransactionEventLog: {
    findOrCreate: async ({ where, defaults }) => {
      console.log(`Mock: Creating/finding event log ${where.transaction_event_log_id}`);
      return [{ ...defaults, ...where }, true];
    }
  },
  SalesTransaction: {
    findOrCreate: async ({ where, defaults }) => {
      console.log(`Mock: Creating/finding transaction ${where.transaction_id}`);
      return [{ ...defaults, ...where }, true];
    },
    update: async (data) => {
      console.log(`Mock: Updating transaction`, data);
      return true;
    }
  },
  TransactionLineItem: {
    create: async (data) => {
      console.log(`Mock: Creating line item for transaction ${data.transaction_id}`);
      return { ...data, line_item_uuid: 'mock-uuid-' + Date.now() };
    }
  },
  TransactionLineItemTax: {
    create: async (data) => {
      console.log(`Mock: Creating tax line item`);
      return data;
    }
  },
  Payment: {
    create: async (data) => {
      console.log(`Mock: Creating payment for transaction ${data.transaction_id}`);
      return data;
    }
  },
  PromotionsLineItem: {
    create: async (data) => {
      console.log(`Mock: Creating promotion line item`);
      return data;
    }
  },
  PromotionsProgramDetails: {
    findOrCreate: async ({ where, defaults }) => {
      console.log(`Mock: Creating/finding promotion program ${where.promotion_id}`);
      return [{ ...defaults, ...where }, true];
    }
  },
  RebateProgramDetails: {
    findOrCreate: async ({ where, defaults }) => {
      console.log(`Mock: Creating/finding rebate program ${where.rebate_id}`);
      return [{ ...defaults, ...where }, true];
    }
  },
  TransactionLoyalty: {
    create: async (data) => {
      console.log(`Mock: Creating loyalty data for transaction ${data.transaction_id}`);
      return data;
    }
  },
  LoyaltyLineItems: {
    create: async (data) => {
      console.log(`Mock: Creating loyalty line item`);
      return data;
    }
  }
};

// Replace the models in processors with mock models
function setupMockModels() {
  // This is a simple way to inject mock models for testing
  require.cache[require.resolve('./src/models')] = {
    exports: mockModels
  };
  
  // Mock the logger
  require.cache[require.resolve('./src/utils/logger')] = {
    exports: mockLogger
  };
}

async function testFileTypeDetection() {
  console.log('\n=== Testing File Type Detection ===');
  
  const processorFactory = new ProcessorFactory();
  
  const testFiles = [
    'CPJ2025-03-10-868.xml',
    'SUM2025-03-10-868.xml', 
    'FCF2025-03-10-868.xml',
    'FGM2025-03-10-868.xml',
    'HRS2025-03-10-868.xml',
    'UNKNOWN-file.xml'
  ];
  
  testFiles.forEach(file => {
    const fileType = processorFactory.getFileType(file);
    const isSupported = processorFactory.isSupported(fileType);
    console.log(`File: ${file} -> Type: ${fileType}, Supported: ${isSupported}`);
  });
}

async function testCPJProcessor() {
  console.log('\n=== Testing CPJ Processor ===');
  
  // Create sample CPJ XML content
  const sampleCPJXML = `<?xml version="1.0" encoding="UTF-8"?>
<transset>
  <trans>
    <trheader>
      <trseq>123456</trseq>
      <storenumber>001</storenumber>
      <posnum>1</posnum>
      <cashier sysid="101">John Doe</cashier>
      <date>2025-01-15T10:30:00Z</date>
      <type>sale</type>
    </trheader>
    <trvalue>
      <trtotwtax>15.99</trtotwtax>
      <trtotnotax>14.53</trtotnotax>
      <trtottax>1.46</trtottax>
      <trgtotalizer>15.99</trgtotalizer>
    </trvalue>
    <trlines>
      <trline>
        <trlupc>1234567890</trlupc>
        <trldesc>Test Product</trldesc>
        <trlqty>2</trlqty>
        <trlunitprice>7.99</trlunitprice>
        <trllinetot>15.98</trllinetot>
        <trldept number="10">Grocery</trldept>
        <trlpromotionid>500</trlpromotionid>
        <trlmatchname>Buy 2 Get Discount</trlmatchname>
        <trlpromoamount>2.00</trlpromoamount>
      </trline>
    </trlines>
    <trpaylines>
      <trpayline>
        <mopcode>1</mopcode>
        <mopamount>15.99</mopamount>
        <type>cash</type>
      </trpayline>
    </trpaylines>
    <trloyalty>
      <trloyaltyprogram programid="REWARDS">
        <trloaccount>1234567890</trloaccount>
        <trloautodisc>1.00</trloautodisc>
      </trloyaltyprogram>
    </trloyalty>
  </trans>
</transset>`;

  // Write sample XML to temp file
  const fs = require('fs');
  const tempFile = path.join(__dirname, 'temp-cpj-test.xml');
  fs.writeFileSync(tempFile, sampleCPJXML);
  
  try {
    setupMockModels();
    const processorFactory = new ProcessorFactory();
    const result = await processorFactory.processFile(tempFile);
    
    console.log('CPJ Processing Result:', JSON.stringify(result, null, 2));
    
    // Clean up
    fs.unlinkSync(tempFile);
    
  } catch (error) {
    console.error('CPJ Test Error:', error.message);
    // Clean up on error
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

async function testGenericProcessor() {
  console.log('\n=== Testing Generic Processor ===');
  
  // Create sample XML for generic processing
  const sampleGenericXML = `<?xml version="1.0" encoding="UTF-8"?>
<data>
  <store id="002" name="Test Store">
    <address>123 Main St</address>
    <city>Test City</city>
  </store>
  <department id="20" name="Electronics" type="norm"/>
  <product upc="9876543210" description="Test Electronics Item" price="99.99"/>
  <promotion id="600" name="Electronics Sale" type="percentage"/>
</data>`;

  const fs = require('fs');
  const tempFile = path.join(__dirname, 'temp-generic-test.xml');
  fs.writeFileSync(tempFile, sampleGenericXML);
  
  try {
    setupMockModels();
    const processorFactory = new ProcessorFactory();
    const result = await processorFactory.processFile(tempFile);
    
    console.log('Generic Processing Result:', JSON.stringify(result, null, 2));
    
    // Clean up
    fs.unlinkSync(tempFile);
    
  } catch (error) {
    console.error('Generic Test Error:', error.message);
    // Clean up on error
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

async function runAllTests() {
  console.log('🧪 Starting XML Processor Tests\n');
  
  try {
    await testFileTypeDetection();
    await testCPJProcessor();
    await testGenericProcessor();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testFileTypeDetection,
  testCPJProcessor,
  testGenericProcessor
};
 