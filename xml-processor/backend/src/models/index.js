const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Import all models
const Store = require('./Store');
const Departments = require('./Departments');
const PosDeviceTerminal = require('./PosDeviceTerminal');
const Pricebook = require('./Pricebook');
const TransactionEventLog = require('./TransactionEventLog');
const SalesTransaction = require('./SalesTransaction');
const TransactionLineItem = require('./TransactionLineItem');
const TransactionLineItemTax = require('./TransactionLineItemTax');
const Payment = require('./Payment');
const LoyaltyLineItems = require('./LoyaltyLineItems');
const PromotionsLineItem = require('./PromotionsLineItem');
const PromotionsProgramDetails = require('./PromotionsProgramDetails');
const RebateProgramDetails = require('./RebateProgramDetails');
const TransactionLoyalty = require('./TransactionLoyalty');

// Initialize models
const models = {
  Store: Store(sequelize, DataTypes),
  Departments: Departments(sequelize, DataTypes),
  PosDeviceTerminal: PosDeviceTerminal(sequelize, DataTypes),
  Pricebook: Pricebook(sequelize, DataTypes),
  TransactionEventLog: TransactionEventLog(sequelize, DataTypes),
  SalesTransaction: SalesTransaction(sequelize, DataTypes),
  TransactionLineItem: TransactionLineItem(sequelize, DataTypes),
  TransactionLineItemTax: TransactionLineItemTax(sequelize, DataTypes),
  Payment: Payment(sequelize, DataTypes),
  LoyaltyLineItems: LoyaltyLineItems(sequelize, DataTypes),
  PromotionsLineItem: PromotionsLineItem(sequelize, DataTypes),
  PromotionsProgramDetails: PromotionsProgramDetails(sequelize, DataTypes),
  RebateProgramDetails: RebateProgramDetails(sequelize, DataTypes),
  TransactionLoyalty: TransactionLoyalty(sequelize, DataTypes)
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models; 