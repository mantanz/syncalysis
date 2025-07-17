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
    },
    cost_avail_flag: {
      type: DataTypes.CHAR(1),
      allowNull: false,
      defaultValue: 'N'
    },
    retail_price_avail_flag: {
      type: DataTypes.CHAR(1),
      allowNull: false,
      defaultValue: 'N'
    },
    upc_source: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Source of UPC data: "pricebook" for pricebook reports, transaction_id for XML files'
    },
    created_by: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'Gunjan'
    },
    creation_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    modified_by: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    },
    modified_date: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    }
  }, {
    tableName: 'pricebook',
    timestamps: false,
    indexes: [
      {
        fields: ['department_id']
      },
      {
        fields: ['upc_source']
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