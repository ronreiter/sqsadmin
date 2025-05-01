'use client';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-4 flex justify-center items-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Created by{' '}
          <a 
            href="https://github.com/ronreiter" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Ron Reiter
          </a>{' '}
          (MIT License)
        </p>
      </div>
    </footer>
  );
}