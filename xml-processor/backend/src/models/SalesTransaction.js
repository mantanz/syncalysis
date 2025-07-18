module.exports = (sequelize, DataTypes) => {
  const SalesTransaction = sequelize.define('SalesTransaction', {
    sales_transaction_unique_id: {
      type: DataTypes.TEXT,
      primaryKey: true,
      allowNull: false
    },
    transaction_id: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    store_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'store',
        key: 'store_id'
      }
    },
    register_id: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      references: {
        model: 'pos_device_terminal',
        key: 'register_id'
      }
    },
    transaction_event_log_id: {
      type: DataTypes.TEXT,
      allowNull: true,
      references: {
        model: 'transaction_event_log',
        key: 'transaction_event_log_id'
      }
    },
    cashier_session: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    employee_id: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    employee_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cashier_system_id: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    food_stamp_eligible_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    grand_totalizer: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    total_no_tax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    total_tax_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    transaction_datetime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    transaction_type: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    original_register_id: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    original_transaction_id: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    is_fuel_prepay: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    is_fuel_prepay_completion: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    is_rollback: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    is_suspended: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    was_recalled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    }
  }, {
    tableName: 'sales_transaction',
    timestamps: false,
    indexes: [
      {
        fields: ['store_id']
      },
      {
        fields: ['transaction_datetime']
      },
      {
        fields: ['transaction_id']
      }
    ]
  });

  SalesTransaction.associate = (models) => {
    SalesTransaction.belongsTo(models.Store, {
      foreignKey: 'store_id',
      as: 'store'
    });
    SalesTransaction.belongsTo(models.PosDeviceTerminal, {
      foreignKey: 'register_id',
      as: 'terminal'
    });
    SalesTransaction.belongsTo(models.PosDeviceTerminal, {
      foreignKey: 'original_register_id',
      as: 'original_terminal'
    });
    SalesTransaction.belongsTo(models.TransactionEventLog, {
      foreignKey: 'transaction_event_log_id',
      as: 'eventLog'
    });
    SalesTransaction.hasMany(models.TransactionLineItem, {
      foreignKey: 'sales_transaction_unique_id',
      as: 'lineItems'
    });
    SalesTransaction.hasMany(models.Payment, {
      foreignKey: 'sales_transaction_unique_id',
      as: 'payments'
    });
    SalesTransaction.hasMany(models.TransactionLineItemTax, {
      foreignKey: 'sales_transaction_unique_id',
      as: 'lineItemsTax'
    });
    SalesTransaction.hasMany(models.TransactionLoyalty, {
      foreignKey: 'sales_transaction_unique_id',
      as: 'loyaltyPrograms'
    });
    SalesTransaction.hasMany(models.LoyaltyLineItems, {
      foreignKey: 'sales_transaction_unique_id',
      as: 'loyaltyLineItems'
    });
  };

  return SalesTransaction;
}; 