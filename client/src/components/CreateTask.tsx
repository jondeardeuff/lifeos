import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { VoiceRecorder } from './voice/VoiceRecorder';

const CREATE_TASK_MUTATION = gql`
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      id
      title
      description
      status
      priority
      createdAt
    }
  }
`;

interface CreateTaskProps {
  onTaskCreated: () => void;
}

export const CreateTask: React.FC<CreateTaskProps> = ({ onTaskCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  
  const [createTask, { loading }] = useMutation(CREATE_TASK_MUTATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTask({
        variables: {
          input: {
            title,
            description: description || undefined,
            priority
          }
        }
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setIsOpen(false);
      setShowVoiceInput(false);
      
      // Refresh task list
      onTaskCreated();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleVoiceRecordingComplete = async (audioBlob: Blob) => {
    setIsProcessingAudio(true);
    
    // TODO: This will be connected to speech-to-text service in P0-TASK-2
    // For now, we'll just show that the audio was captured
    console.log('Audio recorded:', audioBlob);
    
    // Simulate processing time
    setTimeout(() => {
      setIsProcessingAudio(false);
      setShowVoiceInput(false);
      // Placeholder: In the next task, this will populate the form fields
      alert(`Voice recording captured successfully! Size: ${(audioBlob.size / 1024).toFixed(2)}KB`);
    }, 1000);
  };

  const handleVoiceInputToggle = () => {
    setShowVoiceInput(!showVoiceInput);
  };

  if (!isOpen) {
    return (
      <div className="mb-6 flex space-x-3">
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          + New Task
        </button>
        <button
          onClick={() => {
            setIsOpen(true);
            setShowVoiceInput(true);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center space-x-2"
          title="Create task with voice input"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
          <span>Voice Input</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Create New Task</h3>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={handleVoiceInputToggle}
            className={`p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              showVoiceInput 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={showVoiceInput ? 'Hide voice input' : 'Show voice input'}
            disabled={isProcessingAudio}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Voice Input Section */}
      {showVoiceInput && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Voice Input</h4>
          <VoiceRecorder
            onRecordingComplete={handleVoiceRecordingComplete}
            onRecordingStart={() => console.log('Recording started')}
            onRecordingStop={() => console.log('Recording stopped')}
            disabled={isProcessingAudio}
            className="w-full"
          />
          {isProcessingAudio && (
            <div className="mt-3 text-center text-sm text-gray-600">
              Processing audio... (This will connect to speech-to-text in P0-TASK-2)
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Enter task title"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Enter task description"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setShowVoiceInput(false);
            }}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !title || isProcessingAudio}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : isProcessingAudio ? 'Processing...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
};