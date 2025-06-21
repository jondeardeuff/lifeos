import React from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { CreateTask } from './CreateTask';

const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      firstName
      lastName
      fullName
    }
  }
`;

const TASKS_QUERY = gql`
  query Tasks {
    tasks {
      id
      title
      description
      status
      priority
      createdAt
    }
  }
`;

const UPDATE_TASK_MUTATION = gql`
  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {
    updateTask(id: $id, input: $input) {
      id
      status
    }
  }
`;

const DELETE_TASK_MUTATION = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`;

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: userData, loading: userLoading } = useQuery(ME_QUERY);
  const { data: tasksData, loading: tasksLoading, refetch: refetchTasks } = useQuery(TASKS_QUERY);
  const [updateTask] = useMutation(UPDATE_TASK_MUTATION);
  const [deleteTask] = useMutation(DELETE_TASK_MUTATION);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTask({
        variables: {
          id: taskId,
          input: { status: newStatus }
        }
      });
      refetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask({ variables: { id: taskId } });
        refetchTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  if (userLoading || tasksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const user = userData?.me;
  const tasks = tasksData?.tasks || [];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">LifeOS</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.firstName}!</span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <CreateTask onTaskCreated={refetchTasks} />
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Tasks</h2>
            
            {tasks.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
                No tasks yet. Create your first task above!
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {tasks.map((task: any) => (
                    <li key={task.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                          {task.description && (
                            <p className="text-gray-500">{task.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className="text-sm rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                          
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            task.priority === 'HIGH' 
                              ? 'bg-red-100 text-red-800' 
                              : task.priority === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {task.priority}
                          </span>
                          
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};