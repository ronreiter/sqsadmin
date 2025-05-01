'use client';

import { useState, useEffect } from 'react';
import { QueueInfo } from '../lib/sqs';
import Link from 'next/link';
import CreateQueueModal from './CreateQueueModal';
import DeleteQueueModal from './DeleteQueueModal';

export default function QueueList() {
  const [queues, setQueues] = useState<QueueInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextToken, setNextToken] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<QueueInfo | null>(null);

  const fetchQueues = async (pageToken?: string) => {
    try {
      setLoading(true);
      const url = new URL('/api/queues', window.location.origin);
      if (pageToken) {
        url.searchParams.append('nextToken', pageToken);
      }
      url.searchParams.append('limit', PAGE_SIZE.toString());
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Failed to fetch queues: ${response.statusText}`);
      }
      
      const data = await response.json();
      setQueues(data.items);
      setNextToken(data.nextToken);
      setHasMore(!!data.nextToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch queues');
      console.error('Error fetching queues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, []);

  const handleNextPage = () => {
    if (nextToken) {
      fetchQueues(nextToken);
      setPage(page + 1);
    }
  };

  const handlePreviousPage = () => {
    // Unfortunately, SQS listing doesn't support going backwards in pagination
    // We'll have to start from the beginning and go forward
    if (page > 1) {
      fetchQueues();
      setPage(1);
    }
  };

  if (loading && queues.length === 0) {
    return <div className="p-4 text-center dark:text-gray-300">Loading queues...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error: {error}
      </div>
    );
  }

  const handleOpenDeleteModal = (queue: QueueInfo) => {
    setSelectedQueue(queue);
    setIsDeleteModalOpen(true);
  };
  
  const handleQueueCreated = () => {
    fetchQueues();
  };
  
  const handleQueueDeleted = () => {
    fetchQueues();
  };
  
  if (queues.length === 0 && !loading) {
    return (
      <div className="p-4">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Queue
          </button>
        </div>
        <div className="text-center dark:text-gray-300 p-8 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <svg className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="mt-2 text-lg font-medium">No queues found</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create your first SQS queue to get started.
          </p>
        </div>
        
        <CreateQueueModal 
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleQueueCreated}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Your Queues</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Queue
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Queue Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Messages Available
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Messages In Flight
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {queues.map((queue) => {
              // Base64 encode the queue URL to use in the URL route
              const encodedUrl = Buffer.from(queue.url).toString('base64');
              const isFifo = queue.attributes?.FifoQueue === 'true';
              
              return (
                <tr key={queue.url}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {queue.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {isFifo ? 
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100">FIFO</span> : 
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">Standard</span>
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {queue.attributes?.ApproximateNumberOfMessages || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {queue.attributes?.ApproximateNumberOfMessagesNotVisible || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 flex space-x-2">
                    <Link 
                      href={`/queues/${encodedUrl}`} 
                      className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleOpenDeleteModal(queue)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      <div className="mt-4 flex justify-between items-center px-6 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Page {page}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handlePreviousPage}
            disabled={page === 1 || loading}
            className={`px-4 py-2 border rounded-md text-sm font-medium ${
              page === 1 || loading
                ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 cursor-pointer'
            }`}
          >
            Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={!hasMore || loading}
            className={`px-4 py-2 border rounded-md text-sm font-medium ${
              !hasMore || loading
                ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 cursor-pointer'
            }`}
          >
            Next
          </button>
        </div>
        {loading && <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>}
      </div>
      
      {/* Modals */}
      <CreateQueueModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleQueueCreated}
      />
      
      {selectedQueue && (
        <DeleteQueueModal
          isOpen={isDeleteModalOpen}
          queueName={selectedQueue.name}
          queueUrl={selectedQueue.url}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedQueue(null);
          }}
          onSuccess={handleQueueDeleted}
        />
      )}
    </div>
  );
}