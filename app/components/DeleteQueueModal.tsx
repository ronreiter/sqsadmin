'use client';

import { useState } from 'react';

interface DeleteQueueModalProps {
  isOpen: boolean;
  queueName: string;
  queueUrl: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteQueueModal({ 
  isOpen, 
  queueName, 
  queueUrl, 
  onClose, 
  onSuccess 
}: DeleteQueueModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState('');

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      const response = await fetch('/api/queues/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ queueUrl }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete queue');
      }
      
      // Reset form and close
      setConfirmName('');
      onSuccess();
      onClose();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete queue');
      console.error('Error deleting queue:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isOpen) return null;
  
  // Check if confirmation input matches queue name
  const isConfirmed = confirmName === queueName;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4 text-center">
        <div 
          className="fixed inset-0 bg-gray-500 opacity-75 dark:bg-gray-800 dark:opacity-75 transition-opacity cursor-pointer"
          onClick={onClose}
        ></div>

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle bg-white dark:bg-gray-900 rounded-lg shadow-xl transform transition-all relative z-50">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Delete Queue
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
          
          <div className="mt-4">
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Warning: This action cannot be undone
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>
                      You are about to delete the queue <strong className="font-semibold">{queueName}</strong>. This will permanently remove the queue and all its messages. Recovery will not be possible.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="confirmName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                To confirm, type the queue name:
              </label>
              <input
                type="text"
                id="confirmName"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                className="mt-1 block w-full border dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={queueName}
              />
            </div>
            
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
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting || !isConfirmed}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Queue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}