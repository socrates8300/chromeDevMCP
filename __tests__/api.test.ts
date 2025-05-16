import 'jest';
import { logApi } from '../src/api';
import { ConsoleLog, NetworkRequest, LogLevel } from '../types';

// Mock the QueryBuilder module
jest.mock('../src/query', () => {
  // Create the mock inside the mock function to avoid hoisting issues
  const mockQueryBuilder = {
    whereLevel: jest.fn().mockReturnThis(),
    searchMessage: jest.fn().mockReturnThis(),
    whereUrl: jest.fn().mockReturnThis(),
    whereTabId: jest.fn().mockReturnThis(),
    whereDateRange: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getConsoleLogs: jest.fn(),
    whereMethod: jest.fn().mockReturnThis(),
    whereStatusCode: jest.fn().mockReturnThis(),
    whereFromCache: jest.fn().mockReturnThis(),
    getNetworkRequests: jest.fn()
  };

  return {
    QueryBuilder: jest.fn(() => mockQueryBuilder),
    query: mockQueryBuilder
  };
});

describe('LogApi', () => {
  // Get the mocks after they've been created by jest.mock()
  const { query: mockQueryBuilder } = require('../src/query');

  // Get current date for mock data
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Format dates for mock data
  const todayStr = today.toISOString();
  const yesterdayStr = yesterday.toISOString();
  const todayDate = todayStr.split('T')[0]; // YYYY-MM-DD
  const yesterdayDate = yesterdayStr.split('T')[0]; // YYYY-MM-DD
  
  // Sample mock data with recent dates
  const mockLogs: ConsoleLog[] = [
    {
      id: 'log-1',
      timestamp: yesterdayStr,
      level: 'error' as LogLevel,
      message: 'Error message',
      url: 'http://example.com',
      tabId: 1
    },
    {
      id: 'log-2',
      timestamp: todayStr,
      level: 'warn' as LogLevel,
      message: 'Warning message',
      url: 'http://example.com',
      tabId: 1
    },
    {
      id: 'log-3',
      timestamp: todayStr,
      level: 'error' as LogLevel,
      message: 'Another error',
      url: 'http://test.com',
      tabId: 2
    }
  ];

  const mockRequests: NetworkRequest[] = [
    {
      requestId: 'req-1',
      url: 'http://api.example.com/data',
      method: 'GET',
      type: 'xhr',
      timeStamp: Date.now(),
      statusCode: 200,
      statusText: 'OK',
      fromCache: false,
      requestHeaders: [],
      responseHeaders: [],
      requestBody: null,
      responseBody: { data: 'test' },
      responseError: null,
      ip: '127.0.0.1',
      timing: {
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100
      },
      tabId: 1
    },
    {
      requestId: 'req-2',
      url: 'http://api.example.com/users',
      method: 'POST',
      type: 'xhr',
      timeStamp: Date.now(),
      statusCode: 404,
      statusText: 'Not Found',
      fromCache: false,
      requestHeaders: [],
      responseHeaders: [],
      requestBody: null,
      responseBody: null,
      responseError: 'Not Found',
      ip: '127.0.0.1',
      timing: {
        startTime: Date.now() - 200,
        endTime: Date.now(),
        duration: 200
      },
      tabId: 1
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.getConsoleLogs.mockResolvedValue(mockLogs);
    mockQueryBuilder.getNetworkRequests.mockResolvedValue(mockRequests);
  });

  describe('getConsoleLogs', () => {
    it('should call QueryBuilder with correct parameters', async () => {
      const options = {
        level: 'error',
        search: 'test',
        url: 'example.com',
        tabId: 1,
        limit: 10,
        offset: 5,
        orderBy: 'timestamp',
        orderDirection: 'DESC' as const,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31')
      };
      
      await logApi.getConsoleLogs(options);
      
      // Assert on the mock methods directly
      expect(mockQueryBuilder.whereLevel).toHaveBeenCalledWith(options.level);
      expect(mockQueryBuilder.searchMessage).toHaveBeenCalledWith(options.search);
      expect(mockQueryBuilder.whereUrl).toHaveBeenCalledWith(options.url);
      expect(mockQueryBuilder.whereTabId).toHaveBeenCalledWith(options.tabId);
      expect(mockQueryBuilder.whereDateRange).toHaveBeenCalledWith(
        options.startDate,
        options.endDate
      );
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(options.limit);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(options.offset);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        options.orderBy,
        options.orderDirection
      );
      expect(mockQueryBuilder.getConsoleLogs).toHaveBeenCalled();
    });
  });

  describe('getNetworkRequests', () => {
    it('should call QueryBuilder with correct parameters', async () => {
      const options = {
        url: 'api.example.com',
        method: 'GET',
        statusCode: 200,
        fromCache: false,
        tabId: 1,
        limit: 10,
        offset: 5,
        orderBy: 'created_at',
        orderDirection: 'DESC' as const,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31')
      };

      await logApi.getNetworkRequests(options);
      
      // Assert on the mock methods directly
      expect(mockQueryBuilder.whereUrl).toHaveBeenCalledWith(options.url);
      expect(mockQueryBuilder.whereMethod).toHaveBeenCalledWith(options.method);
      expect(mockQueryBuilder.whereStatusCode).toHaveBeenCalledWith(options.statusCode);
      expect(mockQueryBuilder.whereFromCache).toHaveBeenCalledWith(options.fromCache);
      expect(mockQueryBuilder.whereTabId).toHaveBeenCalledWith(options.tabId);
      expect(mockQueryBuilder.whereDateRange).toHaveBeenCalledWith(
        options.startDate,
        options.endDate
      );
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(options.limit);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(options.offset);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        options.orderBy,
        options.orderDirection
      );
      expect(mockQueryBuilder.getNetworkRequests).toHaveBeenCalled();
    });
  });

  describe('getLogStats', () => {
    it('should return log statistics', async () => {
      const stats = await logApi.getLogStats();

      // Expected stats based on mockLogs data
      expect(stats).toEqual({
        totalLogs: 3,
        logsByLevel: { 
          error: 2, 
          warn: 1 
        },
        logsByUrl: [
          { url: 'http://example.com', count: 2 },
          { url: 'http://test.com', count: 1 }
        ],
        recentActivity: [
          { date: yesterdayDate, count: 1 },
          { date: todayDate, count: 2 }
        ]
      });
    });
  });

  describe('getNetworkStats', () => {
    it('should return network statistics', async () => {
      const stats = await logApi.getNetworkStats();

      // Expected stats based on mockRequests data
      expect(stats).toEqual({
        totalRequests: 2,
        requestsByMethod: [
          { method: 'GET', count: 1 },
          { method: 'POST', count: 1 }
        ],
        requestsByStatus: [
          { status: 200, count: 1 },
          { status: 404, count: 1 }
        ],
        avgResponseTime: 150 // Average of 100ms and 200ms
      });
    });
  });
});
