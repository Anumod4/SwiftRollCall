import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Users, Calendar, DollarSign, Settings, LogOut, BookOpen, Activity } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Activity },
    { name: 'Students', path: '/students', icon: Users },
    { name: 'Classes', path: '/classes', icon: BookOpen },
    { name: 'Attendance', path: '/attendance', icon: Calendar },
    { name: 'Fee Ledger', path: '/fees', icon: DollarSign },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex flex-col md:flex-row pb-24 md:pb-0 transition-colors duration-200">
      {/* Mobile Header */}
      <div className="md:hidden bg-indigo-600 dark:bg-indigo-900 text-white p-4 flex justify-between items-center shadow-md print:hidden z-20 relative">
        <div className="flex items-center gap-2">
          <img src="/assets/logo.png" alt="Logo" className="w-24 h-24 object-contain" />
          <h1 className="text-xl font-bold">SwiftRollCall</h1>
        </div>
        <button onClick={handleLogout} className="text-indigo-100 hover:text-white transition-colors">
          <LogOut size={20} />
        </button>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 flex justify-around items-center p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] z-50 print:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={clsx(
                'flex flex-col items-center p-2 min-w-[64px] transition-colors',
                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-400 hover:text-indigo-500'
              )}
            >
              <Icon size={24} className={clsx("mb-1", isActive && "fill-indigo-100")} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-indigo-800 dark:bg-zinc-900 text-white flex-col shadow-xl print:hidden sticky top-0 h-screen transition-colors duration-200">
        <div className="p-6">
          <div className="flex flex-col items-center mb-6">
            <img src="/assets/logo.png" alt="Logo" className="w-32 h-32 object-contain" />
            <h1 className="text-2xl font-bold tracking-tight">SwiftRollCall</h1>
          </div>
          <p className="text-indigo-200 text-sm mt-1">Manage your business</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                  isActive
                    ? 'bg-indigo-600 shadow-md text-white'
                    : 'text-indigo-100 hover:bg-indigo-700 hover:text-white'
                )}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* User Profile & Logout */}
        <div className="p-4 border-t border-indigo-700 dark:border-zinc-800 mt-auto">
          <div className="flex items-center gap-3 px-4 py-3 bg-indigo-900/50 dark:bg-zinc-800/50 rounded-xl mb-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500 dark:bg-indigo-600 flex items-center justify-center text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-indigo-300 dark:text-zinc-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-indigo-200 hover:bg-indigo-700 hover:text-white transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
