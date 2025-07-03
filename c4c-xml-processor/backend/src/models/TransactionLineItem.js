module.exports = (sequelize, DataTypes) => {
  const TransactionLineItem = sequelize.define('TransactionLineItem', {
    line_item_uuid: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    transaction_id: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      references: {
        model: 'sales_transaction',
        key: 'transaction_id'
      }
    },
    upc_id: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      references: {
        model: 'pricebook',
        key: 'upc_id'
      }
    },
    category_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category_number: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    department: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    department_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    department_type: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    has_birthday_verification: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    has_category_override: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    has_department_override: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    has_loyalty_line_discount: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    has_mix_match_promotion: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    has_plu_override: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    is_ebt_eligible: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    is_plu_item: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    line_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    network_code: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    quantity: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    transaction_line_type: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    upc_description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    upc_entry_type: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    upc_modifier: {
      type: DataTypes.DECIMAL,
      allowNull: true
    }
  }, {
    tableName: 'transaction_line_item',
    timestamps: false,
    indexes: [
      {
        fields: ['transaction_id']
      },
      {
        fields: ['upc_id']
      }
    ]
  });

  TransactionLineItem.associate = (models) => {
    TransactionLineItem.belongsTo(models.SalesTransaction, {
      foreignKey: 'transaction_id',
      as: 'transaction'
    });
    TransactionLineItem.belongsTo(models.Pricebook, {
      foreignKey: 'upc_id',
      as: 'product'
    });
    TransactionLineItem.hasMany(models.TransactionLineItemTax, {
      foreignKey: 'line_item_uuid',
      as: 'taxes'
    });
    TransactionLineItem.hasMany(models.LoyaltyLineItems, {
      foreignKey: 'line_item_uuid',
      as: 'loyaltyDiscounts'
    });
    TransactionLineItem.hasMany(models.PromotionsLineItem, {
      foreignKey: 'line_item_uuid',
      as: 'promotions'
    });
  };

  return TransactionLineItem;
}; 