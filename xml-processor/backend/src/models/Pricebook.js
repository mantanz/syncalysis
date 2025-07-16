module.exports = (sequelize, DataTypes) => {
  const Pricebook = sequelize.define('Pricebook', {
    upc_id: {
      type: DataTypes.DECIMAL,
      primaryKey: true,
      allowNull: false
    },
    department_id: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'department_id'
      }
    },
    upc_description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    retail_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    }
  }, {
    tableName: 'pricebook',
    timestamps: false,
    indexes: [
      {
        fields: ['department_id']
      }
    ]
  });

  Pricebook.associate = (models) => {
    Pricebook.belongsTo(models.Departments, {
      foreignKey: 'department_id',
      as: 'department'
    });
    Pricebook.hasMany(models.TransactionLineItem, {
      foreignKey: 'upc_id',
      as: 'lineItems'
    });
  };

  return Pricebook;
}; 