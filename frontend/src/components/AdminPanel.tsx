import React, { useState, useEffect } from 'react';
import { Shield, LogOut, Users, Trash2, Building2, Save, RefreshCw, Eye, EyeOff, CreditCard, Megaphone, MessageCircle } from 'lucide-react';
import { getUsers, deleteAllUsers, deleteAllProducts, getMainCompany, updateMainCompany } from '../utils/api';
import CompanyManagement from './CompanyManagement';
import PaymentSettings from './PaymentSettings';
import PaymentHistoryPanel from './PaymentHistoryPanel';
import AdminAdsPanel from './AdminAdsPanel';
import AdminChatPanel from './AdminChatPanel';
import { broadcastReload } from '../utils/reloadBroadcast';
import { getCurrentLanguage, type Language, useTranslation } from '../utils/translations';

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'payment' | 'history' | 'ads' | 'chat'>('overview');
  
  // 🌍 Система локализации для админа (заблокирована на русском)
  const [language, setLanguage] = useState<Language>(getCurrentLanguage());
  const t = useTranslation(language);
  
  const [stats, setStats] = useState({
    users: 0
  });
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState({
    name: '',
    phone: '',
    password: '',
    access_key: ''
  });
  const [originalCompanyData, setOriginalCompanyData] = useState({
    name: '',
    phone: '',
    password: '',
    access_key: ''
  });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAccessKey, setShowAccessKey] = useState(false);

  useEffect(() => {
    loadData();
    
    // 🔄 Auto-refresh every 10 seconds
    console.log('🔄 [Admin] Setting up auto-refresh every 10 seconds');
    const intervalId = setInterval(() => {
      console.log('🔄 [Admin] Auto-refreshing data...');
      loadData();
    }, 10000); // 10 seconds
    
    // Cleanup on unmount
    return () => {
      console.log('🛑 [Admin] Stopping auto-refresh');
      clearInterval(intervalId);
    };
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([loadStats(), loadCompanyData()]);
    } catch (error) {
      console.error('Error loading admin data:', error);
      alert('Ошибка загрузки данных админа');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const users = await getUsers();
    setStats({
      users: users.length
    });
  };

  const loadCompanyData = async () => {
    try {
      console.log(' Loading company data...');
      const company = await getMainCompany();
      console.log('✅ Company data loaded:', company);
      const data = {
        name: company.name || '',
        phone: company.phone || '',
        password: company.password || '',
        access_key: company.access_key || ''
      };
      setCompanyData(data);
      setOriginalCompanyData(data);
    } catch (error) {
      // Ошибка уже обработана в getMainCompany, но на всякий случай
      console.warn('⚠️ Error in loadCompanyData (fallback to defaults):', error);
      const { MAIN_COMPANY } = await import('../utils/api');
      const defaultData = {
        name: MAIN_COMPANY.name,
        phone: MAIN_COMPANY.phone,
        password: MAIN_COMPANY.password,
        access_key: MAIN_COMPANY.access_key
      };
      setCompanyData(defaultData);
      setOriginalCompanyData(defaultData);
    }
  };

  const handleSaveCompany = async () => {
    try {
      // Валидация
      if (!companyData.name.trim()) {
        alert('Введите название компании');
        return;
      }
      
      if (!companyData.phone.trim()) {
        alert('Введите номер телефона');
        return;
      }
      
      const phoneDigits = companyData.phone.replace(/\s/g, '');
      if (phoneDigits.length !== 9 || !/^\d+$/.test(phoneDigits)) {
        alert('Номер телефона должен содержать 9 цифр');
        return;
      }
      
      if (!companyData.password.trim()) {
        alert('Введите пароль');
        return;
      }
      
      if (!companyData.access_key.trim()) {
        alert('Введите ключ доступа');
        return;
      }
      
      if (companyData.access_key.length !== 30 || !/^\d+$/.test(companyData.access_key)) {
        alert('Ключ доступа должен содержать 30 цифр');
        return;
      }

      setSaving(true);
      
      await updateMainCompany({
        name: companyData.name,
        phone: companyData.phone,
        password: companyData.password,
        access_key: companyData.access_key
      });
      
      setOriginalCompanyData(companyData);
      alert('✅ Данные компании успешно обновлены!');
      
      // Перезагрузить данные
      await loadCompanyData();
    } catch (error) {
      console.error('Error saving company:', error);
      alert('Ошибка при сохранении данных компании');
    } finally {
      setSaving(false);
    }
  };

  const handleResetCompany = () => {
    setCompanyData(originalCompanyData);
  };

  const hasChanges = JSON.stringify(companyData) !== JSON.stringify(originalCompanyData);

  const clearAllData = async (type: 'users' | 'all') => {
    const confirmMessage = 
      type === 'users' ? 'Удалить всех пользователей?' :
      'Удалить ВСЕ данные пользователей? Это действие нельзя отменить!';
    
    if (!confirm(confirmMessage)) return;

    try {
      await deleteAllUsers();
      await loadStats();
      alert('Данные упешно удалены!');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Ошибка при удалении данных');
    }
  };

  const handleReloadAllDevices = async () => {
    if (!confirm('🔄 Перезагрузить ВСЕ устройства?\n\nВсе смартфоны, планшеты и компьютеры с открытым приложением будут автоматически перезагружены через 2 секунды.\n\nЭто полезно после изменения настроек оплаты или других системных параметров.')) {
      return;
    }

    try {
      console.log('📡 [Admin] Отправка команды перезагрузки...');
      
      await broadcastReload('Админ');
      
      alert('✅ Команда перезагрузки отправлена!\n\nВсе устройства будут перезагружены через 2 секунды.\n\nВаше устройство тоже будет перезагружено.');
      
      // Перезагружаем также админ панель через 2 секунды
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('❌ Error broadcasting reload:', error);
      alert('Ошибка при отправке команды перезагрузки');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar слева */}
      <aside className="w-64 bg-gradient-to-b from-red-600 to-red-700 text-white shadow-lg flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">Админ Панель</h1>
              <p className="text-red-100 text-xs">Полный контроль</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                activeTab === 'overview'
                  ? 'bg-white text-red-600 shadow-lg'
                  : 'text-white hover:bg-white/10 hover:scale-y-105'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="font-medium">Обзор</span>
            </button>

            <button
              onClick={() => setActiveTab('companies')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                activeTab === 'companies'
                  ? 'bg-white text-red-600 shadow-lg'
                  : 'text-white hover:bg-white/10 hover:scale-y-105'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span className="font-medium">Компании</span>
            </button>

            <button
              onClick={() => setActiveTab('payment')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                activeTab === 'payment'
                  ? 'bg-white text-red-600 shadow-lg'
                  : 'text-white hover:bg-white/10 hover:scale-y-105'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="font-medium">Оплата</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                activeTab === 'history'
                  ? 'bg-white text-red-600 shadow-lg'
                  : 'text-white hover:bg-white/10 hover:scale-y-105'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="font-medium">История</span>
            </button>

            <button
              onClick={() => setActiveTab('ads')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                activeTab === 'ads'
                  ? 'bg-white text-red-600 shadow-lg'
                  : 'text-white hover:bg-white/10 hover:scale-y-105'
              }`}
            >
              <Megaphone className="w-5 h-5" />
              <span className="font-medium">Реклама</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                activeTab === 'chat'
                  ? 'bg-white text-red-600 shadow-lg'
                  : 'text-white hover:bg-white/10 hover:scale-y-105'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Чат</span>
            </button>
          </nav>
        </div>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 w-64 p-6">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Выход</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-8">
          {/* Tab Content */}
          {activeTab === 'overview' ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-6 h-6 text-blue-600" />
                    <div className="text-gray-600">Пользователи</div>
                  </div>
                  <div className="text-3xl text-blue-600">{stats.users}</div>
                </div>
              </div>

              {/* Company Settings */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Building2 className="w-6 h-6 text-purple-600" />
                  <h2 className="text-purple-900">Настройки главной компании</h2>
                </div>

                <div className="space-y-4">
                  {/* Company Name */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Название компании
                    </label>
                    <input
                      type="text"
                      value={companyData.name}
                      onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                      placeholder="Главная Компания"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Номер телефона (9 цифр)
                    </label>
                    <input
                      type="text"
                      value={companyData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                        setCompanyData({ ...companyData, phone: value });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                      placeholder="909383572"
                      maxLength={9}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Текущий: {companyData.phone || 'не установлен'}
                    </p>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Пароль компании
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={companyData.password}
                        onChange={(e) => setCompanyData({ ...companyData, password: e.target.value })}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                        placeholder="24067"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Access Key */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Ключ доступа (30 цифр)
                    </label>
                    <div className="relative">
                      <input
                        type={showAccessKey ? 'text' : 'password'}
                        value={companyData.access_key}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 30);
                          setCompanyData({ ...companyData, access_key: value });
                        }}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
                        placeholder="123456789012345678901234567890"
                        maxLength={30}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccessKey(!showAccessKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showAccessKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {companyData.access_key.length}/30 цифр
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-4">
                    <button
                      onClick={handleSaveCompany}
                      disabled={!hasChanges || saving}
                      className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                        hasChanges && !saving
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Сохранение...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Сохранить изменения
                        </>
                      )}
                    </button>

                    {hasChanges && (
                      <button
                        onClick={handleResetCompany}
                        disabled={saving}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Отменить
                      </button>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <h3 className="text-blue-900 mb-2">ℹ️ Важная информация</h3>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• После изменения данных все должны использовать новые данные для входа</li>
                    <li>• Телефон: 9 цифр (без пробелов и спецсимволов)</li>
                    <li>• Ключ доступа: строго 30 цифр</li>
                    <li>• Пароль: может быть любой длины</li>
                  </ul>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-red-200">
                <h2 className="text-red-600 mb-6">Опасная зона</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                    <div>
                      <div className="text-gray-900">Удалить всех пользователей</div>
                      <div className="text-sm text-gray-600">Удалит всех зарегистрированных покупателей</div>
                    </div>
                    <button
                      onClick={() => clearAllData('users')}
                      className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Удалить
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-red-100 rounded-lg border-2 border-red-300">
                    <div>
                      <div className="text-gray-900">Удалить ВСЕ данные пользователей</div>
                      <div className="text-sm text-gray-600">Полная очистка системы (необратимо!)</div>
                    </div>
                    <button
                      onClick={() => clearAllData('all')}
                      className="flex items-center gap-2 bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Удалить всё
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-red-100 rounded-lg border-2 border-red-300">
                    <div>
                      <div className="text-gray-900">Перезагрузить ВСЕ устройства</div>
                      <div className="text-sm text-gray-600">Перезагрузит все смартфоны, планшеты и компьютеры с открытым приложением</div>
                    </div>
                    <button
                      onClick={handleReloadAllDevices}
                      className="flex items-center gap-2 bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Перезагрузить
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'companies' ? (
            <CompanyManagement />
          ) : activeTab === 'payment' ? (
            <PaymentSettings />
          ) : activeTab === 'history' ? (
            <PaymentHistoryPanel />
          ) : activeTab === 'ads' ? (
            <AdminAdsPanel />
          ) : (
            <AdminChatPanel />
          )}
        </div>
      </div>
    </div>
  );
}