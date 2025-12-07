import { NextResponse } from 'next/server';
import { getAppData, saveAppData, initializeDatabase } from '@/lib/db';

// GET - Load data from database
export async function GET() {
  try {
    await initializeDatabase();
    const data = await getAppData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to load data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load data' },
      { status: 500 }
    );
  }
}

// POST - Save data to database
export async function POST(request: Request) {
  try {
    const body = await request.json();
    await initializeDatabase();
    await saveAppData(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save data' },
      { status: 500 }
    );
  }
}
