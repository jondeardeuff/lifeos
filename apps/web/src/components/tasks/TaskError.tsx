import React from 'react';
import { Card, CardContent, Button } from '@lifeos/ui';

interface TaskErrorProps {
  error: string | Error;
  onRetry?: () => void;
  onClose?: () => void;
  title?: string;
  className?: string;
}

const TaskError: React.FC<TaskErrorProps> = ({
  error,
  onRetry,
  onClose,
  title = 'Error',
  className = '',
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return (
    <Card className={`border-red-200 bg-red-50 ${className}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-medium text-red-800 mb-1">
              {title}
            </h3>
            <p className="text-sm text-red-700 mb-4">
              {errorMessage}
            </p>
            
            <div className="flex items-center gap-3">
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </Button>
              )}
              
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-red-700 hover:bg-red-100"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface TaskListErrorProps {
  error: string | Error;
  onRetry?: () => void;
  onCreateTask?: () => void;
  className?: string;
}

const TaskListError: React.FC<TaskListErrorProps> = ({
  error,
  onRetry,
  onCreateTask,
  className = '',
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return (
    <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
      <Card className="border-red-200 bg-red-50 max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium text-red-800 mb-2">
              Failed to Load Tasks
            </h3>
            <p className="text-sm text-red-700 mb-6">
              {errorMessage}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {onRetry && (
                <Button
                  onClick={onRetry}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry
                </Button>
              )}
              
              {onCreateTask && (
                <Button
                  variant="outline"
                  onClick={onCreateTask}
                  className="flex-1 text-red-700 border-red-300 hover:bg-red-100"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Task
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface TaskNotFoundProps {
  onCreateTask?: () => void;
  onGoBack?: () => void;
  className?: string;
}

const TaskNotFound: React.FC<TaskNotFoundProps> = ({
  onCreateTask,
  onGoBack,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Task Not Found
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              The task you're looking for doesn't exist or has been deleted.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {onGoBack && (
                <Button
                  variant="outline"
                  onClick={onGoBack}
                  className="flex-1"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Go Back
                </Button>
              )}
              
              {onCreateTask && (
                <Button
                  onClick={onCreateTask}
                  className="flex-1"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Task
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface NetworkErrorProps {
  onRetry?: () => void;
  className?: string;
}

const NetworkError: React.FC<NetworkErrorProps> = ({
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
      <Card className="border-orange-200 bg-orange-50 max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium text-orange-800 mb-2">
              Connection Error
            </h3>
            <p className="text-sm text-orange-700 mb-6">
              Unable to connect to the server. Please check your internet connection and try again.
            </p>
            
            {onRetry && (
              <Button
                onClick={onRetry}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { TaskError, TaskListError, TaskNotFound, NetworkError };