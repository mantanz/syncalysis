module.exports = (sequelize, DataTypes) => {
  const Departments = sequelize.define('Departments', {
    department_id: {
      type: DataTypes.DECIMAL,
      primaryKey: true,
      allowNull: false
    },
    department_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    department_type: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_car_wash_department: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    is_fuel_department: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    is_lottery_department: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    }
  }, {
    tableName: 'departments',
    timestamps: false
  });

  Departments.associate = (models) => {
    Departments.hasMany(models.Pricebook, {
      foreignKey: 'department_id',
      as: 'products'
    });
  };

  return Departments;
}; 