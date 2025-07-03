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
    promotion_description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    promotion_type: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    discount_percentage: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true
    },
    minimum_quantity: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    maximum_quantity: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    },
    promotion_code: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mix_match_group_id: {
      type: DataTypes.DECIMAL,
      allowNull: true
    }
  }, {
    tableName: 'promotions_program_details',
    timestamps: false
  });

  PromotionsProgramDetails.associate = (models) => {
    PromotionsProgramDetails.hasMany(models.PromotionsLineItem, {
      foreignKey: 'promotion_id',
      as: 'lineItems'
    });
  };

  return PromotionsProgramDetails;
}; 