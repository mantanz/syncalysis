/**
 * Simple Logger Utility
 * 
 * Provides logging functionality for the XML processors
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (data) {
      logMessage += ` | Data: ${JSON.stringify(data)}`;
    }
    
    return logMessage;
  }

  writeToFile(level, message) {
    const logFile = path.join(this.logDir, `${level}.log`);
    const formattedMessage = this.formatMessage(level, message) + '\n';
    
    fs.appendFileSync(logFile, formattedMessage);
  }

  info(message, data = null) {
    const logMessage = this.formatMessage('info', message, data);
    console.log(logMessage);
    this.writeToFile('info', message);
  }

  error(message, error = null) {
    const errorData = error ? {
      message: error.message,
      stack: error.stack
    } : null;
    
    const logMessage = this.formatMessage('error', message, errorData);
    console.error(logMessage);
    this.writeToFile('error', message);
  }

  warn(message, data = null) {
    const logMessage = this.formatMessage('warn', message, data);
    console.warn(logMessage);
    this.writeToFile('warn', message);
  }

  debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = this.formatMessage('debug', message, data);
      console.log(logMessage);
      this.writeToFile('debug', message);
    }
  }
}

module.exports = new Logger(); 