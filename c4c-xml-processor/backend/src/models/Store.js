module.exports = (sequelize, DataTypes) => {
  const Store = sequelize.define('Store', {
    store_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    store_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    address2: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    state: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    zip_code: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'store',
    timestamps: false
  });

  Store.associate = (models) => {
    Store.hasMany(models.PosDeviceTerminal, {
      foreignKey: 'store_id',
      as: 'terminals'
    });
    Store.hasMany(models.SalesTransaction, {
      foreignKey: 'store_id',
      as: 'transactions'
    });
  };

  return Store;
}; 