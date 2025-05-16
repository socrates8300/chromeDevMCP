import type { ConsoleLog, NetworkRequest } from '../../types';
import type { Database } from 'better-sqlite3';
import { logger } from '../utils/logger';

interface DatabaseConfig {
  dbPath?: string;
  inMemory?: boolean;
}

class LogDatabase {
  protected db!: Database; // Using definite assignment assertion
  private static instance: LogDatabase;
  protected readonly options: DatabaseConfig;

  protected constructor(options: DatabaseConfig = {}) {
    this.options = options;
    this.initializeDatabase();
  }

  public static getInstance(options: DatabaseConfig = {}): LogDatabase {
    if (!LogDatabase.instance) {
      LogDatabase.instance = new LogDatabase(options);
    }
    return LogDatabase.instance;
  }

  protected initializeDatabase() {
    try {
      const sqlite3 = require('better-sqlite3');
      
      if (this.options.inMemory) {
        this.db = sqlite3(':memory:');
      } else {
        this.db = sqlite3(this.options.dbPath || 'console-logs.db');
      }
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      
      this.createTables();
      logger.info('Database initialized');
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private createTables() {
    // Create console logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS console_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        level TEXT,
        message TEXT,
        url TEXT,
        tabId INTEGER,
        stack TEXT,
        context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

    // Create network requests table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS network_requests (
        requestId TEXT PRIMARY KEY,
        url TEXT,
        method TEXT,
        type TEXT,
        statusCode INTEGER,
        statusText TEXT,
        fromCache BOOLEAN,
        requestHeaders TEXT,
        responseHeaders TEXT,
        requestBody TEXT,
        responseBody TEXT,
        responseError TEXT,
        ip TEXT,
        timing TEXT,
        tabId INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

    // Create indexes for faster queries
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_console_timestamp ON console_logs(timestamp)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_console_level ON console_logs(level)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_console_url ON console_logs(url)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_network_timestamp ON network_requests(created_at)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_network_url ON network_requests(url)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_network_status ON network_requests(statusCode)');
  }

  public saveConsoleLog(log: ConsoleLog) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO console_logs 
        (id, timestamp, level, message, url, tabId, stack, context)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        log.id,
        log.timestamp,
        log.level,
        log.message,
        log.url,
        log.tabId,
        log.stack,
        JSON.stringify(log.context || {})
      );
    } catch (error) {
      logger.error('Failed to save console log:', error);
    }
  }

  public saveNetworkRequest(request: NetworkRequest) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO network_requests 
        (requestId, url, method, type, statusCode, statusText, fromCache, 
         requestHeaders, responseHeaders, requestBody, responseBody, responseError, ip, timing, tabId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        request.requestId,
        request.url,
        request.method,
        request.type,
        request.statusCode,
        request.statusText,
        request.fromCache ? 1 : 0,
        JSON.stringify(request.requestHeaders || []),
        JSON.stringify(request.responseHeaders || []),
        JSON.stringify(request.requestBody || {}),
        JSON.stringify(request.responseBody || {}),
        request.responseError || null,
        request.ip || null,
        JSON.stringify(request.timing || {}),
        (request as any).tabId || null
      );
    } catch (error) {
      logger.error('Failed to save network request:', error);
    }
  }

  public async queryConsoleLogs(query: string, params: any[] = []): Promise<any[]> {
    try {
      const result = this.db.prepare(query).all(params);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      logger.error('Failed to query console logs:', error);
      return [];
    }
  }

  public async queryNetworkRequests(query: string, params: any[] = []): Promise<any[]> {
    try {
      const result = this.db.prepare(query).all(params);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      logger.error('Failed to query network requests:', error);
      return [];
    }
  }

  public close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Export the database instance with default configuration
const db = LogDatabase.getInstance();

export { LogDatabase, type DatabaseConfig as DatabaseOptions };
export default db;
