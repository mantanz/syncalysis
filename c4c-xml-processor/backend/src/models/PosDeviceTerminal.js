module.exports = (sequelize, DataTypes) => {
  const PosDeviceTerminal = sequelize.define('PosDeviceTerminal', {
    register_id: {
      type: DataTypes.DECIMAL,
      primaryKey: true,
      allowNull: false
    },
    store_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'store',
        key: 'store_id'
      }
    },
    device_type: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'pos_device_terminal',
    timestamps: false,
    indexes: [
      {
        fields: ['store_id']
      }
    ]
  });

  PosDeviceTerminal.associate = (models) => {
    PosDeviceTerminal.belongsTo(models.Store, {
      foreignKey: 'store_id',
      as: 'store'
    });
    PosDeviceTerminal.hasMany(models.SalesTransaction, {
      foreignKey: 'register_id',
      as: 'transactions'
    });
  };

  return PosDeviceTerminal;
}; 