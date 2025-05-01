import { NextRequest, NextResponse } from 'next/server';
import { createQueue, CreateQueueParams } from '@/app/lib/sqs';

export async function POST(request: NextRequest) {
  try {
    console.log('Create queue API called');
    const body = await request.json();
    console.log('Request body:', body);
    
    if (!body.queueName) {
      console.log('Queue name is missing in the request');
      return NextResponse.json({ error: 'Queue name is required' }, { status: 400 });
    }
    
    // Extract and validate parameters
    const params: CreateQueueParams = {
      queueName: body.queueName,
      isFifo: body.isFifo === true,
    };
    console.log('Queue params:', params);
    
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
    
    console.log('Calling createQueue with params:', params);
    const result = await createQueue(params);
    console.log('Create queue result:', result);
    
    if (result) {
      return NextResponse.json(result);
    } else {
      console.log('Create queue failed - no result returned');
      return NextResponse.json({ error: 'Failed to create queue' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in POST /api/queues/create:', error);
    return NextResponse.json({ error: 'Failed to create queue' }, { status: 500 });
  }
}