import { query, QueryBuilder } from './query';
import { ConsoleLog, NetworkRequest } from '../types';

export class LogApi {
  private query: QueryBuilder;

  constructor(queryBuilder = new QueryBuilder()) {
    this.query = queryBuilder;
  }

  public async getConsoleLogs(options: {
    level?: string;
    url?: string;
    search?: string;
    tabId?: number;
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<ConsoleLog[]> {
    let queryBuilder = this.query;

    if (options.level) queryBuilder = queryBuilder.whereLevel(options.level);
    if (options.url) queryBuilder = queryBuilder.whereUrl(options.url);
    if (options.search) queryBuilder = queryBuilder.searchMessage(options.search);
    if (options.tabId) queryBuilder = queryBuilder.whereTabId(options.tabId);
    if (options.limit) queryBuilder = queryBuilder.limit(options.limit);
    if (options.offset) queryBuilder = queryBuilder.offset(options.offset);
    if (options.orderBy) {
      queryBuilder = queryBuilder.orderBy(options.orderBy, options.orderDirection || 'DESC');
    }
    if (options.startDate && options.endDate) {
      queryBuilder = queryBuilder.whereDateRange(options.startDate, options.endDate);
    }

    return queryBuilder.getConsoleLogs();
  }

  public async getNetworkRequests(options: {
    url?: string;
    method?: string;
    statusCode?: number;
    fromCache?: boolean;
    tabId?: number;
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<NetworkRequest[]> {
    let queryBuilder = this.query;

    if (options.url) queryBuilder = queryBuilder.whereUrl(options.url);
    if (options.method) queryBuilder = queryBuilder.whereMethod(options.method);
    if (options.statusCode) queryBuilder = queryBuilder.whereStatusCode(options.statusCode);
    if (options.fromCache !== undefined) queryBuilder = queryBuilder.whereFromCache(options.fromCache);
    if (options.tabId) queryBuilder = queryBuilder.whereTabId(options.tabId);
    if (options.limit) queryBuilder = queryBuilder.limit(options.limit);
    if (options.offset) queryBuilder = queryBuilder.offset(options.offset);
    if (options.orderBy) {
      queryBuilder = queryBuilder.orderBy(options.orderBy, options.orderDirection || 'DESC');
    }
    if (options.startDate && options.endDate) {
      queryBuilder = queryBuilder.whereDateRange(options.startDate, options.endDate);
    }

    return queryBuilder.getNetworkRequests();
  }

  public async getLogStats(): Promise<{
    totalLogs: number;
    logsByLevel: Record<string, number>;
    logsByUrl: Array<{ url: string; count: number }>;
    recentActivity: Array<{ date: string; count: number }>;
  }> {
    try {
      // Get all logs
      const logs = await this.query.getConsoleLogs();
      
      // Calculate total logs
      const totalLogs = logs.length;
      
      // Calculate logs by level
      const logsByLevel = logs.reduce((counts: Record<string, number>, log) => {
        counts[log.level] = (counts[log.level] || 0) + 1;
        return counts;
      }, {});
      
      // Calculate logs by URL (top 10)
      const urlCounts = logs.reduce((counts: Record<string, number>, log) => {
        if (log.url) {
          counts[log.url] = (counts[log.url] || 0) + 1;
        }
        return counts;
      }, {});
      
      const logsByUrl = Object.entries(urlCounts)
        .map(([url, count]) => ({ url, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // Calculate recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const activityMap = logs
        .filter(log => new Date(log.timestamp) >= sevenDaysAgo)
        .reduce((counts: Record<string, number>, log) => {
          const date = new Date(log.timestamp).toISOString().split('T')[0];
          counts[date] = (counts[date] || 0) + 1;
          return counts;
        }, {});
      
      const recentActivity = Object.entries(activityMap)
        .map(([date, count]) => ({ 
          date, 
          count: count as number 
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      return {
        totalLogs,
        logsByLevel,
        logsByUrl,
        recentActivity
      };
    } catch (error) {
      console.error('Error getting log stats:', error);
      return {
        totalLogs: 0,
        logsByLevel: {},
        logsByUrl: [],
        recentActivity: []
      };
    }
  }

  public async getNetworkStats(): Promise<{
    totalRequests: number;
    requestsByMethod: Array<{ method: string; count: number }>;
    requestsByStatus: Array<{ status: number; count: number }>;
    avgResponseTime: number;
  }> {
    try {
      // Get all network requests
      const allRequests = await this.query.getNetworkRequests();
      
      // Calculate total requests
      const totalRequests = allRequests.length;
      
      // Calculate requests by method
      const methodCounts = allRequests.reduce((counts: Record<string, number>, req) => {
        counts[req.method] = (counts[req.method] || 0) + 1;
        return counts;
      }, {});
      
      const requestsByMethod = Object.entries(methodCounts)
        .map(([method, count]) => ({ 
          method, 
          count: count as number 
        }))
        .sort((a, b) => b.count - a.count);
      
      // Calculate requests by status
      const statusCounts = allRequests
        .filter(req => req.statusCode != null)
        .reduce((counts: Record<string, number>, req) => {
          const status = String(req.statusCode);
          counts[status] = (counts[status] || 0) + 1;
          return counts;
        }, {});
      
      const requestsByStatus = Object.entries(statusCounts)
        .map(([status, count]) => ({
          status: parseInt(status, 10),
          count: count as number
        }))
        .sort((a, b) => b.count - a.count);
      
      // Calculate average response time
      const validTimings = allRequests
        .map(req => req.timing?.duration)
        .filter((duration): duration is number => duration != null && !isNaN(duration));
      
      const avgResponseTime = validTimings.length > 0
        ? validTimings.reduce((sum, duration) => sum + duration, 0) / validTimings.length
        : 0;
      
      return {
        totalRequests,
        requestsByMethod,
        requestsByStatus,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100 // Round to 2 decimal places
      };
    } catch (error) {
      console.error('Error getting network stats:', error);
      return {
        totalRequests: 0,
        requestsByMethod: [],
        requestsByStatus: [],
        avgResponseTime: 0
      };
    }
  }
}

// Export the LogApi class as logApi for backward compatibility
// Create a singleton instance of LogApi
export const logApi = new LogApi();

// Also export the query builder for direct use
export { query } from './query';

// Export types
export type { ConsoleLog, NetworkRequest } from '../types';
