module.exports = (sequelize, DataTypes) => {
  const TransactionEventLog = sequelize.define('TransactionEventLog', {
    transaction_event_log_id: {
      type: DataTypes.DECIMAL,
      primaryKey: true,
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
    customer_dob_entry: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    duration: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    event_type: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    global_unique_identifier: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    verifone_transaction_sn: {
      type: DataTypes.DECIMAL,
      allowNull: true
    }
  }, {
    tableName: 'transaction_event_log',
    timestamps: false
  });

  // TransactionEventLog.associate = (models) => {
  //   TransactionEventLog.belongsTo(models.SalesTransaction, {
  //     foreignKey: 'transaction_id',
  //     as: 'transaction'
  //   });
  // };

  return TransactionEventLog;
}; 