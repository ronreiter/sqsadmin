import { NextRequest, NextResponse } from 'next/server';
import { getQueueAttributes } from '@/app/lib/sqs';

export async function GET(
  request: NextRequest,
  { params }: { params: { queueUrl: string } }
) {
  try {
    // The queueUrl will be base64 encoded since it contains special characters
    const decodedQueueUrl = Buffer.from(params.queueUrl, 'base64').toString('utf-8');
    
    // Get queue attributes
    const attributes = await getQueueAttributes(decodedQueueUrl);
    
    // Extract queue name from URL
    const name = decodedQueueUrl.split('/').pop() || decodedQueueUrl;
    
    return NextResponse.json({
      url: decodedQueueUrl,
      name,
      attributes
    });
  } catch (error) {
    console.error('Error in GET /api/queues/[queueUrl]:', error);
    return NextResponse.json({ error: 'Failed to fetch queue details' }, { status: 500 });
  }
}