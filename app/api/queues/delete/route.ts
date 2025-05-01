import { NextRequest, NextResponse } from 'next/server';
import { deleteQueue } from '@/app/lib/sqs';

export async function POST(request: NextRequest) {
  try {
    const { queueUrl } = await request.json();
    
    if (!queueUrl) {
      return NextResponse.json({ error: 'Queue URL is required' }, { status: 400 });
    }
    
    const success = await deleteQueue(queueUrl);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to delete queue' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in POST /api/queues/delete:', error);
    return NextResponse.json({ error: 'Failed to delete queue' }, { status: 500 });
  }
}