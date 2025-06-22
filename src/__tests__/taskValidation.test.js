const {
  validateTaskInput,
  validateTaskUpdate,
  validateTaskTag,
  validateStatusTransition,
  getWordCount,
  getCharacterCount
} = require('../validation/taskValidation');

describe('Task Validation', () => {
  describe('validateTaskInput', () => {
    test('should validate valid task input', () => {
      const input = {
        title: 'Test Task',
        description: 'A test task description',
        priority: 'HIGH',
        tags: ['work', 'urgent']
      };
      
      const result = validateTaskInput(input);
      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Test Task');
      expect(result.data.priority).toBe('HIGH');
    });
    
    test('should fail validation for empty title', () => {
      const input = {
        title: '',
        description: 'Test description'
      };
      
      const result = validateTaskInput(input);
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Title is required');
    });
    
    test('should fail validation for title exceeding 500 characters', () => {
      const input = {
        title: 'a'.repeat(501),
        description: 'Test description'
      };
      
      const result = validateTaskInput(input);
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Title cannot exceed 500 characters');
    });
    
    test('should fail validation for description exceeding 5000 characters', () => {
      const input = {
        title: 'Test Task',
        description: 'a'.repeat(5001)
      };
      
      const result = validateTaskInput(input);
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Description cannot exceed 5000 characters');
    });
    
    test('should fail validation for more than 10 tags', () => {
      const input = {
        title: 'Test Task',
        tags: Array.from({length: 11}, (_, i) => `tag${i}`)
      };
      
      const result = validateTaskInput(input);
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Tasks cannot have more than 10 tags');
    });
  });
  
  describe('validateTaskUpdate', () => {
    test('should validate partial update input', () => {
      const input = {
        title: 'Updated Task',
        priority: 'MEDIUM'
      };
      
      const result = validateTaskUpdate(input);
      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Updated Task');
      expect(result.data.priority).toBe('MEDIUM');
    });
    
    test('should allow empty input for update', () => {
      const input = {};
      
      const result = validateTaskUpdate(input);
      expect(result.success).toBe(true);
    });
  });
  
  describe('validateTaskTag', () => {
    test('should validate valid tag input', () => {
      const input = {
        name: 'work',
        color: '#3B82F6'
      };
      
      const result = validateTaskTag(input);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('work');
      expect(result.data.color).toBe('#3B82F6');
    });
    
    test('should normalize tag name to lowercase', () => {
      const input = {
        name: 'WORK PROJECT'
      };
      
      const result = validateTaskTag(input);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('work project');
    });
    
    test('should fail validation for invalid color format', () => {
      const input = {
        name: 'work',
        color: 'invalid-color'
      };
      
      const result = validateTaskTag(input);
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Color must be a valid hex color code');
    });
    
    test('should use default color when not provided', () => {
      const input = {
        name: 'work'
      };
      
      const result = validateTaskTag(input);
      expect(result.success).toBe(true);
      expect(result.data.color).toBe('#3B82F6');
    });
  });
  
  describe('validateStatusTransition', () => {
    test('should allow valid status transitions', () => {
      expect(validateStatusTransition('PENDING', 'IN_PROGRESS').valid).toBe(true);
      expect(validateStatusTransition('IN_PROGRESS', 'COMPLETED').valid).toBe(true);
      expect(validateStatusTransition('COMPLETED', 'IN_PROGRESS').valid).toBe(true);
      expect(validateStatusTransition('CANCELLED', 'PENDING').valid).toBe(true);
    });
    
    test('should reject invalid status transitions', () => {
      const result = validateStatusTransition('PENDING', 'COMPLETED');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid status transition');
    });
    
    test('should allow same status transition', () => {
      expect(validateStatusTransition('PENDING', 'PENDING').valid).toBe(true);
    });
  });
  
  describe('utility functions', () => {
    test('getWordCount should count words correctly', () => {
      expect(getWordCount('Hello world')).toBe(2);
      expect(getWordCount('  Hello   world  ')).toBe(2);
      expect(getWordCount('')).toBe(0);
      expect(getWordCount(null)).toBe(0);
      expect(getWordCount('Single')).toBe(1);
    });
    
    test('getCharacterCount should count characters correctly', () => {
      expect(getCharacterCount('Hello world')).toBe(11);
      expect(getCharacterCount('')).toBe(0);
      expect(getCharacterCount(null)).toBe(0);
      expect(getCharacterCount('🚀')).toBe(2); // Unicode emoji
    });
  });
});