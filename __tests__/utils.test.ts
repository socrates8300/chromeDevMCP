import { formatHeaders, filterSensitiveData, batchMessages } from '../utils';
import { MCPConfig } from '../types';

describe('Utils', () => {
  const testConfig: MCPConfig = {
    port: 8765,
    maxStoredRequests: 500,
    sensitiveHeaders: ['cookie', 'set-cookie', 'authorization', 'proxy-authorization', 'x-csrf-token'],
    sensitiveFormFields: ['password', 'token', 'auth', 'key', 'secret'],
    enabled: true,
    captureConsole: true,
    captureNetwork: true
  };

  describe('formatHeaders', () => {
    it('should format headers correctly', () => {
      const headers = [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Authorization', value: 'Bearer token' }
      ];
      
      const formatted = formatHeaders(headers);
      expect(formatted).toEqual([
        { name: 'content-type', value: 'application/json' },
        { name: 'authorization', value: 'Bearer token' }
      ]);
    });
  });

  describe('filterSensitiveData', () => {
    it('should filter sensitive data', () => {
      const data = {
        username: 'test',
        password: 'secret123',
        auth_token: 'abc123',
        nested: {
          apiKey: 'key123',
          secret: 'secret456'
        }
      };

      const filtered = filterSensitiveData(data, testConfig);
      expect(filtered).toEqual({
        username: 'test',
        password: '[FILTERED]',
        auth_token: '[FILTERED]',
        nested: {
          apiKey: '[FILTERED]',
          secret: '[FILTERED]'
        }
      });
    });
  });

  describe('batchMessages', () => {
    it('should batch messages correctly', () => {
      const messages = Array(150).fill('test');
      const batches = batchMessages(messages, 50);
      expect(batches.length).toBe(3);
      expect(batches[0].length).toBe(50);
      expect(batches[1].length).toBe(50);
      expect(batches[2].length).toBe(50);
    });

    it('should handle small batches', () => {
      const messages = ['a', 'b', 'c'];
      const batches = batchMessages(messages, 2);
      expect(batches.length).toBe(2);
      expect(batches[0].length).toBe(2);
      expect(batches[1].length).toBe(1);
    });
  });
});
