export interface ConsoleLog {
  id: string;
  timestamp: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  url: string;
  tabId: number;
  stack?: string;
  context?: Record<string, any>;
  created_at?: string;
}

export interface NetworkRequest {
  requestId: string;
  url: string;
  method: string;
  type: string;
  statusCode: number;
  statusText: string;
  fromCache: boolean;
  requestHeaders: Array<{ name: string; value: string }>;
  responseHeaders: Array<{ name: string; value: string }>;
  requestBody: any;
  responseBody: any;
  responseError: any;
  ip: string;
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };
  tabId: number;
  timeStamp: number;
  created_at?: string;
}

export interface LogStats {
  totalLogs: number;
  logsByLevel: Record<string, number>;
  logsByUrl: Array<{ url: string; count: number }>;
  recentActivity: Array<{ date: string; count: number }>;
}

export interface NetworkStats {
  totalRequests: number;
  requestsByMethod: Array<{ method: string; count: number }>;
  requestsByStatus: Array<{ status: number; count: number }>;
  avgResponseTime: number;
}

export interface QueryOptions {
  level?: ConsoleLog['level'];
  search?: string;
  url?: string;
  tabId?: number;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  startDate?: Date;
  endDate?: Date;
}
