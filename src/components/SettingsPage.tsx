import { User, LogOut } from 'lucide-react';
import BottomNavigation from './BottomNavigation';
import BB8Toggle from './BB8Toggle';
import { useState, useEffect } from 'react';
import { getCurrentLanguage, type Language, useTranslation } from '../utils/translations';

interface SettingsPageProps {
  userName?: string;
  userPhone?: string;
  onLogout: () => void;
  onBackToHome: () => void;
  onNavigateTo?: (page: 'home' | 'cart' | 'likes') => void;
}

export type DisplayMode = 'day' | 'night';
export type WeatherType = 'sunny' | 'rain' | 'snow' | 'storm';

export default function SettingsPage({ 
  userName, 
  userPhone,
  onLogout,
  onBackToHome,
  onNavigateTo
}: SettingsPageProps) {
  // 🌍 Язык приложения (заблокирован на русском)
  const [language, setLanguage] = useState<Language>(getCurrentLanguage());
  const t = useTranslation(language);
  
  // Слушаем изменения языка
  useEffect(() => {
    const handleLanguageChange = (e: CustomEvent) => {
      setLanguage(e.detail);
    };
    
    window.addEventListener('languageChange', handleLanguageChange as EventListener);
    
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange as EventListener);
    };
  }, []);
  
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    return (localStorage.getItem('displayMode') as DisplayMode) || 'day';
  });

  const [weatherEnabled, setWeatherEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('weatherEnabled');
    return saved === null ? true : saved === 'true';
  });

  const [colorAnimationEnabled, setColorAnimationEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('colorAnimationEnabled');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('displayMode', displayMode);
    // Notify HomePage about mode change
    window.dispatchEvent(new CustomEvent('displayModeChange', { detail: displayMode }));
  }, [displayMode]);

  useEffect(() => {
    localStorage.setItem('weatherEnabled', weatherEnabled.toString());
    // Notify HomePage about weather toggle
    window.dispatchEvent(new CustomEvent('weatherToggle', { detail: weatherEnabled }));
  }, [weatherEnabled]);

  useEffect(() => {
    localStorage.setItem('colorAnimationEnabled', colorAnimationEnabled.toString());
    // Notify HomePage about color animation toggle
    window.dispatchEvent(new CustomEvent('colorAnimationToggle', { detail: colorAnimationEnabled }));
  }, [colorAnimationEnabled]);

  return (
    <div className={`min-h-screen relative pb-20 transition-colors duration-500 ${
      displayMode === 'night' ? 'bg-gradient-to-b from-indigo-900 via-blue-900 to-slate-900' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <header className={`shadow-sm sticky top-0 z-10 transition-colors duration-500 ${
        displayMode === 'night' ? 'bg-indigo-800' : 'bg-white'
      }`}>
        <div className="container mx-auto px-4 py-4">
          <h1 className={displayMode === 'night' ? 'text-white' : ''}>Настройки аккаунта</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* User Info Card */}
        <div className={`rounded-2xl shadow-sm overflow-hidden mb-6 transition-colors duration-500 ${
          displayMode === 'night' ? 'bg-slate-800' : 'bg-white'
        }`}>
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-4 rounded-full">
                <User className="w-12 h-12" />
              </div>
              <div>
                <h2 className="text-xl mb-1">Профиль пользователя</h2>
                <p className="text-blue-100 text-sm">Ваша личная информация</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {userName && (
              <div className={`rounded-lg p-4 transition-colors duration-500 ${
                displayMode === 'night' ? 'bg-slate-700' : 'bg-gray-50'
              }`}>
                <div className={`text-sm mb-1 transition-colors duration-500 ${
                  displayMode === 'night' ? 'text-gray-400' : 'text-gray-500'
                }`}>Имя</div>
                <div className={`text-lg font-medium transition-colors duration-500 ${
                  displayMode === 'night' ? 'text-white' : 'text-gray-900'
                }`}>{userName}</div>
              </div>
            )}
            
            {userPhone && (
              <div className={`rounded-lg p-4 transition-colors duration-500 ${
                displayMode === 'night' ? 'bg-slate-700' : 'bg-gray-50'
              }`}>
                <div className={`text-sm mb-1 transition-colors duration-500 ${
                  displayMode === 'night' ? 'text-gray-400' : 'text-gray-500'
                }`}>Телефон</div>
                <div className={`text-lg font-medium transition-colors duration-500 ${
                  displayMode === 'night' ? 'text-white' : 'text-gray-900'
                }`}>{userPhone}</div>
              </div>
            )}

            {!userName && !userPhone && (
              <div className={`text-center py-8 transition-colors duration-500 ${
                displayMode === 'night' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Нет данных о пользователе
              </div>
            )}
          </div>
        </div>

        {/* Display Mode Settings */}
        <div className={`rounded-2xl shadow-sm overflow-hidden mb-6 transition-colors duration-500 ${
          displayMode === 'night' ? 'bg-slate-800' : 'bg-white'
        }`}>
          <div className="p-6">
            <div className="flex flex-col items-center gap-4">
              <h2 className={`text-lg transition-colors duration-500 ${
                displayMode === 'night' ? 'text-white' : ''
              }`}>Режим отображения</h2>
              
              {/* BB-8 Toggle для день/ночь */}
              <div className="flex flex-col items-center gap-2">
                <BB8Toggle 
                  checked={displayMode === 'night'}
                  onChange={(checked) => setDisplayMode(checked ? 'night' : 'day')}
                />
                <p className={`text-sm text-center transition-colors duration-500 ${
                  displayMode === 'night' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {displayMode === 'night' ? '🌙 Ночной режим' : '☀️ Дневной режим'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className={`w-full rounded-2xl shadow-sm p-6 transition-all flex items-center gap-4 group ${
            displayMode === 'night' ? 'bg-slate-800 hover:bg-slate-750' : 'bg-white hover:shadow-md'
          }`}
        >
          <div className="bg-red-100 p-3 rounded-full group-hover:bg-red-200 transition-colors">
            <LogOut className="w-6 h-6 text-red-600" />
          </div>
          <div className="text-left">
            <div className={`text-lg font-medium transition-colors duration-500 ${
              displayMode === 'night' ? 'text-white' : 'text-gray-900'
            }`}>Выйти из аккаунта</div>
            <div className={`text-sm transition-colors duration-500 ${
              displayMode === 'night' ? 'text-gray-400' : 'text-gray-500'
            }`}>Завершить сеанс</div>
          </div>
        </button>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentPage="settings"
        onNavigate={(page) => {
          if (page === 'settings') {
            // Already on settings, do nothing
            return;
          }
          
          if (onNavigateTo) {
            onNavigateTo(page);
          }
        }}
      />
    </div>
  );
}