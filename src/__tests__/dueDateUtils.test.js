const { DueDateManager } = require('../utils/dueDateUtils');

describe('DueDateManager', () => {
  describe('formatDueDate', () => {
    test('should format date with timezone', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = DueDateManager.formatDueDate(date, 'America/New_York');
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
    });
    
    test('should handle invalid timezone gracefully', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = DueDateManager.formatDueDate(date, 'Invalid/Timezone');
      expect(formatted).toBeTruthy(); // Should fallback to UTC
    });
    
    test('should return null for null date', () => {
      const formatted = DueDateManager.formatDueDate(null, 'UTC');
      expect(formatted).toBeNull();
    });
  });
  
  describe('isOverdue', () => {
    test('should return true for past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(DueDateManager.isOverdue(pastDate)).toBe(true);
    });
    
    test('should return false for future dates', () => {
      const futureDate = new Date('2030-01-01');
      expect(DueDateManager.isOverdue(futureDate)).toBe(false);
    });
    
    test('should return false for null date', () => {
      expect(DueDateManager.isOverdue(null)).toBe(false);
    });
  });
  
  describe('getDueDateStatus', () => {
    test('should return OVERDUE for past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(DueDateManager.getDueDateStatus(pastDate)).toBe('OVERDUE');
    });
    
    test('should return DUE_TODAY for today', () => {
      const today = new Date();
      expect(DueDateManager.getDueDateStatus(today)).toBe('DUE_TODAY');
    });
    
    test('should return DUE_SOON for dates within 7 days', () => {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      expect(DueDateManager.getDueDateStatus(threeDaysFromNow)).toBe('DUE_SOON');
    });
    
    test('should return FUTURE for dates more than 7 days away', () => {
      const tenDaysFromNow = new Date();
      tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
      expect(DueDateManager.getDueDateStatus(tenDaysFromNow)).toBe('FUTURE');
    });
    
    test('should return null for null date', () => {
      expect(DueDateManager.getDueDateStatus(null)).toBeNull();
    });
  });
  
  describe('isValidTimezone', () => {
    test('should return true for valid timezones', () => {
      expect(DueDateManager.isValidTimezone('America/New_York')).toBe(true);
      expect(DueDateManager.isValidTimezone('Europe/London')).toBe(true);
      expect(DueDateManager.isValidTimezone('UTC')).toBe(true);
    });
    
    test('should return false for invalid timezones', () => {
      expect(DueDateManager.isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(DueDateManager.isValidTimezone('')).toBe(false);
      expect(DueDateManager.isValidTimezone(null)).toBe(false);
    });
  });
  
  describe('toUTC and fromUTC', () => {
    test('should handle date conversion', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const utcDate = DueDateManager.toUTC(date, 'America/New_York');
      expect(utcDate).toBeInstanceOf(Date);
      
      const localDate = DueDateManager.fromUTC(utcDate, 'America/New_York');
      expect(localDate).toBeInstanceOf(Date);
    });
    
    test('should handle null dates', () => {
      expect(DueDateManager.toUTC(null)).toBeNull();
      expect(DueDateManager.fromUTC(null)).toBeNull();
    });
    
    test('should handle string dates', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const utcDate = DueDateManager.toUTC(dateString);
      expect(utcDate).toBeInstanceOf(Date);
    });
  });
});