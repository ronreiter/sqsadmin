import QueueList from './components/QueueList';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SQS Admin</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your Amazon SQS queues</p>
      </header>
      
      <main>
        <section className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-700 rounded-lg p-6">
          <QueueList />
        </section>
      </main>
    </div>
  );
}