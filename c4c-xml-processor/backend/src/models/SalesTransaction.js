module.exports = (sequelize, DataTypes) => {
  const SalesTransaction = sequelize.define('SalesTransaction', {
    transaction_id: {
      type: DataTypes.DECIMAL,
      primaryKey: true,
      allowNull: false
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
      type: DataTypes.DECIMAL,
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
    food_stamp_eligible_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    grand_totalizer: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    has_transaction_id: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
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
    transaction_recall: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    transaction_type: {
      type: DataTypes.TEXT,
      allowNull: true
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
    SalesTransaction.belongsTo(models.TransactionEventLog, {
      foreignKey: 'transaction_event_log_id',
      as: 'eventLog'
    });
    SalesTransaction.hasMany(models.TransactionLineItem, {
      foreignKey: 'transaction_id',
      as: 'lineItems'
    });
    SalesTransaction.hasMany(models.Payment, {
      foreignKey: 'transaction_id',
      as: 'payments'
    });
    SalesTransaction.hasMany(models.TransactionLoyalty, {
      foreignKey: 'transaction_id',
      as: 'loyaltyPrograms'
    });
  };

  return SalesTransaction;
}; 