import { Pool, QueryResult, QueryResultRow } from 'pg';
import fs from 'fs';
import path from 'path';

// Singleton pattern for PostgreSQL connection pool in Next.js
declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var pgConnectionString: string | undefined;
}

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Fallback if Next dev server started before .env.local was created
  try {
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const content = fs.readFileSync(envLocalPath, 'utf8');
      const match = content.match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch (err) {
    console.error('Error reading .env files:', err);
  }

  return '';
}

export function getPool(): Pool {
  const currentConn = getDatabaseUrl();

  // If pool exists and connection string hasn't changed, reuse pool
  if (global.pgPool && global.pgConnectionString === currentConn) {
    return global.pgPool;
  }

  // If pool exists but connection string changed, close old pool
  if (global.pgPool) {
    global.pgPool.end().catch(() => {});
  }

  const isLocalhost =
    currentConn.includes('localhost') || currentConn.includes('127.0.0.1');

  const newPool = new Pool({
    connectionString: currentConn,
    ssl: currentConn && !isLocalhost ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  global.pgPool = newPool;
  global.pgConnectionString = currentConn;

  return newPool;
}

export const pool = getPool();

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const activePool = getPool();
  const start = Date.now();
  try {
    const res = await activePool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', {
        text: text.substring(0, 100),
        duration: `${duration}ms`,
        rows: res.rowCount,
      });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export default pool;
