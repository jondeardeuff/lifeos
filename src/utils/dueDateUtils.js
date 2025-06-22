/**
 * Due date handling utilities with timezone support
 */

class DueDateManager {
  /**
   * Formats due date according to user's timezone
   * @param {Date} dueDate - The due date
   * @param {string} timezone - User's timezone
   * @returns {string} Formatted date string
   */
  static formatDueDate(dueDate, timezone) {
    if (!dueDate) return null;
    
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(dueDate));
    } catch (error) {
      // Fallback to UTC if timezone is invalid
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(dueDate));
    }
  }
  
  /**
   * Checks if a task is overdue
   * @param {Date} dueDate - The due date
   * @returns {boolean} True if overdue
   */
  static isOverdue(dueDate) {
    if (!dueDate) return false;
    return new Date() > new Date(dueDate);
  }
  
  /**
   * Gets the due date status category
   * @param {Date} dueDate - The due date
   * @returns {string} Status category
   */
  static getDueDateStatus(dueDate) {
    if (!dueDate) return null;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(dueDate);
    const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
    
    if (taskDay < today) return 'OVERDUE';
    if (taskDay.getTime() === today.getTime()) return 'DUE_TODAY';
    
    // Check if due within 7 days
    const weekFromToday = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (taskDay <= weekFromToday) return 'DUE_SOON';
    
    return 'FUTURE';
  }
  
  /**
   * Converts date to UTC for database storage
   * @param {Date} date - Local date
   * @param {string} timezone - User's timezone
   * @returns {Date} UTC date
   */
  static toUTC(date, timezone) {
    if (!date) return null;
    
    try {
      // If date is already a Date object, return it
      if (date instanceof Date) return date;
      
      // Parse the date string
      return new Date(date);
    } catch (error) {
      console.error('Error converting date to UTC:', error);
      return null;
    }
  }
  
  /**
   * Converts UTC date to local timezone
   * @param {Date} utcDate - UTC date from database
   * @param {string} timezone - User's timezone
   * @returns {Date} Local date
   */
  static fromUTC(utcDate, timezone) {
    if (!utcDate) return null;
    
    try {
      return new Date(utcDate);
    } catch (error) {
      console.error('Error converting UTC date to local:', error);
      return null;
    }
  }
  
  /**
   * Validates if a timezone string is valid
   * @param {string} timezone - Timezone string
   * @returns {boolean} True if valid
   */
  static isValidTimezone(timezone) {
    if (!timezone) return false;
    
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = { DueDateManager };