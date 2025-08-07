import TaskList from '@/components/TaskList';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                External Tracking - ClickUp Tasks
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Real-time task tracking from ClickUp
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Task Overview</h2>
          <p className="text-gray-600">
            View and track all open tasks and subtasks from your ClickUp workspace. 
            Tasks are automatically filtered to show only open items with their current status, 
            time estimates, assigned developers, due dates, priorities, and comment counts.
          </p>
        </div>

        {/* Task List */}
        <TaskList className="w-full" />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              External Tracking System - ClickUp Integration
            </div>
            <div className="text-sm text-gray-500">
              Data synced from ClickUp API
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
