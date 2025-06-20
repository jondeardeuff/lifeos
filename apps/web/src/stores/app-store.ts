import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AppState {
  // Authentication
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // UI State
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
  }>;
}

export interface AppActions {
  // Authentication actions
  setUser: (user: User | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  logout: () => void;
  
  // UI actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // Notification actions
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  sidebarOpen: true,
  theme: 'system',
  notifications: [],
};

export const useAppStore = create<AppState & AppActions>()(
  persist(
    immer((set, get) => ({
      ...initialState,
      
      // Authentication actions
      setUser: (user) =>
        set((state) => {
          state.user = user;
        }),
      
      setIsAuthenticated: (isAuthenticated) =>
        set((state) => {
          state.isAuthenticated = isAuthenticated;
        }),
      
      setIsLoading: (isLoading) =>
        set((state) => {
          state.isLoading = isLoading;
        }),
      
      logout: () =>
        set((state) => {
          state.user = null;
          state.isAuthenticated = false;
          state.notifications = [];
        }),
      
      // UI actions
      toggleSidebar: () =>
        set((state) => {
          state.sidebarOpen = !state.sidebarOpen;
        }),
      
      setSidebarOpen: (open) =>
        set((state) => {
          state.sidebarOpen = open;
        }),
      
      setTheme: (theme) =>
        set((state) => {
          state.theme = theme;
        }),
      
      // Notification actions
      addNotification: (notification) =>
        set((state) => {
          const newNotification = {
            ...notification,
            id: crypto.randomUUID(),
            timestamp: new Date(),
            read: false,
          };
          state.notifications.unshift(newNotification);
          
          // Keep only the latest 50 notifications
          if (state.notifications.length > 50) {
            state.notifications = state.notifications.slice(0, 50);
          }
        }),
      
      markNotificationAsRead: (id) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          if (notification) {
            notification.read = true;
          }
        }),
      
      removeNotification: (id) =>
        set((state) => {
          state.notifications = state.notifications.filter((n) => n.id !== id);
        }),
      
      clearAllNotifications: () =>
        set((state) => {
          state.notifications = [];
        }),
    })),
    {
      name: 'lifeos-app-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        // Don't persist sensitive data like user info or notifications
      }),
    }
  )
);