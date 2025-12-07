import { NextResponse } from 'next/server';
import { getAppData, saveAppData, initializeDatabase } from '@/lib/db';

// GET - Load data from database
export async function GET() {
  // Check if database URL exists
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL;
  if (!dbUrl) {
    console.error('Database URL is not set');
    return NextResponse.json({
      success: false,
      error: 'Database not configured',
      debug: 'No database URL found (checked POSTGRES_URL, DATABASE_URL, STORAGE_DATABASE_URL)'
    }, { status: 500 });
  }

  try {
    await initializeDatabase();
    const data = await getAppData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to load data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load data',
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Save data to database
export async function POST(request: Request) {
  // Check if database URL exists
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL;
  if (!dbUrl) {
    console.error('Database URL is not set');
    return NextResponse.json({
      success: false,
      error: 'Database not configured'
    }, { status: 500 });
  }

  try {
    const body = await request.json();
    await initializeDatabase();
    await saveAppData(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save data',
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
