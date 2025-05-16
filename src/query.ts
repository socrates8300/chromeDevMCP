import db from './db';
import { ConsoleLog, NetworkRequest } from '../types';

export class QueryBuilder {
  private consoleLogsQuery: string = 'SELECT * FROM console_logs';
  private networkRequestsQuery: string = 'SELECT * FROM network_requests';
  private consoleLogsParams: any[] = [];
  private networkRequestsParams: any[] = [];
  private consoleLogsConditions: string[] = [];
  private networkRequestsConditions: string[] = [];
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private orderByValue: string | null = null;
  private orderDirection: 'ASC' | 'DESC' = 'DESC';

  // Console logs filters
  public whereLevel(level: string): this {
    this.consoleLogsConditions.push('level = ?');
    this.consoleLogsParams.push(level);
    return this;
  }

  public whereUrl(url: string): this {
    this.consoleLogsConditions.push('url LIKE ?');
    this.networkRequestsConditions.push('url LIKE ?');
    this.consoleLogsParams.push(`%${url}%`);
    this.networkRequestsParams.push(`%${url}%`);
    return this;
  }

  public searchMessage(text: string): this {
    this.consoleLogsConditions.push('message LIKE ?');
    this.consoleLogsParams.push(`%${text}%`);
    return this;
  }

  // Network requests filters
  public whereMethod(method: string): this {
    this.networkRequestsConditions.push('method = ?');
    this.networkRequestsParams.push(method);
    return this;
  }

  public whereStatusCode(statusCode: number): this {
    this.networkRequestsConditions.push('statusCode = ?');
    this.networkRequestsParams.push(statusCode);
    return this;
  }

  public whereFromCache(fromCache: boolean): this {
    this.networkRequestsConditions.push('fromCache = ?');
    this.networkRequestsParams.push(fromCache ? 1 : 0);
    return this;
  }

  // Common filters
  public whereTabId(tabId: number): this {
    this.consoleLogsConditions.push('tabId = ?');
    this.networkRequestsConditions.push('tabId = ?');
    this.consoleLogsParams.push(tabId);
    this.networkRequestsParams.push(tabId);
    return this;
  }

  public whereDateRange(startDate: Date, endDate: Date): this {
    this.consoleLogsConditions.push('timestamp BETWEEN ? AND ?');
    this.consoleLogsParams.push(startDate.toISOString(), endDate.toISOString());
    this.networkRequestsConditions.push('timestamp BETWEEN ? AND ?');
    this.networkRequestsParams.push(startDate.toISOString(), endDate.toISOString());
    return this;
  }

  // Pagination and ordering
  public limit(limit: number): this {
    this.limitValue = limit;
    return this;
  }

  public offset(offset: number): this {
    this.offsetValue = offset;
    return this;
  }

  public orderBy(field: string, direction: 'ASC' | 'DESC' = 'DESC'): this {
    this.orderByValue = field;
    this.orderDirection = direction;
    return this;
  }

  // Execution methods
  public async getConsoleLogs(): Promise<ConsoleLog[]> {
    let query = this.consoleLogsQuery;
    const params = [...this.consoleLogsParams];

    if (this.consoleLogsConditions.length > 0) {
      query += ' WHERE ' + this.consoleLogsConditions.join(' AND ');
    }

    // Always order by created_at DESC by default if no order is specified
    if (this.orderByValue) {
      query += ` ORDER BY ${this.orderByValue} ${this.orderDirection}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }

    if (this.limitValue !== null) {
      query += ' LIMIT ?';
      params.push(this.limitValue);
    }

    if (this.offsetValue !== null) {
      query += ' OFFSET ?';
      params.push(this.offsetValue);
    }

    const results = await db.queryConsoleLogs(query, params);
    return (results || []).map((row: any) => {
      try {
        return {
          ...row,
          context: row.context 
            ? (typeof row.context === 'string' 
                ? JSON.parse(row.context) 
                : row.context) 
            : {},
          tabId: row.tabId ?? null
        };
      } catch (error) {
        console.error('Error parsing console log row:', error, row);
        return null;
      }
    }).filter(Boolean);
  }

  public async getNetworkRequests(): Promise<NetworkRequest[]> {
    let query = this.networkRequestsQuery;
    const params = [...this.networkRequestsParams];

    if (this.networkRequestsConditions.length > 0) {
      query += ' WHERE ' + this.networkRequestsConditions.join(' AND ');
    }

    // Always order by created_at DESC by default if no order is specified
    if (this.orderByValue) {
      query += ` ORDER BY ${this.orderByValue} ${this.orderDirection}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }

    if (this.limitValue !== null) {
      query += ' LIMIT ?';
      params.push(this.limitValue);
    }

    if (this.offsetValue !== null) {
      query += ' OFFSET ?';
      params.push(this.offsetValue);
    }

    const results = await db.queryNetworkRequests(query, params);
    return (results || []).map((row: any) => {
      try {
        return {
          ...row,
          fromCache: row.fromCache === 1,
          requestHeaders: typeof row.requestHeaders === 'string' 
            ? JSON.parse(row.requestHeaders) 
            : (row.requestHeaders || []),
          responseHeaders: typeof row.responseHeaders === 'string'
            ? JSON.parse(row.responseHeaders)
            : (row.responseHeaders || []),
          requestBody: typeof row.requestBody === 'string'
            ? JSON.parse(row.requestBody)
            : (row.requestBody || {}),
          responseBody: typeof row.responseBody === 'string'
            ? JSON.parse(row.responseBody)
            : (row.responseBody || {}),
          timing: typeof row.timing === 'string'
            ? JSON.parse(row.timing)
            : (row.timing || {}),
          tabId: row.tabId === null || row.tabId === undefined 
            ? null 
            : parseInt(row.tabId, 10)
        };
      } catch (error) {
        console.error('Error parsing network request row:', error, row);
        return null;
      }
    }).filter(Boolean);
  }

  // Helper methods for common queries
  public static async getRecentLogs(limit: number = 100): Promise<ConsoleLog[]> {
    return new QueryBuilder()
      .orderBy('timestamp', 'DESC')
      .limit(limit)
      .getConsoleLogs();
  }

  public static async getLogsByLevel(level: string, limit: number = 100): Promise<ConsoleLog[]> {
    return new QueryBuilder()
      .whereLevel(level)
      .orderBy('timestamp', 'DESC')
      .limit(limit)
      .getConsoleLogs();
  }

  public static async getRecentNetworkRequests(limit: number = 100): Promise<NetworkRequest[]> {
    return new QueryBuilder()
      .orderBy('created_at', 'DESC')
      .limit(limit)
      .getNetworkRequests();
  }

  public static async getFailedNetworkRequests(limit: number = 100): Promise<NetworkRequest[]> {
    return new QueryBuilder()
      .whereStatusCode(500)
      .orderBy('created_at', 'DESC')
      .limit(limit)
      .getNetworkRequests();
  }
}

export const query = new QueryBuilder();
