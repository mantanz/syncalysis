/**
 * Date Utility Functions
 * 
 * Provides date parsing and timezone conversion utilities for XML processors
 */

const logger = require('./logger');

/**
 * Get current UTC timestamp
 * @returns {Date} Current UTC date
 */
function getCurrentUTC() {
  return new Date();
}

/**
 * Get current UTC time as ISO string
 * @returns {string} Current UTC time in ISO format (e.g., "2025-01-27T16:37:09.061Z")
 */
function getCurrentUTCString() {
  return new Date().toISOString();
}

/**
 * Get current UTC time as formatted string
 * @param {string} format - Format string (default: "YYYY-MM-DD HH:mm:ss UTC")
 * @returns {string} Formatted UTC time string
 */
function getCurrentUTCFormatted(format = null) {
  const now = new Date();
  
  if (!format) {
    // Default format: "2025-01-27 16:37:09 UTC"
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
  }
  
  // Custom format handling
  return format
    .replace('YYYY', now.getUTCFullYear())
    .replace('MM', String(now.getUTCMonth() + 1).padStart(2, '0'))
    .replace('DD', String(now.getUTCDate()).padStart(2, '0'))
    .replace('HH', String(now.getUTCHours()).padStart(2, '0'))
    .replace('mm', String(now.getUTCMinutes()).padStart(2, '0'))
    .replace('ss', String(now.getUTCSeconds()).padStart(2, '0'))
    .replace('SSS', String(now.getUTCMilliseconds()).padStart(3, '0'));
}

/**
 * Get current UTC timestamp as Unix timestamp (seconds since epoch)
 * @returns {number} Current UTC timestamp in seconds
 */
function getCurrentUTCTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Get current UTC timestamp as Unix timestamp (milliseconds since epoch)
 * @returns {number} Current UTC timestamp in milliseconds
 */
function getCurrentUTCTimestampMs() {
  return Date.now();
}

/**
 * Parse date string and convert to UTC timezone
 * @param {string|Date} dateString - Date string or Date object to parse
 * @returns {Date|null} UTC Date object or null if parsing fails
 */
function parseDateTime(dateString) {
  if (!dateString) return null;
  try {
    let date;
    
    if (typeof dateString === 'string') {
      // Handle ISO format with timezone info
      if (dateString.includes('T')) {
        // If it already has timezone info, parse it directly
        if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-')) {
          date = new Date(dateString);
        } else {
          // No timezone info, treat as local and convert to UTC
          date = new Date(dateString);
          date = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        }
      } else {
        // Non-ISO format, parse as local and convert to UTC
        date = new Date(dateString);
        date = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
      }
    } else {
      // Non-string input, convert to UTC
      date = new Date(dateString);
      date = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    }
    
    return date;
  } catch (error) {
    logger.warn(`Failed to parse date: ${dateString}`);
    return null;
  }
}

/**
 * Parse date string and keep as local timezone (original behavior)
 * @param {string|Date} dateString - Date string or Date object to parse
 * @returns {Date|null} Local Date object or null if parsing fails
 */
function parseDateTimeLocal(dateString) {
  if (!dateString) return null;
  try {
    // Handle various date formats without timezone conversion
    if (typeof dateString === 'string') {
      // If it's an ISO format with timezone info, parse it as local time
      if (dateString.includes('T')) {
        // Remove timezone indicators to treat as local time
        const localDateString = dateString.replace(/[Zz]$/, '').replace(/[+-]\d{2}:?\d{2}$/, '');
        return new Date(localDateString);
      }
      // For other formats, parse as local time
      return new Date(dateString);
    }
    return new Date(dateString);
  } catch (error) {
    logger.warn(`Failed to parse date: ${dateString}`);
    return null;
  }
}

/**
 * Format date to ISO string in UTC
 * @param {Date} date - Date object to format
 * @returns {string} ISO string in UTC
 */
function formatDateTimeUTC(date) {
  if (!date) return null;
  try {
    return date.toISOString();
  } catch (error) {
    logger.warn(`Failed to format date: ${date}`);
    return null;
  }
}

/**
 * Convert local time to UTC
 * @param {Date} localDate - Local date object
 * @returns {Date} UTC date object
 */
function convertToUTC(localDate) {
  if (!localDate) return null;
  try {
    return new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));
  } catch (error) {
    logger.warn(`Failed to convert to UTC: ${localDate}`);
    return null;
  }
}

/**
 * Convert UTC time to local time
 * @param {Date} utcDate - UTC date object
 * @returns {Date} Local date object
 */
function convertFromUTC(utcDate) {
  if (!utcDate) return null;
  try {
    return new Date(utcDate.getTime() + (utcDate.getTimezoneOffset() * 60000));
  } catch (error) {
    logger.warn(`Failed to convert from UTC: ${utcDate}`);
    return null;
  }
}

function parseDateTimeWithOffset(dateString) {
  if (!dateString) return null;
  
  // Parse the date string and return as Date object
  // This preserves the timezone offset information
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date string: ${dateString}`);
    return null;
  }
  
  return date;
}

function parseDateTimePreserveFormat(dateString) {
  if (!dateString) return null;
  
  // If it's already in the format we want, return it as is
  if (typeof dateString === 'string' && dateString.includes('T') && (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-'))) {
    return dateString;
  }
  
  // For other formats, parse and return in ISO format with timezone
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date string: ${dateString}`);
    return null;
  }
  
  // Return in ISO format with timezone offset
  return date.toISOString().replace('Z', `-${String(date.getTimezoneOffset() / 60).padStart(2, '0')}:${String(date.getTimezoneOffset() % 60).padStart(2, '0')}`);
}

module.exports = {
  // Current time functions
  getCurrentUTC,
  getCurrentUTCString,
  getCurrentUTCFormatted,
  getCurrentUTCTimestamp,
  getCurrentUTCTimestampMs,
  
  // Date parsing functions
  parseDateTime,
  parseDateTimeLocal,
  formatDateTimeUTC,
  
  // Timezone conversion functions
  convertToUTC,
  convertFromUTC,
  parseDateTimeWithOffset,
  parseDateTimePreserveFormat
}; 