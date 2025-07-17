module.exports = (sequelize, DataTypes) => {
  const PromotionUPCLinkage = sequelize.define('PromotionUPCLinkage', {
    linkage_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    promotion_id: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      references: {
        model: 'promotions_program_details',
        key: 'promotion_id'
      }
    },
    upc_id: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      references: {
        model: 'pricebook',
        key: 'upc_id'
      }
    },
    created_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'promotion_upc_linkage',
    timestamps: false,
    indexes: [
      {
        name: 'idx_promotion_upc_linkage_promotion',
        fields: ['promotion_id']
      },
      {
        name: 'idx_promotion_upc_linkage_upc',
        fields: ['upc_id']
      },
      {
        name: 'idx_promotion_upc_linkage_unique',
        fields: ['promotion_id', 'upc_id'],
        unique: true
      }
    ]
  });

  PromotionUPCLinkage.associate = (models) => {
    PromotionUPCLinkage.belongsTo(models.PromotionsProgramDetails, {
      foreignKey: 'promotion_id',
      as: 'promotion'
    });
    PromotionUPCLinkage.belongsTo(models.Pricebook, {
      foreignKey: 'upc_id',
      as: 'product'
    });
  };

  return PromotionUPCLinkage;
}; 