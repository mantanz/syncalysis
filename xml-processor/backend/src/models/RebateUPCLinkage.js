module.exports = (sequelize, DataTypes) => {
  const RebateUPCLinkage = sequelize.define('RebateUPCLinkage', {
    rebate_id: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      references: {
        model: 'rebate_program_details',
        key: 'rebate_id'
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
    tableName: 'rebate_upc_linkage',
    timestamps: false,
    indexes: [
      {
        name: 'idx_rebate_upc_linkage_rebate',
        fields: ['rebate_id']
      },
      {
        name: 'idx_rebate_upc_linkage_upc',
        fields: ['upc_id']
      },
      {
        name: 'idx_rebate_upc_linkage_unique',
        fields: ['rebate_id', 'upc_id'],
        unique: true
      }
    ]
  });

  RebateUPCLinkage.associate = (models) => {
    RebateUPCLinkage.belongsTo(models.RebateProgramDetails, {
      foreignKey: 'rebate_id',
      as: 'rebate'
    });
    RebateUPCLinkage.belongsTo(models.Pricebook, {
      foreignKey: 'upc_id',
      as: 'product'
    });
  };

  return RebateUPCLinkage;
}; 