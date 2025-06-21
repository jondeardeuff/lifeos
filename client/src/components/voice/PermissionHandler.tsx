import React from 'react';
import { PermissionState } from './hooks/useMicrophonePermission';

interface PermissionHandlerProps {
  permissionState: PermissionState;
  onRequestPermission: () => Promise<void>;
  error: string | null;
  className?: string;
}

export const PermissionHandler: React.FC<PermissionHandlerProps> = ({
  permissionState,
  onRequestPermission,
  error,
  className = ''
}) => {
  const getPermissionMessage = () => {
    switch (permissionState) {
      case 'prompt':
        return {
          title: 'Microphone Access Required',
          message: 'This feature requires access to your microphone to record audio.',
          buttonText: 'Allow Microphone Access',
          showButton: true,
          icon: 'microphone'
        };
      case 'denied':
        return {
          title: 'Microphone Access Denied',
          message: 'Please enable microphone access in your browser settings to use voice recording.',
          buttonText: 'Try Again',
          showButton: true,
          icon: 'warning'
        };
      default:
        return {
          title: 'Checking Permissions',
          message: 'Please wait while we check your microphone permissions...',
          buttonText: '',
          showButton: false,
          icon: 'loading'
        };
    }
  };

  const permission = getPermissionMessage();

  const getInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome')) {
      return (
        <ol className="text-sm text-gray-600 mt-4 list-decimal list-inside space-y-1">
          <li>Click the microphone icon in the address bar</li>
          <li>Select "Always allow" for this site</li>
          <li>Refresh the page and try again</li>
        </ol>
      );
    } else if (userAgent.includes('firefox')) {
      return (
        <ol className="text-sm text-gray-600 mt-4 list-decimal list-inside space-y-1">
          <li>Click the shield icon in the address bar</li>
          <li>Click "Allow" for microphone access</li>
          <li>Refresh the page and try again</li>
        </ol>
      );
    } else if (userAgent.includes('safari')) {
      return (
        <ol className="text-sm text-gray-600 mt-4 list-decimal list-inside space-y-1">
          <li>Go to Safari → Preferences → Websites</li>
          <li>Select "Microphone" from the left sidebar</li>
          <li>Set this website to "Allow"</li>
          <li>Refresh the page and try again</li>
        </ol>
      );
    }
    
    return (
      <p className="text-sm text-gray-600 mt-4">
        Please check your browser settings to enable microphone access for this site.
      </p>
    );
  };

  const handleRequestPermission = async () => {
    try {
      await onRequestPermission();
    } catch (err) {
      // Error is handled by the hook
      console.error('Permission request failed:', err);
    }
  };

  const renderIcon = () => {
    switch (permission.icon) {
      case 'microphone':
        return (
          <svg className="w-12 h-12 text-indigo-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-12 h-12 text-yellow-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.184 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'loading':
        return (
          <svg className="w-12 h-12 text-gray-400 mx-auto animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`permission-handler ${className}`}>
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center max-w-md mx-auto">
        {/* Icon */}
        <div className="mb-4">
          {renderIcon()}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {permission.title}
        </h3>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          {permission.message}
        </p>

        {/* Error Message */}
        {error && (
          <div 
            className="bg-red-50 border border-red-200 rounded-md p-3 mb-4"
            role="alert"
          >
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        {permission.showButton && (
          <button
            onClick={handleRequestPermission}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            aria-label={permission.buttonText}
          >
            {permission.buttonText}
          </button>
        )}

        {/* Browser-specific Instructions */}
        {permissionState === 'denied' && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              How to enable microphone access:
            </h4>
            {getInstructions()}
          </div>
        )}

        {/* Additional Help */}
        <div className="mt-6 text-xs text-gray-500">
          <p>
            Voice recording requires a secure connection (HTTPS) and microphone access.
          </p>
        </div>
      </div>
    </div>
  );
};