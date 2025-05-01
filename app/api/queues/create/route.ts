import { NextRequest, NextResponse } from 'next/server';
import { createQueue, CreateQueueParams } from '@/app/lib/sqs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.queueName) {
      return NextResponse.json({ error: 'Queue name is required' }, { status: 400 });
    }
    
    // Extract and validate parameters
    const params: CreateQueueParams = {
      queueName: body.queueName,
      isFifo: body.isFifo === true,
    };
    
    // Optional parameters
    if (body.delaySeconds !== undefined) {
      params.delaySeconds = Number(body.delaySeconds);
    }
    
    if (body.messageRetentionPeriod !== undefined) {
      params.messageRetentionPeriod = Number(body.messageRetentionPeriod);
    }
    
    if (body.visibilityTimeout !== undefined) {
      params.visibilityTimeout = Number(body.visibilityTimeout);
    }
    
    if (body.maxMessageSize !== undefined) {
      params.maxMessageSize = Number(body.maxMessageSize);
    }
    
    const result = await createQueue(params);
    
    if (result) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: 'Failed to create queue' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in POST /api/queues/create:', error);
    return NextResponse.json({ error: 'Failed to create queue' }, { status: 500 });
  }
}