module.exports = (sequelize, DataTypes) => {
  const PosDeviceTerminal = sequelize.define('PosDeviceTerminal', {
    store_pos_unique_id: {
      type: DataTypes.TEXT,
      primaryKey: true,
      allowNull: false
    },
    register_id: {
      type: DataTypes.DECIMAL,
      allowNull: true
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
      },
      {
        fields: ['register_id']
      }
    ]
  });

  PosDeviceTerminal.associate = (models) => {
    PosDeviceTerminal.belongsTo(models.Store, {
      foreignKey: 'store_id',
      as: 'store'
    });
    PosDeviceTerminal.hasMany(models.SalesTransaction, {
      foreignKey: 'store_pos_unique_id',
      as: 'transactions'
    });
  };

  return PosDeviceTerminal;
}; 