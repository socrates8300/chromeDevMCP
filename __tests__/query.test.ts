import 'jest';
import { QueryBuilder } from '../src/query';

// Mock the database module
jest.mock('../src/db', () => ({
  queryConsoleLogs: jest.fn().mockResolvedValue([
    { id: '1', level: 'error', message: 'test' },
    { id: '2', level: 'error', message: 'test2' }
  ]),
  queryNetworkRequests: jest.fn()
}));

import db from '../src/db';

describe('QueryBuilder', () => {
  let queryBuilder: QueryBuilder;

  beforeEach(() => {
    queryBuilder = new QueryBuilder();
    jest.clearAllMocks();
  });

  it('should filter logs by level', async () => {
    const results = await queryBuilder
      .whereLevel('error')
      .getConsoleLogs();
    
    expect(db.queryConsoleLogs).toHaveBeenCalledWith(
      'SELECT * FROM console_logs WHERE level = ? ORDER BY created_at DESC',
      ['error']
    );
    expect(results).toHaveLength(2);
  });
});
