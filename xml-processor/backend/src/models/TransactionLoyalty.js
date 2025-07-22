module.exports = (sequelize, DataTypes) => {
  const TransactionLoyalty = sequelize.define('TransactionLoyalty', {
    loyalty_transaction_uuid: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    transaction_id: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    sales_transaction_unique_id: {
      type: DataTypes.TEXT,
      allowNull: true,
      references: {
        model: 'sales_transaction',
        key: 'sales_transaction_unique_id'
      }
    },
    loyalty_account_number: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    loyalty_auto_discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    loyalty_customer_discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    loyalty_entry_method: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    loyalty_sub_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    loyalty_program_name: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'transaction_loyalty',
    timestamps: false,
    indexes: [
      {
        fields: ['transaction_id']
      },
      {
        fields: ['sales_transaction_unique_id']
      }
    ]
  });

  TransactionLoyalty.associate = (models) => {
    TransactionLoyalty.belongsTo(models.SalesTransaction, {
      foreignKey: 'sales_transaction_unique_id',
      as: 'transaction'
    });
  };

  return TransactionLoyalty;
}; 