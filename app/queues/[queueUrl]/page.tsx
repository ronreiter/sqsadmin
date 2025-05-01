'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QueueDetail from '@/app/components/QueueDetail';
import { QueueInfo } from '@/app/lib/sqs';

export default function QueueDetailPage({ params }: { params: { queueUrl: string } }) {
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="mb-8">
        <Link href="/" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300">
          ← Back to queue list
        </Link>
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
    </div>
  );
}