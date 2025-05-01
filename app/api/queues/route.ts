import { NextResponse } from 'next/server';
import { listQueues, getQueueAttributes } from '@/app/lib/sqs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nextToken = searchParams.get('nextToken') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    const { items: queues, nextToken: newNextToken } = await listQueues(nextToken, limit);
    
    // Get attributes for each queue
    const queuesWithAttributes = await Promise.all(
      queues.map(async (queue) => {
        const attributes = await getQueueAttributes(queue.url);
        return {
          ...queue,
          attributes,
        };
      })
    );
    
    return NextResponse.json({
      items: queuesWithAttributes,
      nextToken: newNextToken
    });
  } catch (error) {
    console.error('Error in /api/queues:', error);
    return NextResponse.json({ error: 'Failed to fetch queues' }, { status: 500 });
  }
}