import 'jest';
import * as dbModule from '../src/background/db';

// Mock the underlying db module
jest.mock('../src/db', () => ({
  queryConsoleLogs: jest.fn().mockResolvedValue([]),
  queryNetworkRequests: jest.fn().mockResolvedValue([]),
  saveConsoleLog: jest.fn().mockResolvedValue(true),
  saveNetworkRequest: jest.fn().mockResolvedValue(true)
}));

describe('Database Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export queryConsoleLogs function', () => {
    expect(typeof dbModule.queryConsoleLogs).toBe('function');
  });

  it('should export queryNetworkRequests function', () => {
    expect(typeof dbModule.queryNetworkRequests).toBe('function');
  });

  it('should export saveConsoleLog function', () => {
    expect(typeof dbModule.saveConsoleLog).toBe('function');
  });

  it('should export saveNetworkRequest function', () => {
    expect(typeof dbModule.saveNetworkRequest).toBe('function');
  });

  it('should save console logs', async () => {
    const mockLog = {
      id: 'test-id',
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Test error message',
      url: 'http://example.com',
      tabId: 1
    };
    
    await dbModule.saveConsoleLog(mockLog);
    
    // Get the underlying db module
    const underlyingDb = require('../src/db');
    expect(underlyingDb.saveConsoleLog).toHaveBeenCalledWith(mockLog);
  });

  it('should save network requests', async () => {
    const mockRequest = {
      requestId: 'req-1',
      url: 'http://api.example.com/data',
      method: 'GET'
    };
    
    await dbModule.saveNetworkRequest(mockRequest);
    
    // Get the underlying db module
    const underlyingDb = require('../src/db');
    expect(underlyingDb.saveNetworkRequest).toHaveBeenCalledWith(mockRequest);
  });
});
