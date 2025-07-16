module.exports = (sequelize, DataTypes) => {
  const PromotionsLineItem = sequelize.define('PromotionsLineItem', {
    line_item_promo_uuid: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    promotion_id: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    line_item_uuid: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'transaction_line_item',
        key: 'line_item_uuid'
      }
    },
    match_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    match_quantity: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    mix_group_id: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    promo_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    promotion_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    promotion_type: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'promotions_line_item',
    timestamps: false
  });

  PromotionsLineItem.associate = (models) => {
    PromotionsLineItem.belongsTo(models.TransactionLineItem, {
      foreignKey: 'line_item_uuid',
      as: 'lineItem'
    });
    PromotionsLineItem.belongsTo(models.PromotionsProgramDetails, {
      foreignKey: 'promotion_id',
      as: 'promotionProgram'
    });
  };

  return PromotionsLineItem;
}; 