import { describe, it, expect } from 'vitest';
import { validateUrlParam } from '@/lib/validation';

describe('validateUrlParam', () => {
  describe('valid inputs', () => {
    it('should accept simple alphanumeric strings', () => {
      expect(validateUrlParam('user123')).toBe('user123');
      expect(validateUrlParam('test')).toBe('test');
    });

    it('should accept strings with hyphens', () => {
      expect(validateUrlParam('my-plugin')).toBe('my-plugin');
      expect(validateUrlParam('agent-mart')).toBe('agent-mart');
    });

    it('should accept strings with underscores', () => {
      expect(validateUrlParam('my_plugin')).toBe('my_plugin');
      expect(validateUrlParam('test_123')).toBe('test_123');
    });

    it('should accept strings with dots', () => {
      expect(validateUrlParam('file.ts')).toBe('file.ts');
      expect(validateUrlParam('config.json')).toBe('config.json');
    });

    it('should handle array input and return first element', () => {
      expect(validateUrlParam(['first', 'second'])).toBe('first');
    });

    it('should decode URL-encoded characters', () => {
      expect(validateUrlParam('my-plugin')).toBe('my-plugin');
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty string', () => {
      expect(validateUrlParam('')).toBeNull();
    });

    it('should reject null and undefined', () => {
      expect(validateUrlParam(null as unknown as string)).toBeNull();
      expect(validateUrlParam(undefined)).toBeNull();
    });

    it('should reject path traversal attempts', () => {
      expect(validateUrlParam('../parent')).toBeNull();
      expect(validateUrlParam('..%2Fparent')).toBeNull();
      expect(validateUrlParam('foo/bar')).toBeNull();
      expect(validateUrlParam('foo%2Fbar')).toBeNull();
    });

    it('should reject backslash path traversal', () => {
      expect(validateUrlParam('foo\\bar')).toBeNull();
      expect(validateUrlParam('..\\parent')).toBeNull();
    });

    it('should reject null bytes', () => {
      expect(validateUrlParam('foo\0bar')).toBeNull();
      expect(validateUrlParam('foo%00bar')).toBeNull();
    });

    it('should reject strings exceeding max length', () => {
      const longString = 'a'.repeat(300);
      expect(validateUrlParam(longString)).toBeNull();
    });

    it('should reject special characters', () => {
      expect(validateUrlParam('foo@bar')).toBeNull();
      expect(validateUrlParam('foo#bar')).toBeNull();
      expect(validateUrlParam('foo$bar')).toBeNull();
      expect(validateUrlParam('foo!bar')).toBeNull();
      expect(validateUrlParam('foo bar')).toBeNull();
    });

    it('should reject encoded path traversal', () => {
      expect(validateUrlParam('%2e%2e%2fparent')).toBeNull();
    });

    it('should reject invalid URL encoding', () => {
      expect(validateUrlParam('%ZZ')).toBeNull();
      expect(validateUrlParam('%')).toBeNull();
    });

    it('should reject empty array', () => {
      expect(validateUrlParam([])).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should accept single character', () => {
      expect(validateUrlParam('a')).toBe('a');
      expect(validateUrlParam('1')).toBe('1');
    });

    it('should accept max length minus one', () => {
      const validLength = 'a'.repeat(256);
      expect(validateUrlParam(validLength)).toBe(validLength);
    });

    it('should reject exactly over max length', () => {
      const tooLong = 'a'.repeat(257);
      expect(validateUrlParam(tooLong)).toBeNull();
    });

    it('should handle GitHub-style usernames and repos', () => {
      expect(validateUrlParam('anthropic')).toBe('anthropic');
      expect(validateUrlParam('claude-code')).toBe('claude-code');
      expect(validateUrlParam('my.project')).toBe('my.project');
      expect(validateUrlParam('user_repo-2')).toBe('user_repo-2');
    });
  });
});
