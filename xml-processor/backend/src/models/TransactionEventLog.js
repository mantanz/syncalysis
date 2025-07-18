module.exports = (sequelize, DataTypes) => {
  const TransactionEventLog = sequelize.define('TransactionEventLog', {
    transaction_event_log_id: {
      type: DataTypes.TEXT,
      primaryKey: true,
      allowNull: false
    },
    duration: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    event_type: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    verifone_transaction_serial_number: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    customer_dob_entry_method: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    customer_dob: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    customer_age: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    terminal_serial_number: {
      type: DataTypes.DECIMAL,
      allowNull: true
    }
  }, {
    tableName: 'transaction_event_log',
    timestamps: false
  });

  return TransactionEventLog;
}; 