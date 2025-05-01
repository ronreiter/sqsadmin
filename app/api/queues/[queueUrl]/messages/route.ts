import { NextRequest, NextResponse } from 'next/server';
import { sendMessage, receiveMessages, deleteMessage } from '@/app/lib/sqs';

export async function GET(request: NextRequest, { params }: { params: { queueUrl: string } }) {
  try {
    // The queueUrl will be base64 encoded since it contains special characters
    const decodedQueueUrl = Buffer.from(params.queueUrl, 'base64').toString('utf-8');
    
    // Get the max messages from query parameter or default to 10
    const searchParams = request.nextUrl.searchParams;
    const maxMessages = parseInt(searchParams.get('max') || '10', 10);
    
    const messages = await receiveMessages(decodedQueueUrl, maxMessages);
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error in GET /api/queues/[queueUrl]/messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { queueUrl: string } }) {
  try {
    const decodedQueueUrl = Buffer.from(params.queueUrl, 'base64').toString('utf-8');
    const { message } = await request.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
    }
    
    // If the message is an object, stringify it
    const messageBody = typeof message === 'object' ? JSON.stringify(message) : message;
    
    const success = await sendMessage(decodedQueueUrl, messageBody);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in POST /api/queues/[queueUrl]/messages:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { queueUrl: string } }) {
  try {
    const decodedQueueUrl = Buffer.from(params.queueUrl, 'base64').toString('utf-8');
    const { receiptHandle } = await request.json();
    
    if (!receiptHandle) {
      return NextResponse.json({ error: 'Receipt handle is required' }, { status: 400 });
    }
    
    const success = await deleteMessage(decodedQueueUrl, receiptHandle);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in DELETE /api/queues/[queueUrl]/messages:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}