/**
 * Database Data Viewer
 * Quick script to view data in all tables
 */

require('dotenv').config();
const models = require('./src/models');

async function viewDatabaseData() {
  console.log('📊 Database Data Viewer\n');

  try {
    // Test connection
    await models.sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Get counts for all tables
    console.log('=== TABLE COUNTS ===');
    const stores = await models.Store.count();
    const departments = await models.Departments.count();
    const products = await models.Pricebook.count();
    const transactions = await models.SalesTransaction.count();
    const lineItems = await models.TransactionLineItem.count();
    const payments = await models.Payment.count();
    const promotions = await models.PromotionsProgramDetails.count();
    const rebates = await models.RebateProgramDetails.count();
    const loyalty = await models.TransactionLoyalty.count();

    console.log(`Stores: ${stores}`);
    console.log(`Departments: ${departments}`);
    console.log(`Products: ${products}`);
    console.log(`Transactions: ${transactions}`);
    console.log(`Line Items: ${lineItems}`);
    console.log(`Payments: ${payments}`);
    console.log(`Promotions: ${promotions}`);
    console.log(`Rebates: ${rebates}`);
    console.log(`Loyalty Records: ${loyalty}`);

    // Show sample data from key tables
    if (stores > 0) {
      console.log('\n=== STORES ===');
      const storeData = await models.Store.findAll({ limit: 5 });
      storeData.forEach(store => {
        console.log(`ID: ${store.store_id}, Name: ${store.store_name}`);
      });
    }

    if (products > 0) {
      console.log('\n=== PRODUCTS (Sample) ===');
      const productData = await models.Pricebook.findAll({ limit: 10 });
      productData.forEach(product => {
        console.log(`UPC: ${product.upc_id}, Description: ${product.upc_description}, Price: $${product.retail_price || 'N/A'}`);
      });
    }

    if (transactions > 0) {
      console.log('\n=== TRANSACTIONS (Recent 5) ===');
      const transactionData = await models.SalesTransaction.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [
          { model: models.Store, as: 'store' },
          { model: models.TransactionLineItem, as: 'lineItems' }
        ]
      });

      transactionData.forEach(tx => {
        console.log(`\nTransaction ID: ${tx.transaction_id}`);
        console.log(`  Store: ${tx.store?.store_name || 'N/A'}`);
        console.log(`  Total: $${tx.total_amount || 'N/A'}`);
        console.log(`  Date: ${tx.transaction_datetime || 'N/A'}`);
        console.log(`  Line Items: ${tx.lineItems?.length || 0}`);
      });
    }

    if (promotions > 0) {
      console.log('\n=== PROMOTION PROGRAMS ===');
      const promoData = await models.PromotionsProgramDetails.findAll({ limit: 5 });
      promoData.forEach(promo => {
        console.log(`ID: ${promo.promotion_id}, Name: ${promo.promotion_name}, Type: ${promo.promotion_type}`);
      });
    }

    if (rebates > 0) {
      console.log('\n=== REBATE PROGRAMS ===');
      const rebateData = await models.RebateProgramDetails.findAll({ limit: 5 });
      rebateData.forEach(rebate => {
        console.log(`ID: ${rebate.rebate_id}, Name: ${rebate.rebate_name}, Type: ${rebate.rebate_type}`);
      });
    }

  } catch (error) {
    console.error('❌ Error viewing database:', error.message);
  } finally {
    await models.sequelize.close();
  }
}

// Run if executed directly
if (require.main === module) {
  viewDatabaseData();
}

module.exports = { viewDatabaseData }; 