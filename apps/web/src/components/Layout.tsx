import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

interface SidebarNavItem {
  title: string;
  href: string;
  icon?: string;
  disabled?: boolean;
}

const sidebarNavItems: SidebarNavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: '📊',
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: '📁',
    disabled: true,
  },
  {
    title: 'Tasks',
    href: '/tasks',
    icon: '✅',
    disabled: true,
  },
  {
    title: 'Calendar',
    href: '/calendar',
    icon: '📅',
    disabled: true,
  },
  {
    title: 'Finance',
    href: '/finance',
    icon: '💰',
    disabled: true,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: '⚙️',
    disabled: true,
  },
];

function Header({ sidebarOpen, toggleSidebar }: { sidebarOpen: boolean; toggleSidebar: () => void }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <button
            onClick={toggleSidebar}
            className="mr-2 px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
          >
            <span className="sr-only">Toggle sidebar</span>
            {sidebarOpen ? '←' : '→'}
          </button>
          <a className="mr-6 flex items-center space-x-2" href="/">
            <span className="text-xl">🧬</span>
            <span className="hidden font-bold sm:inline-block">Life OS</span>
          </a>
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search can be added here later */}
          </div>
          
          <nav className="flex items-center space-x-2">
            {user && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {user.firstName} {user.lastName}
                </span>
                <button
                  onClick={logout}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ sidebarOpen }: { sidebarOpen: boolean }) {

  return (
    <aside
      className={`fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block ${
        sidebarOpen ? 'md:w-64' : 'md:w-16'
      }`}
    >
      <div className="h-full py-6 pl-8 pr-6 lg:py-8">
        <nav className="space-y-2">
          {sidebarNavItems.map((item) => (
            <div key={item.href}>
              {item.disabled ? (
                <div className={`w-full flex items-center p-2 text-gray-400 cursor-not-allowed ${
                  !sidebarOpen && 'justify-center'
                }`}>
                  <span className="mr-2">{item.icon}</span>
                  {sidebarOpen && <span>{item.title}</span>}
                </div>
              ) : (
                <a href={item.href} className={`w-full flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded ${
                  !sidebarOpen && 'justify-center'
                }`}>
                  <span className="mr-2">{item.icon}</span>
                  {sidebarOpen && <span>{item.title}</span>}
                </a>
              )}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex">
        <Sidebar sidebarOpen={sidebarOpen} />
        <main
          className={`flex-1 overflow-x-hidden ${
            sidebarOpen ? 'md:ml-64' : 'md:ml-16'
          }`}
        >
          <div className="container mx-auto py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}