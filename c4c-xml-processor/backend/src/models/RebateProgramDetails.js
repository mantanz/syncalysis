module.exports = (sequelize, DataTypes) => {
  const RebateProgramDetails = sequelize.define('RebateProgramDetails', {
    rebate_id: {
      type: DataTypes.DECIMAL,
      primaryKey: true,
      allowNull: false
    },
    rebate_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rebate_description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rebate_type: {
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
    rebate_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    rebate_percentage: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true
    },
    minimum_purchase_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    maximum_rebate_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    },
    rebate_code: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    vendor_id: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    product_category: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'rebate_program_details',
    timestamps: false
  });

  RebateProgramDetails.associate = (models) => {
    // Add associations when rebate line items are created
  };

  return RebateProgramDetails;
}; 