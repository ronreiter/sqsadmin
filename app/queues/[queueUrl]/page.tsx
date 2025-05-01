'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QueueDetail from '@/app/components/QueueDetail';
import DeleteQueueModal from '@/app/components/DeleteQueueModal';
import { QueueInfo } from '@/app/lib/sqs';

export default function QueueDetailPage({ params }: { params: { queueUrl: string } }) {
  const router = useRouter();
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const fetchQueueInfo = async () => {
      try {
        setLoading(true);
        // Check if params and queueUrl are available
        if (!params?.queueUrl) {
          throw new Error('Queue URL parameter is missing');
        }
        
        // Safely get the queueUrl
        const queueUrlParam = params.queueUrl;
        
        // Use the direct API endpoint to get queue details
        const response = await fetch(`/api/queues/${queueUrlParam}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch queue: ${response.statusText}`);
        }
        
        const queue = await response.json();
        
        if (queue) {
          setQueueInfo(queue);
        } else {
          throw new Error('Queue not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch queue information');
        console.error('Error fetching queue info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQueueInfo();
  }, [params?.queueUrl]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12 dark:text-gray-300">Loading queue information...</div>
      </div>
    );
  }

  if (error || !queueInfo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-400">
                {error || 'Failed to load queue information'}
              </p>
            </div>
          </div>
        </div>
        <Link href="/" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300">
          ← Back to queue list
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <Link href="/" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300">
          ← Back to queue list
        </Link>
        
        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Queue
        </button>
      </div>
      
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{queueInfo.name}</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 break-all">{queueInfo.url}</p>
      </header>
      
      <main>
        <QueueDetail 
          queueUrl={params.queueUrl || ''} 
          queueName={queueInfo.name} 
          queueAttributes={queueInfo.attributes}
        />
      </main>
      
      {/* Delete Modal */}
      {queueInfo && (
        <DeleteQueueModal
          isOpen={isDeleteModalOpen}
          queueName={queueInfo.name}
          queueUrl={queueInfo.url}
          onClose={() => setIsDeleteModalOpen(false)}
          onSuccess={() => router.push('/')}
        />
      )}
    </div>
  );
}