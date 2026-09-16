import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: 'DATABASE_URL is not configured in environment variables (.env.local)',
          tip: 'Please configure DATABASE_URL in sibantu/.env.local with your Railway PostgreSQL connection string.',
        },
        { status: 500 }
      );
    }

    // 1. Run basic test query: SELECT NOW() and PostgreSQL version
    const timeResult = await query<{ current_time: Date; version: string }>(
      'SELECT NOW() as current_time, version() as version;'
    );

    // 2. Query available public tables to verify schema visibility
    const tablesResult = await query<{ table_name: string }>(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       ORDER BY table_name;`
    );

    const tables = tablesResult.rows.map((row) => row.table_name);

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to PostgreSQL database!',
      data: {
        server_time: timeResult.rows[0]?.current_time,
        postgres_version: timeResult.rows[0]?.version,
        tables_count: tables.length,
        tables: tables,
      },
    });
  } catch (error: unknown) {
    console.error('Test DB API Error:', error);
    const err = error as { message?: string; code?: string; detail?: string };
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Database connection error',
        code: err.code || 'UNKNOWN_ERROR',
        detail: err.detail || null,
      },
      { status: 500 }
    );
  }
}
