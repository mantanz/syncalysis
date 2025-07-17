module.exports = (sequelize, DataTypes) => {
  const TransactionLineItemTax = sequelize.define('TransactionLineItemTax', {
    line_item_tax_uuid: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    line_item_uuid: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'transaction_line_item',
        key: 'line_item_uuid'
      }
    },
    transaction_id: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      references: {
        model: 'sales_transaction',
        key: 'transaction_id'
      }
    },
    tax_line_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    tax_line_category: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tax_line_rate: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true
    },
    tax_line_sys_id: {
      type: DataTypes.DECIMAL,
      allowNull: true
    }
  }, {
    tableName: 'transaction_line_item_tax',
    timestamps: false,
    indexes: [
      {
        fields: ['line_item_uuid']
      },
      {
        fields: ['transaction_id']
      }
    ]
  });

  TransactionLineItemTax.associate = (models) => {
    TransactionLineItemTax.belongsTo(models.TransactionLineItem, {
      foreignKey: 'line_item_uuid',
      as: 'lineItem'
    });
    TransactionLineItemTax.belongsTo(models.SalesTransaction, {
      foreignKey: 'transaction_id',
      as: 'transaction'
    });
  };

  return TransactionLineItemTax;
}; 