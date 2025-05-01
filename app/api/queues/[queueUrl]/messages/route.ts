import { NextRequest, NextResponse } from 'next/server';
import { sendMessage, receiveMessages, peekMessages, deleteMessage, receiveMessageById } from '@/app/lib/sqs';

export async function GET(request: NextRequest, { params }: { params: { queueUrl: string } }) {
  try {
    // The queueUrl will be base64 encoded since it contains special characters
    const decodedQueueUrl = Buffer.from(params.queueUrl, 'base64').toString('utf-8');
    
    // Get the max messages from query parameter or default to 10
    const searchParams = request.nextUrl.searchParams;
    const maxMessages = parseInt(searchParams.get('max') || '10', 10);
    
    // Check if we should use receive or peek mode (default to peek)
    const mode = searchParams.get('mode') || 'peek';
    
    // Use the appropriate function based on the mode
    const messages = mode === 'receive' 
      ? await receiveMessages(decodedQueueUrl, maxMessages)
      : await peekMessages(decodedQueueUrl, maxMessages);
      
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
    const { receiptHandle, messageId, peekMode } = await request.json();
    
    // If in peek mode and a messageId is provided, we need to fetch a fresh receipt handle
    if (peekMode && messageId) {
      console.log('Peek mode delete requested for message ID:', messageId);
      
      // Get a fresh receipt handle for the message
      const message = await receiveMessageById(decodedQueueUrl, messageId);
      
      if (!message) {
        return NextResponse.json({ error: 'Message not found or no longer available' }, { status: 404 });
      }
      
      // Delete with the fresh receipt handle
      const success = await deleteMessage(decodedQueueUrl, message.receiptHandle);
      
      if (success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
      }
    } 
    // Standard delete with provided receipt handle
    else if (receiptHandle) {
      const success = await deleteMessage(decodedQueueUrl, receiptHandle);
      
      if (success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
      }
    } 
    // No valid delete parameters
    else {
      return NextResponse.json({ error: 'Receipt handle or message ID is required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in DELETE /api/queues/[queueUrl]/messages:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}