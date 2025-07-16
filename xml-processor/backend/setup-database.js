/**
 * Database Setup Script
 * Creates database and initializes tables
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const models = require('./src/models');

async function setupDatabase() {
  console.log('🔧 Setting up database...\n');

  try {
    // Test database connection
    console.log('Testing database connection...');
    await models.sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Sync all models (create tables)
    console.log('\nSyncing database models...');
    await models.sequelize.sync({ force: true }); // force: true will drop existing tables
    console.log('✅ Database tables created successfully');

    // Show created tables
    console.log('\nCreated tables:');
    const tables = await models.sequelize.getQueryInterface().showAllTables();
    tables.forEach(table => console.log(`  - ${table}`));

    console.log('\n✅ Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await models.sequelize.close();
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase }; 