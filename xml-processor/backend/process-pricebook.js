/**
 * Process Pricebook CSV File
 */

// Load environment variables
require('dotenv').config();

const { ProcessorFactory } = require('./src/processors');
const path = require('path');

async function processPricebook() {
  try {
    const factory = new ProcessorFactory();
    const filePath = path.join(__dirname, '../../input/Pricebook - Report.csv');
    
    console.log('Processing Pricebook - Report.csv...');
    console.log(`File path: ${filePath}`);
    
    const result = await factory.processFile(filePath);
    
    console.log('\n=== Processing Complete ===');
    console.log(JSON.stringify(result, null, 2));
    
    // Show database summary
    const models = require('./src/models');
    const productCount = await models.Pricebook.count();
    const deptCount = await models.Departments.count();
    
    console.log('\n=== Database Summary ===');
    console.log(`Products in pricebook: ${productCount}`);
    console.log(`Total departments: ${deptCount}`);
    
    // Show sample products
    const sampleProducts = await models.Pricebook.findAll({
      limit: 5,
      include: [{
        model: models.Departments,
        as: 'department'
      }]
    });
    
    console.log('\n=== Sample Products ===');
    sampleProducts.forEach((product, index) => {
      console.log(`${index + 1}. UPC: ${product.upc_id}`);
      console.log(`   Description: ${product.upc_description}`);
      console.log(`   Department: ${product.department ? product.department.department_name : 'N/A'}`);
      console.log(`   Cost: $${product.cost || 0} | Retail: $${product.retail_price || 0}`);
      console.log('');
    });
    
    await models.sequelize.close();
    console.log('✅ Processing completed successfully!');
    
  } catch (error) {
    console.error('❌ Error processing pricebook:', error.message);
    console.error('Full error:', error);
  }
}

// Run the processor
processPricebook(); 