module.exports = (sequelize, DataTypes) => {
  const PromotionsProgramDetails = sequelize.define('PromotionsProgramDetails', {
    promotion_id: {
      type: DataTypes.DECIMAL,
      primaryKey: true,
      allowNull: false
    },
    promotion_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mfg_multi_pack_flag: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    outlet_multi_pack_flag: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    tob_promo_flag: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    effective_end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    effective_start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    manufacturer_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mfg_multi_pack_qty: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    mfg_promo_desc: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    outlet_multi_pack_qty: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    promo_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    promo_desc: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    promo_percent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    promotion_discount_method: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    provider_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    store_pays_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    store_pays_disc_type: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    store_pays_percent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    vendor_pays_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    vendor_pays_disc_type: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    vendor_pays_percent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    }
  }, {
    tableName: 'promotions_program_details',
    timestamps: false,
    indexes: [
      {
        name: 'idx_promotions_dates',
        fields: ['effective_start_date', 'effective_end_date']
      }
    ]
  });

  PromotionsProgramDetails.associate = (models) => {
    PromotionsProgramDetails.hasMany(models.PromotionsLineItem, {
      foreignKey: 'promotion_id',
      as: 'lineItems'
    });
  };

  return PromotionsProgramDetails;
}; 