module.exports = (sequelize, DataTypes) => {
  const LoyaltyLineItems = sequelize.define('LoyaltyLineItems', {
    line_loyalty_uuid: {
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
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    quantity_applied: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    tax_credit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    }
  }, {
    tableName: 'loyalty_line_items',
    timestamps: false
  });

  LoyaltyLineItems.associate = (models) => {
    LoyaltyLineItems.belongsTo(models.TransactionLineItem, {
      foreignKey: 'line_item_uuid',
      as: 'lineItem'
    });
    LoyaltyLineItems.belongsTo(models.SalesTransaction, {
      foreignKey: 'sales_transaction_unique_id',
      as: 'transaction'
    });
  };

  return LoyaltyLineItems;
}; 