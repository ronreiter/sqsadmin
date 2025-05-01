'use client';

import { useState, useEffect } from 'react';
import { QueueInfo } from '../lib/sqs';
import Link from 'next/link';

export default function QueueList() {
  const [queues, setQueues] = useState<QueueInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextToken, setNextToken] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

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

  if (queues.length === 0) {
    return (
      <div className="p-4 text-center dark:text-gray-300">
        No queues found. Make sure you have configured your AWS credentials correctly.
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Queue Name
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
              
              return (
                <tr key={queue.url}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {queue.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {queue.attributes?.ApproximateNumberOfMessages || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {queue.attributes?.ApproximateNumberOfMessagesNotVisible || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <Link 
                      href={`/queues/${encodedUrl}`} 
                      className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      View
                    </Link>
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
    </div>
  );
}