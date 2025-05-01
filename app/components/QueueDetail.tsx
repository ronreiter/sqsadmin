'use client';

import { useState, useEffect, useCallback } from 'react';
import { Message } from '../lib/sqs';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-tomorrow_night';

interface QueueDetailProps {
  queueUrl: string;
  queueName: string;
  queueAttributes?: Record<string, string>;
}

export default function QueueDetail({ queueUrl, queueName, queueAttributes }: QueueDetailProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('{}');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null); // Will be set in useEffect
  const [isValidJson, setIsValidJson] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Default to most recent first
  
  // Check and update dark mode
  const checkDarkMode = useCallback(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // The API expects the encoded queueUrl directly
      // Always use peek mode with a higher message limit (50 instead of default 10)
      // This helps ensure we get as many messages as possible
      const response = await fetch(`/api/queues/${queueUrl}/messages?mode=peek&max=50`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    
    // Initial dark mode check
    checkDarkMode();
    
    // Start auto-refresh by default (5 second interval)
    const interval = window.setInterval(fetchMessages, 5000);
    setRefreshInterval(interval as unknown as number);
    
    // Create observer for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkDarkMode();
        }
      });
    });
    
    // Start observing the document element for class changes
    observer.observe(document.documentElement, { attributes: true });
    
    // Cleanup when component unmounts
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      clearInterval(interval);
      observer.disconnect();
    };
  }, [queueUrl, checkDarkMode]);

  const toggleAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    } else {
      const interval = window.setInterval(fetchMessages, 5000);
      setRefreshInterval(interval as unknown as number);
    }
  };

  const handleSendMessage = async () => {
    try {
      setSendingMessage(true);
      setSendError(null);
      
      // Try to parse as JSON
      let messageBody;
      try {
        messageBody = JSON.parse(messageInput);
      } catch (e) {
        setSendError('Invalid JSON format: ' + (e instanceof Error ? e.message : 'Unknown error'));
        setSendingMessage(false);
        return;
      }
      
      // The API expects the encoded queueUrl directly
      const response = await fetch(`/api/queues/${queueUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageBody }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      
      // Clear the input and refetch messages
      setMessageInput('{}');
      fetchMessages();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send message');
      console.error('Error sending message:', err);
    } finally {
      setSendingMessage(false);
    }
  };
  
  const validateJson = (input: string) => {
    try {
      JSON.parse(input);
      setIsValidJson(true);
      setSendError(null);
      return true;
    } catch (e) {
      setIsValidJson(false);
      setSendError('Invalid JSON format: ' + (e instanceof Error ? e.message : 'Unknown error'));
      return false;
    }
  };

  const [deletingMessageIds, setDeletingMessageIds] = useState<Set<string>>(new Set());
  
  const handleDeleteMessage = async (message: Message) => {
    try {
      const messageId = message.id;
      setDeletingMessageIds(prev => new Set([...prev, messageId]));
      
      // The API expects the encoded queueUrl directly
      const response = await fetch(`/api/queues/${queueUrl}/messages`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId, peekMode: true }), // Always use peek mode
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete message');
      }
      
      // Remove the message from the list
      setMessages(messages.filter(msg => msg.id !== messageId));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message');
      console.error('Error deleting message:', err);
    } finally {
      setDeletingMessageIds(prev => {
        const updated = new Set(prev);
        updated.delete(message.id);
        return updated;
      });
    }
  };

  const formatMessageBody = (body: string) => {
    try {
      // Try to parse as JSON
      const parsedBody = JSON.parse(body);
      return (
        <div className="font-mono">
          <JsonView 
            data={parsedBody} 
            shouldExpandNode={() => true} // Expand all nodes by default
          />
        </div>
      );
    } catch {
      // If it's not JSON, display as is
      return <pre className="whitespace-pre-wrap font-mono">{body}</pre>;
    }
  };

  // Get detailed information from the messages
  const getQueueStats = () => {
    const messageCount = messages.length;
    const avgMessageSize = messageCount > 0 
      ? messages.reduce((sum, msg) => sum + msg.body.length, 0) / messageCount 
      : 0;
    
    // Find the oldest message timestamp
    let oldestMessageTime = 'N/A';
    if (messageCount > 0) {
      const timestamps = messages.map(msg => msg.timestamp || 0).filter(t => t > 0);
      if (timestamps.length > 0) {
        const oldestTimestamp = Math.min(...timestamps);
        oldestMessageTime = new Date(oldestTimestamp).toLocaleString();
      }
    }
    
    return {
      messageCount,
      avgMessageSize: Math.round(avgMessageSize),
      oldestMessage: oldestMessageTime,
      activeRefresh: refreshInterval !== null
    };
  };

  const stats = getQueueStats();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Send Message Section */}
        <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-700 sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Send a message to {queueName}</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
              <p>Enter a JSON message to send to this queue.</p>
            </div>
            <div className="mt-5">
              <AceEditor
                mode="json"
                theme={isDarkMode ? 'tomorrow_night' : 'github'}
                value={messageInput}
                onChange={(value) => {
                  setMessageInput(value);
                  validateJson(value);
                }}
                name="message-editor"
                editorProps={{ $blockScrolling: true }}
                setOptions={{
                  showLineNumbers: true,
                  tabSize: 2,
                  useWorker: false,
                }}
                width="100%"
                height="200px"
                fontSize={14}
                showPrintMargin={false}
                className={`rounded-md border ${isValidJson ? 'border-gray-300 dark:border-gray-600' : 'border-red-500 dark:border-red-500'}`}
                style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}
              />
            </div>
            {sendError && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                {sendError}
              </div>
            )}
            <div className="mt-5">
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={sendingMessage || !messageInput.trim() || !isValidJson}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {sendingMessage ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>

        {/* Queue Details Section */}
        <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-700 sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Queue Details</h3>
            <div className="mt-5">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                {/*<div className="sm:col-span-2">*/}
                {/*  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">URL</dt>*/}
                {/*  <dd className="mt-1 text-sm text-gray-900 dark:text-white overflow-hidden text-ellipsis">*/}
                {/*    {(() => {*/}
                {/*      try {*/}
                {/*        return Buffer.from(queueUrl, 'base64').toString('utf-8');*/}
                {/*      } catch (e) {*/}
                {/*        return 'Invalid queue URL format';*/}
                {/*      }*/}
                {/*    })()}*/}
                {/*  </dd>*/}
                {/*</div>*/}
                
                {/* SQS Specific Metrics */}
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Messages Available</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white font-semibold">
                    {queueAttributes?.ApproximateNumberOfMessages || '0'}
                  </dd>
                </div>
                
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Messages In Flight</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white font-semibold">
                    {queueAttributes?.ApproximateNumberOfMessagesNotVisible || '0'}
                  </dd>
                </div>
                
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Delayed Messages</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {queueAttributes?.ApproximateNumberOfMessagesDelayed || '0'}
                  </dd>
                </div>
                
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Message Size</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{stats.avgMessageSize} bytes</dd>
                </div>
                
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Oldest Message</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{stats.oldestMessage}</dd>
                </div>

                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Visibility Timeout</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {queueAttributes?.VisibilityTimeout ? `${queueAttributes.VisibilityTimeout} seconds` : 'N/A'}
                  </dd>
                </div>
                
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Message Retention</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {queueAttributes?.MessageRetentionPeriod ? 
                      `${Math.floor(parseInt(queueAttributes.MessageRetentionPeriod) / 86400)} days` : 
                      'N/A'}
                  </dd>
                </div>
                
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Delay Seconds</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {queueAttributes?.DelaySeconds ? `${queueAttributes.DelaySeconds} seconds` : '0 seconds'}
                  </dd>
                </div>
                
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Queue Type</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {queueAttributes?.FifoQueue === 'true' ? 
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100">
                        FIFO
                      </span> : 
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                        Standard
                      </span>}
                  </dd>
                </div>
                
                <div className="sm:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Auto-refresh Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${stats.activeRefresh ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    {stats.activeRefresh ? 'Active (5s)' : 'Inactive'}
                    <button
                      type="button"
                      onClick={toggleAutoRefresh}
                      className="ml-4 inline-flex items-center px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {refreshInterval ? 'Stop' : 'Start'}
                    </button>
                  </dd>
                </div>
                
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={fetchMessages}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 disabled:opacity-50"
                  >
                    {loading ? 'Refreshing...' : 'Refresh Messages'}
                  </button>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-700 sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Messages in {queueName}</h3>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={toggleAutoRefresh}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              >
                {refreshInterval ? 'Stop Auto-refresh' : 'Auto-refresh (5s)'}
              </button>
              <button
                type="button"
                onClick={fetchMessages}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="mt-5">
            {messages.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
                No messages available in this queue.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Add sort direction control */}
                <div className="flex justify-end mb-4">
                  <div className="inline-flex shadow-sm rounded-md">
                    <button
                      type="button"
                      onClick={() => setSortDirection('asc')}
                      className={`relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 text-sm font-medium ${
                        sortDirection === 'asc' 
                          ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-100' 
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Oldest First
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortDirection('desc')}
                      className={`relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 text-sm font-medium ${
                        sortDirection === 'desc' 
                          ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-100' 
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Newest First
                    </button>
                  </div>
                </div>
                
                {/* Sort messages by timestamp */}
                {[...messages]
                  .sort((a, b) => {
                    const aTimestamp = a.timestamp || 0;
                    const bTimestamp = b.timestamp || 0;
                    return sortDirection === 'asc' ? aTimestamp - bTimestamp : bTimestamp - aTimestamp;
                  })
                  .map((message) => (
                  <div key={message.id} className="border border-gray-200 dark:border-gray-700 rounded-md p-4 dark:bg-gray-700">
                    <div className="flex justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          Message ID: {message.id}
                        </div>
                        {message.timestamp && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Date: {new Date(message.timestamp).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(message)}
                        disabled={deletingMessageIds.has(message.id)}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 dark:text-red-200 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {deletingMessageIds.has(message.id) ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Deleting...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </span>
                        )}
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                      {formatMessageBody(message.body)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}