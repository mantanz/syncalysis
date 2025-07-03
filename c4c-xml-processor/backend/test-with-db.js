/**
 * Test Script with Database
 * Processes actual XML files and checks database entries
 */

require('dotenv').config();
const path = require('path');
const { ProcessorFactory } = require('./src/processors');
const models = require('./src/models');

async function testWithDatabase() {
  console.log('🧪 Testing XML Processing with Database\n');

  try {
    // Test database connection
    console.log('Testing database connection...');
    await models.sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    // Initialize processor factory
    const processorFactory = new ProcessorFactory();

    // Test files to process (start with smaller files)
    const testFiles = [
      //'ISM2025-03-10-868.xml',  // Inventory/Stock Management file (ISM)
      //'HRS2025-03-10-868.xml',  // Hours/Schedule file (HRS)
      //'SUM2025-03-10-868.xml',  // Summary file (smaller)
      //'FCF2025-03-10-868.xml',  // Fuel control file (small)
       'CPJ2025-03-02-860.xml'   // Transaction file (large) - uncomment to test
      //'Pricebook - Report.csv'
    ];

    for (const fileName of testFiles) {
      console.log(`\n=== Processing ${fileName} ===`);
      
      const filePath = path.join(__dirname, '../../input', fileName);
      
      try {
        const result = await processorFactory.processFile(filePath);
        console.log('Processing result:', JSON.stringify(result, null, 2));

        // Check what was created in the database
        await checkDatabaseEntries(fileName);
        
      } catch (error) {
        console.error(`❌ Failed to process ${fileName}:`, error.message);
      }
    }

    console.log('\n=== Database Summary ===');
    await showDatabaseSummary();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await models.sequelize.close();
  }
}

async function checkDatabaseEntries(fileName) {
  console.log(`\n📊 Database entries after processing ${fileName}:`);

  try {
    // Check all tables for entries
    const tables = [
      { name: 'Store', model: models.Store },
      { name: 'Departments', model: models.Departments },
      { name: 'Pricebook', model: models.Pricebook },
      { name: 'SalesTransaction', model: models.SalesTransaction },
      { name: 'TransactionLineItem', model: models.TransactionLineItem },
      { name: 'Payment', model: models.Payment },
      { name: 'PromotionsLineItem', model: models.PromotionsLineItem },
      { name: 'PromotionsProgramDetails', model: models.PromotionsProgramDetails },
      { name: 'TransactionLoyalty', model: models.TransactionLoyalty }
    ];

    for (const table of tables) {
      try {
        const count = await table.model.count();
        if (count > 0) {
          console.log(`  ${table.name}: ${count} entries`);
          
          // Show sample entries for key tables
          if (['Store', 'Departments', 'SalesTransaction'].includes(table.name)) {
            const sample = await table.model.findOne();
            if (sample) {
              console.log(`    Sample: ${JSON.stringify(sample.dataValues, null, 6)}`);
            }
          }
        }
      } catch (error) {
        console.log(`  ${table.name}: Error checking - ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error checking database entries:', error.message);
  }
}

async function showDatabaseSummary() {
  try {
    const stores = await models.Store.count();
    const departments = await models.Departments.count();
    const products = await models.Pricebook.count();
    const transactions = await models.SalesTransaction.count();
    const lineItems = await models.TransactionLineItem.count();
    const payments = await models.Payment.count();

    console.log(`Total Stores: ${stores}`);
    console.log(`Total Departments: ${departments}`);
    console.log(`Total Products: ${products}`);
    console.log(`Total Transactions: ${transactions}`);
    console.log(`Total Line Items: ${lineItems}`);
    console.log(`Total Payments: ${payments}`);

    // Show recent transactions
    if (transactions > 0) {
      console.log('\n📋 Recent Transactions:');
      const recentTransactions = await models.SalesTransaction.findAll({
        limit: 3,
        order: [['createdAt', 'DESC']],
        include: [
          { model: models.Store, as: 'store' },
          { model: models.TransactionLineItem, as: 'lineItems' }
        ]
      });

      recentTransactions.forEach((tx, index) => {
        console.log(`${index + 1}. Transaction ${tx.transaction_id}:`);
        console.log(`   Store: ${tx.store?.store_name || 'N/A'}`);
        console.log(`   Total: $${tx.transaction_total || 'N/A'}`);
        console.log(`   Line Items: ${tx.lineItems?.length || 0}`);
        console.log(`   Date: ${tx.transaction_timestamp || 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('Error showing database summary:', error.message);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testWithDatabase();
}

module.exports = { testWithDatabase }; 