import { NextResponse } from 'next/server';
import { getAppData, saveAppData, initializeDatabase } from '@/lib/db';

// GET - Load data from database
export async function GET() {
  // Check if DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    return NextResponse.json({
      success: false,
      error: 'Database not configured',
      debug: 'DATABASE_URL environment variable is missing'
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
  // Check if DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
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
