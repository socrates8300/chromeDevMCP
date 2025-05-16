import db from '../db';
import { logger } from '../utils/logger';

// Re-export the query functions from the main db module
export const queryConsoleLogs = db.queryConsoleLogs.bind(db);
export const queryNetworkRequests = db.queryNetworkRequests.bind(db);

export async function saveConsoleLog(log: any) {
  try {
    await db.saveConsoleLog(log);
    logger.debug('Saved console log to database:', log.id);
  } catch (error) {
    logger.error('Error saving console log to database:', error);
  }
}

export async function saveNetworkRequest(request: any) {
  try {
    await db.saveNetworkRequest(request);
    logger.debug('Saved network request to database:', request.requestId);
  } catch (error) {
    logger.error('Error saving network request to database:', error);
  }
}

// The query functions are now directly exported from the db module
