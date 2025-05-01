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
    
    return (response.Messages || []).map(message => ({
      id: message.MessageId || '',
      body: message.Body || '',
      receiptHandle: message.ReceiptHandle || '',
      attributes: message.Attributes,
    }));
  } catch (error) {
    console.error(`Error receiving messages from queue ${queueUrl}:`, error);
    return [];
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