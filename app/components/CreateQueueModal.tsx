'use client';

import { useState } from 'react';
import { CreateQueueParams } from '@/app/lib/sqs';

interface CreateQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateQueueModal({ isOpen, onClose, onSuccess }: CreateQueueModalProps) {
  const [queueName, setQueueName] = useState('');
  const [isFifo, setIsFifo] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState('');
  const [messageRetentionPeriod, setMessageRetentionPeriod] = useState('');
  const [visibilityTimeout, setVisibilityTimeout] = useState('');
  const [maxMessageSize, setMaxMessageSize] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!queueName.trim()) {
      setError('Queue name is required');
      return;
    }
    
    // Add .fifo suffix if it's a FIFO queue and doesn't already have it
    let formattedQueueName = queueName;
    if (isFifo && !queueName.endsWith('.fifo')) {
      formattedQueueName = `${queueName}.fifo`;
    }
    
    const params: CreateQueueParams = {
      queueName: formattedQueueName,
      isFifo,
    };
    
    // Add optional parameters if they are set
    if (delaySeconds) {
      params.delaySeconds = Number(delaySeconds);
    }
    
    if (messageRetentionPeriod) {
      params.messageRetentionPeriod = Number(messageRetentionPeriod);
    }
    
    if (visibilityTimeout) {
      params.visibilityTimeout = Number(visibilityTimeout);
    }
    
    if (maxMessageSize) {
      params.maxMessageSize = Number(maxMessageSize);
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const response = await fetch('/api/queues/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create queue');
      }
      
      // Reset form
      setQueueName('');
      setIsFifo(false);
      setDelaySeconds('');
      setMessageRetentionPeriod('');
      setVisibilityTimeout('');
      setMaxMessageSize('');
      setShowAdvanced(false);
      
      // Close modal and refresh queue list
      onSuccess();
      onClose();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create queue');
      console.error('Error creating queue:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4 text-center">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-800 dark:bg-opacity-75 transition-opacity" 
          onClick={onClose}
        ></div>

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle bg-white dark:bg-gray-900 rounded-lg shadow-xl transform transition-all">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Create New Queue
            </h3>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="mt-4">
            <div className="mb-4">
              <label htmlFor="queueName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Queue Name *
              </label>
              <input
                type="text"
                id="queueName"
                value={queueName}
                onChange={(e) => setQueueName(e.target.value)}
                className="mt-1 block w-full border dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="my-queue"
                required
              />
              {isFifo && !queueName.endsWith('.fifo') && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Note: ".fifo" will be automatically appended to the queue name.
                </p>
              )}
            </div>
            
            <div className="mb-4">
              <div className="flex items-center">
                <input
                  id="isFifo"
                  type="checkbox"
                  checked={isFifo}
                  onChange={(e) => setIsFifo(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isFifo" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  FIFO Queue
                </label>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                FIFO (First-In-First-Out) queues preserve the order of messages and guarantee exactly-once processing.
              </p>
            </div>
            
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center"
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                <svg 
                  className={`ml-1 h-4 w-4 transform ${showAdvanced ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            {showAdvanced && (
              <div className="border dark:border-gray-700 rounded-md p-4 mb-4 space-y-4">
                {!isFifo && (
                  <div>
                    <label htmlFor="delaySeconds" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Delay Seconds
                    </label>
                    <input
                      type="number"
                      id="delaySeconds"
                      value={delaySeconds}
                      onChange={(e) => setDelaySeconds(e.target.value)}
                      min="0"
                      max="900" // 15 minutes in seconds
                      className="mt-1 block w-full border dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      The time in seconds that the delivery of all messages in the queue will be delayed (0-900 seconds).
                    </p>
                  </div>
                )}
                
                <div>
                  <label htmlFor="messageRetentionPeriod" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Message Retention Period (seconds)
                  </label>
                  <input
                    type="number"
                    id="messageRetentionPeriod"
                    value={messageRetentionPeriod}
                    onChange={(e) => setMessageRetentionPeriod(e.target.value)}
                    min="60"
                    max="1209600" // 14 days in seconds
                    className="mt-1 block w-full border dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="345600" // 4 days
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    The length of time in seconds that messages will be retained (60-1,209,600 seconds / 1 minute to 14 days).
                  </p>
                </div>
                
                <div>
                  <label htmlFor="visibilityTimeout" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Visibility Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    id="visibilityTimeout"
                    value={visibilityTimeout}
                    onChange={(e) => setVisibilityTimeout(e.target.value)}
                    min="0"
                    max="43200" // 12 hours in seconds
                    className="mt-1 block w-full border dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="30"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    The period of time during which a message is hidden after being received (0-43,200 seconds / 0 seconds to 12 hours).
                  </p>
                </div>
                
                <div>
                  <label htmlFor="maxMessageSize" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Maximum Message Size (bytes)
                  </label>
                  <input
                    type="number"
                    id="maxMessageSize"
                    value={maxMessageSize}
                    onChange={(e) => setMaxMessageSize(e.target.value)}
                    min="1024"
                    max="262144" // 256 KB
                    className="mt-1 block w-full border dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="262144"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    The maximum message size in bytes (1,024-262,144 bytes / 1 KB to 256 KB).
                  </p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="mb-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !queueName}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Queue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}