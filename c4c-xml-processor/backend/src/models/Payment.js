module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    payment_uuid: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    transaction_id: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      references: {
        model: 'sales_transaction',
        key: 'transaction_id'
      }
    },
    authorization_code: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    cc_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mop_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    mop_code: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    payment_entry_method: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payment_timestamp: {
      type: DataTypes.DATE,
      allowNull: true
    },
    payment_type: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'payment',
    timestamps: false,
    indexes: [
      {
        fields: ['transaction_id']
      }
    ]
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.SalesTransaction, {
      foreignKey: 'transaction_id',
      as: 'transaction'
    });
  };

  return Payment;
}; 