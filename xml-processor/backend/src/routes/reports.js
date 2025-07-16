/**
 * Report Routes
 * 
 * API endpoints for querying processed data and generating reports
 */

const express = require('express');
const models = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/reports/transactions
 * Get transaction data with optional filters
 */
router.get('/transactions', async (req, res) => {
  try {
    const { 
      store_id, 
      start_date, 
      end_date, 
      transaction_type,
      limit = 100,
      offset = 0 
    } = req.query;

    const whereClause = {};
    if (store_id) whereClause.store_id = store_id;
    if (transaction_type) whereClause.transaction_type = transaction_type;
    if (start_date || end_date) {
      whereClause.transaction_datetime = {};
      if (start_date) whereClause.transaction_datetime[models.Sequelize.Op.gte] = start_date;
      if (end_date) whereClause.transaction_datetime[models.Sequelize.Op.lte] = end_date;
    }

    const transactions = await models.SalesTransaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: models.Store,
          as: 'store',
          attributes: ['store_name', 'city', 'state']
        },
        {
          model: models.TransactionLoyalty,
          as: 'loyaltyPrograms'
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['transaction_datetime', 'DESC']]
    });

    res.json({
      success: true,
      data: transactions.rows,
      pagination: {
        total: transactions.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/promotions
 * Get promotion program data
 */
router.get('/promotions', async (req, res) => {
  try {
    const { is_active, promotion_type } = req.query;

    const whereClause = {};
    if (is_active !== undefined) whereClause.is_active = is_active === 'true';
    if (promotion_type) whereClause.promotion_type = promotion_type;

    const promotions = await models.PromotionsProgramDetails.findAll({
      where: whereClause,
      order: [['promotion_id', 'ASC']]
    });

    res.json({
      success: true,
      data: promotions
    });

  } catch (error) {
    logger.error('Error fetching promotions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/rebates
 * Get rebate program data
 */
router.get('/rebates', async (req, res) => {
  try {
    const { is_active, rebate_type } = req.query;

    const whereClause = {};
    if (is_active !== undefined) whereClause.is_active = is_active === 'true';
    if (rebate_type) whereClause.rebate_type = rebate_type;

    const rebates = await models.RebateProgramDetails.findAll({
      where: whereClause,
      order: [['rebate_id', 'ASC']]
    });

    res.json({
      success: true,
      data: rebates
    });

  } catch (error) {
    logger.error('Error fetching rebates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/loyalty
 * Get loyalty program usage data
 */
router.get('/loyalty', async (req, res) => {
  try {
    const { program_name, store_id, start_date, end_date } = req.query;

    const whereClause = {};
    if (program_name) whereClause.program_name = program_name;

    const include = [
      {
        model: models.SalesTransaction,
        as: 'transaction',
        attributes: ['transaction_id', 'transaction_datetime', 'store_id', 'total_amount'],
        where: store_id ? { store_id } : {},
        include: [
          {
            model: models.Store,
            as: 'store',
            attributes: ['store_name']
          }
        ]
      }
    ];

    if (start_date || end_date) {
      const dateFilter = {};
      if (start_date) dateFilter[models.Sequelize.Op.gte] = start_date;
      if (end_date) dateFilter[models.Sequelize.Op.lte] = end_date;
      include[0].where.transaction_datetime = dateFilter;
    }

    const loyaltyData = await models.TransactionLoyalty.findAll({
      where: whereClause,
      include: include,
      order: [['loyalty_transaction_uuid', 'DESC']]
    });

    res.json({
      success: true,
      data: loyaltyData
    });

  } catch (error) {
    logger.error('Error fetching loyalty data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/departments
 * Get department data with sales summary
 */
router.get('/departments', async (req, res) => {
  try {
    const departments = await models.Departments.findAll({
      include: [
        {
          model: models.Pricebook,
          as: 'products',
          include: [
            {
              model: models.TransactionLineItem,
              as: 'lineItems',
              attributes: ['quantity', 'line_total'],
              include: [
                {
                  model: models.SalesTransaction,
                  as: 'transaction',
                  attributes: ['transaction_datetime']
                }
              ]
            }
          ]
        }
      ],
      order: [['department_id', 'ASC']]
    });

    // Calculate summary statistics for each department
    const departmentsWithStats = departments.map(dept => {
      const deptData = dept.toJSON();
      let totalSales = 0;
      let totalQuantity = 0;
      let productCount = 0;

      if (deptData.products) {
        productCount = deptData.products.length;
        deptData.products.forEach(product => {
          if (product.lineItems) {
            product.lineItems.forEach(lineItem => {
              totalSales += parseFloat(lineItem.line_total) || 0;
              totalQuantity += parseFloat(lineItem.quantity) || 0;
            });
          }
        });
      }

      return {
        ...deptData,
        summary: {
          total_sales: totalSales,
          total_quantity: totalQuantity,
          product_count: productCount
        }
      };
    });

    res.json({
      success: true,
      data: departmentsWithStats
    });

  } catch (error) {
    logger.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/stores
 * Get store data with sales summary
 */
router.get('/stores', async (req, res) => {
  try {
    const stores = await models.Store.findAll({
      include: [
        {
          model: models.SalesTransaction,
          as: 'transactions',
          attributes: ['total_amount', 'transaction_datetime'],
          include: [
            {
              model: models.TransactionLineItem,
              as: 'lineItems',
              attributes: ['quantity']
            }
          ]
        }
      ],
      order: [['store_id', 'ASC']]
    });

    // Calculate summary statistics for each store
    const storesWithStats = stores.map(store => {
      const storeData = store.toJSON();
      let totalSales = 0;
      let totalTransactions = 0;
      let totalItems = 0;

      if (storeData.transactions) {
        totalTransactions = storeData.transactions.length;
        storeData.transactions.forEach(transaction => {
          totalSales += parseFloat(transaction.total_amount) || 0;
          if (transaction.lineItems) {
            transaction.lineItems.forEach(lineItem => {
              totalItems += parseFloat(lineItem.quantity) || 0;
            });
          }
        });
      }

      return {
        ...storeData,
        summary: {
          total_sales: totalSales,
          total_transactions: totalTransactions,
          total_items: totalItems,
          average_transaction: totalTransactions > 0 ? totalSales / totalTransactions : 0
        }
      };
    });

    res.json({
      success: true,
      data: storesWithStats
    });

  } catch (error) {
    logger.error('Error fetching stores:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/summary
 * Get overall system summary
 */
router.get('/summary', async (req, res) => {
  try {
    const [
      transactionCount,
      storeCount,
      departmentCount,
      productCount,
      promotionCount,
      rebateCount,
      loyaltyCount
    ] = await Promise.all([
      models.SalesTransaction.count(),
      models.Store.count(),
      models.Departments.count(),
      models.Pricebook.count(),
      models.PromotionsProgramDetails.count(),
      models.RebateProgramDetails.count(),
      models.TransactionLoyalty.count()
    ]);

    res.json({
      success: true,
      data: {
        transactions: transactionCount,
        stores: storeCount,
        departments: departmentCount,
        products: productCount,
        promotions: promotionCount,
        rebates: rebateCount,
        loyalty_programs: loyaltyCount
      }
    });

  } catch (error) {
    logger.error('Error fetching summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 