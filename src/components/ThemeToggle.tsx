import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../utils/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: 'light' as const, icon: Sun, label: 'Светлая' },
    { id: 'dark' as const, icon: Moon, label: 'Темная' },
    { id: 'auto' as const, icon: Monitor, label: 'Авто' }
  ];

  return (
    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {themes.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
            theme === id
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
          title={label}
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
