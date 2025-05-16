# Querying Console Logs and Network Requests

This document explains how to query the captured console logs and network requests using the built-in querying capabilities.

## Database Schema

### Console Logs Table (`console_logs`)

| Column      | Type    | Description                           |
|-------------|---------|---------------------------------------|
| id          | TEXT    | Unique identifier for the log entry   |
| timestamp   | TEXT    | ISO timestamp of when the log occurred|
| level       | TEXT    | Log level (log, info, warn, error, debug)|
| message     | TEXT    | The log message                      |
| url         | TEXT    | URL where the log occurred           |
| tabId      | INTEGER | ID of the tab where the log occurred |
| stack       | TEXT    | Stack trace (if available)           |
| context     | TEXT    | Additional context as JSON string    |
| created_at  | DATETIME| When the log was stored in the database |


### Network Requests Table (`network_requests`)

| Column           | Type    | Description                           |
|------------------|---------|---------------------------------------|
| requestId        | TEXT    | Unique identifier for the request     |
| url              | TEXT    | Request URL                          |
| method           | TEXT    | HTTP method (GET, POST, etc.)        |
| type            | TEXT    | Request type (xhr, fetch, etc.)      |
| statusCode      | INTEGER | HTTP status code                     |
| statusText      | TEXT    | HTTP status text                     |
| fromCache       | BOOLEAN | Whether the response came from cache  |
| requestHeaders  | TEXT    | Request headers as JSON string       |
| responseHeaders | TEXT    | Response headers as JSON string      |
| requestBody     | TEXT    | Request body as JSON string          |
| responseBody    | TEXT    | Response body as JSON string         |
| responseError   | TEXT    | Error message if request failed      |
| ip              | TEXT    | IP address of the server             |
| timing          | TEXT    | Timing information as JSON string    |
| tabId          | INTEGER | ID of the tab that made the request  |
| created_at      | DATETIME| When the request was stored in the database |


## Querying the Database

You can query the database using the `query` object or the `logApi` object for higher-level operations.

### Using the Query Builder

```typescript
import { query } from './src/query';

// Get recent logs (up to 100)
const recentLogs = await query.getConsoleLogs();

// Get error logs
const errorLogs = await query
  .whereLevel('error')
  .limit(50)
  .getConsoleLogs();

// Search logs by message
const searchResults = await query
  .searchMessage('error loading')
  .getConsoleLogs();

// Get network requests by status code
const failedRequests = await query
  .whereStatusCode(500)
  .getNetworkRequests();

// Get network requests by method
const postRequests = await query
  .whereMethod('POST')
  .getNetworkRequests();

// Get logs within a date range
const startDate = new Date('2023-01-01');
const endDate = new Date('2023-01-31');
const januaryLogs = await query
  .whereDateRange(startDate, endDate)
  .getConsoleLogs();

// Pagination
const page1 = await query
  .limit(20)
  .offset(0)
  .getConsoleLogs();

const page2 = await query
  .limit(20)
  .offset(20)
  .getConsoleLogs();
```

### Using the Log API

The `logApi` provides higher-level methods for common queries:

```typescript
import { logApi } from './src/api';

// Get recent logs (up to 100)
const recentLogs = await logApi.getRecentLogs();

// Get logs by level
const errorLogs = await logApi.getLogsByLevel('error');

// Get recent network requests
const recentRequests = await logApi.getRecentNetworkRequests();

// Get failed network requests
const failedRequests = await logApi.getFailedNetworkRequests();

// Get statistics
const logStats = await logApi.getLogStats();
const networkStats = await logApi.getNetworkStats();

// Advanced query with filters
const filteredLogs = await logApi.getConsoleLogs({
  level: 'error',
  search: 'failed to load',
  limit: 50,
  orderBy: 'timestamp',
  orderDirection: 'DESC'
});
```

## Direct SQL Queries

For advanced use cases, you can execute raw SQL queries:

```typescript
import db from './src/db';

// Query console logs
const logs = await db.queryConsoleLogs(
  'SELECT * FROM console_logs WHERE level = ? ORDER BY timestamp DESC LIMIT ?',
  ['error', 50]
);

// Query network requests
const requests = await db.queryNetworkRequests(
  'SELECT * FROM network_requests WHERE statusCode >= 400 ORDER BY created_at DESC LIMIT ?',
  [100]
);
```

## Indexes

The following indexes are created for better query performance:

- `idx_console_timestamp` - For querying logs by timestamp
- `idx_console_level` - For filtering logs by level
- `idx_console_url` - For filtering logs by URL
- `idx_network_timestamp` - For querying network requests by timestamp
- `idx_network_url` - For filtering network requests by URL
- `idx_network_status` - For filtering network requests by status code

## Best Practices

1. **Use the Query Builder** for type-safe queries and better maintainability.
2. **Limit Results** using `.limit()` to avoid loading too much data at once.
3. **Use Indexed Columns** in WHERE clauses for better performance.
4. **Avoid SELECT *** - Only query the columns you need.
5. **Use Transactions** for multiple related operations to ensure data consistency.

## Example: Building a Dashboard

```typescript
import { logApi } from './src/api';

async function buildDashboard() {
  // Get recent errors
  const errors = await logApi.getLogsByLevel('error', 50);
  
  // Get failed network requests
  const failedRequests = await logApi.getFailedNetworkRequests(50);
  
  // Get statistics
  const [logStats, networkStats] = await Promise.all([
    logApi.getLogStats(),
    logApi.getNetworkStats()
  ]);
  
  return {
    errors,
    failedRequests,
    logStats,
    networkStats
  };
}
```

## Database Location

The SQLite database is stored at the following location:

- **Development**: In the project root as `console-logs.db`
- **Production**: In the extension's data directory

## Backup and Maintenance

To back up the database, simply copy the `console-logs.db` file. The database uses WAL (Write-Ahead Logging) for better concurrency and performance.

To clean up old data, you can run:

```sql
-- Delete logs older than 30 days
DELETE FROM console_logs WHERE created_at < datetime('now', '-30 days');

-- Delete network requests older than 30 days
DELETE FROM network_requests WHERE created_at < datetime('now', '-30 days');

-- Vacuum to reclaim disk space
VACUUM;
```
