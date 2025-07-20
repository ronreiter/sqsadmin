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

import { SQSClientConfig } from '@aws-sdk/client-sqs';

// Configure SQS client
const clientConfig: SQSClientConfig = {
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
  attributes?: Record<string, string | undefined>;
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
 * Uses the most reliable approach to retrieve all messages while minimizing visibility impact.
 */
export async function peekMessages(queueUrl: string, maxMessages: number = 10): Promise<Message[]> {
  try {
    console.log(`Attempting to peek up to ${maxMessages} messages from ${queueUrl}`);
    
    // Track seen message IDs to avoid duplicates
    const seenMessageIds = new Set<string>();
    const allMessages: Message[] = [];
    
    // First get the queue attributes to see how many messages are available
    const attributes = await getQueueAttributes(queueUrl);
    const approximateCount = parseInt(attributes.ApproximateNumberOfMessages || '0', 10);
    
    console.log(`Queue reports approximately ${approximateCount} messages available`);
    
    // Make multiple requests with different visibility timeouts to maximize coverage
    // We'll make at least 4 attempts regardless of how many messages the queue claims to have
    const requestsNeeded = Math.max(4, Math.ceil(approximateCount / 8));
    
    console.log(`Planning to make ${requestsNeeded} requests to retrieve messages`);
    
    // Track messages that we've seen but might still need to re-receive
    const alreadyProcessed = new Set<string>();
    
    for (let attempt = 0; attempt < requestsNeeded; attempt++) {
      try {
        console.log(`Starting peek attempt ${attempt + 1}`);
        
        // Each request uses a different visibility timeout to avoid collisions with previous requests
        // and to try to maximize visibility of different subsets of messages
        const visibilityTimeout = (attempt % 3) + 1; // Use 1, 2, or 3 seconds
        
        const command = new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 10, // SQS max is 10
          AttributeNames: ['All'],
          MessageAttributeNames: ['All'],
          VisibilityTimeout: visibilityTimeout, 
          // Use longer wait time for deeper queue inspection
          WaitTimeSeconds: attempt === 0 ? 3 : 1,
        });
        
        const response = await client.send(command);
        const messages = response.Messages || [];
        
        console.log(`Attempt ${attempt + 1}: Received ${messages.length} messages`);
        
        if (messages.length === 0) {
          // If we get no messages on the first attempt, the queue might be empty
          if (attempt === 0 && approximateCount === 0) {
            console.log('Queue appears to be empty, ending peek early');
            break;
          }
          
          // If this isn't the first empty response, we've likely seen everything visible
          if (attempt > 2) {
            console.log('Multiple empty responses, likely seen all available messages');
            break;
          }
          
          // Otherwise, continue trying with a different visibility timeout
          continue;
        }
        
        let newMessageCount = 0;
        
        // Process the batch of messages
        for (const message of messages) {
          const messageId = message.MessageId || '';
          
          // Skip if we've already added this message to our result set
          if (seenMessageIds.has(messageId)) {
            console.log(`Skipping already seen message ID: ${messageId}`);
            continue;
          }
          
          // Mark as processed
          seenMessageIds.add(messageId);
          alreadyProcessed.add(messageId);
          newMessageCount++;
          
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
        }
        
        console.log(`Added ${newMessageCount} new messages to result set`);
        
        // If we didn't get any new messages in this batch, try a few more times then stop
        if (newMessageCount === 0 && attempt > 2) {
          console.log('No new messages found in recent attempts, likely retrieved all visible messages');
          break;
        }
        
        // If we've exceeded the maximum requested messages, stop
        if (allMessages.length >= maxMessages) {
          console.log(`Reached maximum requested message count (${maxMessages}), stopping`);
          break;
        }
      } catch (batchError) {
        console.error(`Error in peek attempt ${attempt + 1}:`, batchError);
      }
      
      // Small delay between requests to help with SQS distributed nature
      if (attempt < requestsNeeded - 1) {
        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay
      }
    }
    
    console.log(`Peek completed, returning ${allMessages.length} messages`);
    
    // Return messages up to the maximum requested
    return allMessages.slice(0, maxMessages);
  } catch (error) {
    console.error(`Error peeking messages from queue ${queueUrl}:`, error);
    return [];
  }
}

/**
 * Receives a specific message by its ID to get a valid receipt handle for deletion.
 * This is useful when working with peek mode where receipt handles expire quickly.
 * Uses multiple attempts to maximize chances of finding the target message.
 */
export async function receiveMessageById(queueUrl: string, messageId: string): Promise<Message | null> {
  try {
    console.log(`Attempting to receive specific message ID: ${messageId} from queue ${queueUrl}`);
    
    // Make multiple attempts with different visibility timeouts
    // to increase chances of finding the target message
    const MAX_ATTEMPTS = 5;
    
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      console.log(`Attempt ${attempt + 1} to find message ID: ${messageId}`);
      
      // Fetch messages with a longer visibility timeout for deletion
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10, // Retrieve multiple messages to increase chance of finding the target
        AttributeNames: ['All'],
        MessageAttributeNames: ['All'],
        VisibilityTimeout: 30, // Use a longer timeout for deletion
        WaitTimeSeconds: attempt === 0 ? 2 : 1, // Longer wait on first attempt
      });
      
      const response = await client.send(command);
      const messages = response.Messages || [];
      
      console.log(`Received ${messages.length} messages in attempt ${attempt + 1}`);
      
      // Find the message with the matching ID
      const message = messages.find(msg => msg.MessageId === messageId);
      
      if (message) {
        console.log(`Found target message ID: ${messageId}`);
        
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
      }
      
      // If we didn't find the message and there are more attempts left,
      // wait a bit before the next try to allow for SQS distribution delays
      if (attempt < MAX_ATTEMPTS - 1) {
        console.log(`Message not found, waiting before attempt ${attempt + 2}`);
        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay
      }
    }
    
    console.log(`Failed to find message ID: ${messageId} after ${MAX_ATTEMPTS} attempts`);
    return null;
  } catch (error) {
    console.error(`Error receiving message by ID from queue ${queueUrl}:`, error);
    return null;
  }
}

export async function deleteMessage(queueUrl: string, receiptHandle: string): Promise<boolean> {
  try {
    console.log(`Attempting to delete message from queue ${queueUrl}`);
    
    // Try a few times in case of transient SQS issues
    const MAX_ATTEMPTS = 3;
    
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        console.log(`Delete attempt ${attempt + 1}`);
        
        const command = new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: receiptHandle,
        });
        
        await client.send(command);
        console.log('Message successfully deleted');
        return true;
      } catch (attemptError) {
        // If this is the last attempt, throw to be caught by outer handler
        if (attempt === MAX_ATTEMPTS - 1) {
          throw attemptError;
        }
        
        console.error(`Delete attempt ${attempt + 1} failed:`, attemptError);
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Shouldn't reach here due to throw in last attempt, but return false to be safe
    return false;
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