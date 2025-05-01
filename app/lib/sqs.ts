import { 
  SQSClient, 
  ListQueuesCommand, 
  SendMessageCommand, 
  ReceiveMessageCommand, 
  DeleteMessageCommand, 
  GetQueueAttributesCommand,
  CreateQueueCommand,
  DeleteQueueCommand
} from '@aws-sdk/client-sqs';

// Configure SQS client
const clientConfig: any = {
  region: process.env.AWS_REGION || 'us-east-1',
};

// Use local endpoint if specified (for development/testing)
if (process.env.SQS_ENDPOINT) {
  clientConfig.endpoint = process.env.SQS_ENDPOINT;
  // For local development, we don't need real credentials
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test'
  };
}

console.log('SQS Client Config:', JSON.stringify(clientConfig, null, 2));
const client = new SQSClient(clientConfig);

export type QueueInfo = {
  url: string;
  name: string;
  attributes?: Record<string, string>;
};

export type Message = {
  id: string;
  body: string;
  receiptHandle: string;
  attributes?: Record<string, any>;
  timestamp?: number; // Timestamp in milliseconds
};

export type PaginatedResponse<T> = {
  items: T[];
  nextToken?: string;
};

export async function listQueues(nextToken?: string, limit: number = 10): Promise<PaginatedResponse<QueueInfo>> {
  try {
    const command = new ListQueuesCommand({
      MaxResults: limit,
      NextToken: nextToken
    });
    const response = await client.send(command);
    
    return {
      items: (response.QueueUrls || []).map(url => ({
        url,
        name: url.split('/').pop() || url,
      })),
      nextToken: response.NextToken
    };
  } catch (error) {
    console.error('Error listing queues:', error);
    return { items: [] };
  }
}

export async function getQueueAttributes(queueUrl: string): Promise<Record<string, string>> {
  try {
    const command = new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ['All']
    });
    
    const response = await client.send(command);
    return response.Attributes || {};
  } catch (error) {
    console.error(`Error getting attributes for queue ${queueUrl}:`, error);
    return {};
  }
}

export async function sendMessage(queueUrl: string, messageBody: string): Promise<boolean> {
  try {
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: messageBody,
    });
    
    await client.send(command);
    return true;
  } catch (error) {
    console.error(`Error sending message to queue ${queueUrl}:`, error);
    return false;
  }
}

export async function receiveMessages(queueUrl: string, maxMessages: number = 10): Promise<Message[]> {
  try {
    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxMessages,
      AttributeNames: ['All'],
      MessageAttributeNames: ['All'],
      VisibilityTimeout: 30,
      WaitTimeSeconds: 0,
    });
    
    const response = await client.send(command);
    
    return (response.Messages || []).map(message => {
      // Get timestamp from SentTimestamp attribute or default to current time
      const timestamp = message.Attributes?.SentTimestamp 
        ? parseInt(message.Attributes.SentTimestamp) 
        : Date.now();
      
      return {
        id: message.MessageId || '',
        body: message.Body || '',
        receiptHandle: message.ReceiptHandle || '',
        attributes: message.Attributes,
        timestamp: timestamp,
      };
    });
  } catch (error) {
    console.error(`Error receiving messages from queue ${queueUrl}:`, error);
    return [];
  }
}

/**
 * Peek at messages without fully consuming them from the queue.
 * Uses multiple requests with a very short visibility timeout to maximize message retrieval.
 */
export async function peekMessages(queueUrl: string, maxMessages: number = 10): Promise<Message[]> {
  try {
    // Track seen message IDs to avoid duplicates
    const seenMessageIds = new Set<string>();
    const allMessages: Message[] = [];
    
    // The maximum number of batches to attempt (prevent infinite loops)
    // We use more batches than strictly needed to increase chances of seeing all messages
    const MAX_BATCHES = Math.ceil(maxMessages / 5) + 2;
    
    // Make multiple API calls to maximize our chance of seeing all messages
    for (let batchNum = 0; batchNum < MAX_BATCHES; batchNum++) {
      // Use a very short visibility timeout - just long enough to process a response
      // Each attempt will release messages quickly to make them available for future requests
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10, // Always request max allowed by SQS API
        AttributeNames: ['All'],
        MessageAttributeNames: ['All'],
        VisibilityTimeout: 1, // Very short timeout so messages quickly become visible again
        WaitTimeSeconds: batchNum === 0 ? 2 : 1, // Longer wait on first request, shorter on follow-ups
      });
      
      const response = await client.send(command);
      const messages = response.Messages || [];
      
      // If we got no messages and it's not the first attempt, we're likely done
      if (messages.length === 0 && batchNum > 0) {
        break;
      }
      
      // Process the batch of messages
      for (const message of messages) {
        const messageId = message.MessageId || '';
        
        // Skip duplicate messages
        if (seenMessageIds.has(messageId)) {
          continue;
        }
        
        // Add to the seen set
        seenMessageIds.add(messageId);
        
        // Get timestamp from SentTimestamp attribute or default to current time
        const timestamp = message.Attributes?.SentTimestamp 
          ? parseInt(message.Attributes.SentTimestamp) 
          : Date.now();
        
        allMessages.push({
          id: messageId,
          body: message.Body || '',
          receiptHandle: message.ReceiptHandle || '',
          attributes: message.Attributes,
          timestamp: timestamp,
        });
        
        // If we've reached the requested number of messages, stop
        if (allMessages.length >= maxMessages) {
          break;
        }
      }
      
      // If we've reached our target message count, we're done
      if (allMessages.length >= maxMessages) {
        break;
      }
      
      // If we got fewer than 10 messages, we might have seen them all
      // But we'll still try at least one more time to be sure
      if (messages.length < 10 && batchNum > 0) {
        break;
      }
    }
    
    return allMessages;
  } catch (error) {
    console.error(`Error peeking messages from queue ${queueUrl}:`, error);
    return [];
  }
}

/**
 * Receives a specific message by its ID to get a valid receipt handle for deletion.
 * This is useful when working with peek mode where receipt handles expire quickly.
 */
export async function receiveMessageById(queueUrl: string, messageId: string): Promise<Message | null> {
  try {
    // Fetch messages with a longer visibility timeout
    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10, // Retrieve multiple messages to increase chance of finding the target
      AttributeNames: ['All'],
      MessageAttributeNames: ['All'],
      VisibilityTimeout: 30, // Use a longer timeout for deletion
      WaitTimeSeconds: 0,
    });
    
    const response = await client.send(command);
    
    // Find the message with the matching ID
    const message = (response.Messages || []).find(msg => msg.MessageId === messageId);
    
    if (!message) {
      return null;
    }
    
    // Get timestamp from SentTimestamp attribute or default to current time
    const timestamp = message.Attributes?.SentTimestamp 
      ? parseInt(message.Attributes.SentTimestamp) 
      : Date.now();
      
    return {
      id: message.MessageId || '',
      body: message.Body || '',
      receiptHandle: message.ReceiptHandle || '',
      attributes: message.Attributes,
      timestamp: timestamp,
    };
  } catch (error) {
    console.error(`Error receiving message by ID from queue ${queueUrl}:`, error);
    return null;
  }
}

export async function deleteMessage(queueUrl: string, receiptHandle: string): Promise<boolean> {
  try {
    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });
    
    await client.send(command);
    return true;
  } catch (error) {
    console.error(`Error deleting message from queue ${queueUrl}:`, error);
    return false;
  }
}

export interface CreateQueueParams {
  queueName: string;
  isFifo?: boolean;
  delaySeconds?: number;
  messageRetentionPeriod?: number;
  visibilityTimeout?: number;
  maxMessageSize?: number;
}

export async function createQueue(params: CreateQueueParams): Promise<QueueInfo | null> {
  try {
    console.log('createQueue function called with params:', params);
    
    // Validate and format the queue name for FIFO queues
    let queueName = params.queueName;
    if (params.isFifo && !queueName.endsWith('.fifo')) {
      queueName = `${queueName}.fifo`;
    }
    console.log('Formatted queue name:', queueName);

    // Prepare queue attributes
    const attributes: Record<string, string> = {};
    
    if (params.isFifo) {
      attributes['FifoQueue'] = 'true';
      attributes['ContentBasedDeduplication'] = 'true'; // Enable content-based deduplication by default
    }
    
    if (params.delaySeconds !== undefined) {
      attributes['DelaySeconds'] = params.delaySeconds.toString();
    }
    
    if (params.messageRetentionPeriod !== undefined) {
      attributes['MessageRetentionPeriod'] = params.messageRetentionPeriod.toString();
    }
    
    if (params.visibilityTimeout !== undefined) {
      attributes['VisibilityTimeout'] = params.visibilityTimeout.toString();
    }
    
    if (params.maxMessageSize !== undefined) {
      attributes['MaximumMessageSize'] = params.maxMessageSize.toString();
    }
    
    console.log('Queue attributes:', attributes);
    console.log('SQS client config:', client.config);

    // Create the queue
    const command = new CreateQueueCommand({
      QueueName: queueName,
      Attributes: attributes
    });
    
    console.log('Sending CreateQueueCommand...');
    const response = await client.send(command);
    console.log('CreateQueueCommand response:', response);
    
    if (!response.QueueUrl) {
      console.error('No QueueUrl returned from SQS');
      throw new Error('Failed to create queue: No queue URL returned');
    }
    
    // Get the queue attributes 
    console.log('Getting queue attributes...');
    const queueAttributes = await getQueueAttributes(response.QueueUrl);
    console.log('Queue attributes response:', queueAttributes);
    
    const result = {
      url: response.QueueUrl,
      name: queueName,
      attributes: queueAttributes
    };
    
    console.log('Returning queue info:', result);
    return result;
  } catch (error) {
    console.error(`Error creating queue ${params.queueName}:`, error);
    return null;
  }
}

export async function deleteQueue(queueUrl: string): Promise<boolean> {
  try {
    const command = new DeleteQueueCommand({
      QueueUrl: queueUrl
    });
    
    await client.send(command);
    return true;
  } catch (error) {
    console.error(`Error deleting queue ${queueUrl}:`, error);
    return false;
  }
}