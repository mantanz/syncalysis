const { Sequelize } = require('sequelize');

async function clearAllData() {
  const sequelize = new Sequelize(
    process.env.DB_NAME || 'c4c_xml_processor',
    process.env.DB_USER || 'eeshika',
    process.env.DB_PASSWORD || 'password',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: false
    }
  );

  try {
    console.log('Starting to clear all data from database tables...');
    
    // Disable foreign key checks temporarily
    await sequelize.query('SET session_replication_role = replica;');
    
    // List of tables to clear (in order to avoid foreign key constraints)
    const tables = [
      'loyalty_line_items',
      'transaction_line_item_tax',
      'promotions_line_item',
      'transaction_line_item',
      'transaction_loyalty',
      'payment',
      'transaction_event_log',
      'sales_transaction',
      'pos_device_terminal',
      'promotion_upc_linkage',
      'rebate_upc_linkage',
      'promotions_program_details',
      'rebate_program_details',
      'pricebook',
      'departments',
      'store'
    ];

    for (const table of tables) {
      try {
        console.log(`Clearing data from table: ${table}`);
        await sequelize.query(`DELETE FROM ${table};`);
        console.log(`✓ Cleared data from ${table}`);
      } catch (error) {
        console.log(`⚠ Could not clear ${table}: ${error.message}`);
      }
    }

    // Re-enable foreign key checks
    await sequelize.query('SET session_replication_role = DEFAULT;');
    
    console.log('\n✅ All data cleared successfully from all tables!');
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the data clearing
clearAllData()
  .then(() => {
    console.log('Data clearing completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Data clearing failed:', error);
    process.exit(1);
  }); 