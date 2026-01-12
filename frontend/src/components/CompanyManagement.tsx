import { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Eye, EyeOff, Key, Phone, Lock, Edit2, X, Check, Globe, LockIcon } from 'lucide-react';
import { getCompanies, addCompany, deleteCompany, updateMainCompany, toggleCompanyPrivacy } from '../utils/api';

interface Company {
  id: number;
  name: string;
  phone: string;
  password?: string;
  access_key: string;
  is_active: boolean;
  created_date?: string;
  is_private?: boolean;
  company_id?: string; // 🔒 Private ID (5-7 цифр)
}

export default function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPasswords, setShowPasswords] = useState<{ [key: number]: boolean }>({});
  const [showAccessKeys, setShowAccessKeys] = useState<{ [key: number]: boolean }>({});
  
  // 🔒 НОВОЕ: Состояния для новой системы регистрации
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'public' | 'private' | null>(null);
  
  // Форма для новой компании
  const [newCompany, setNewCompany] = useState({
    name: '',
    phone: '',
    password: '',
    access_key: ''
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Error loading companies:', error);
      alert('Ошибка загрузки компаний');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    if (!newCompany.name.trim()) {
      alert('Введите название компании');
      return;
    }
    
    // Удаляем пробелы из телефона
    const phone = newCompany.phone.replace(/\s/g, '');
    
    if (phone.length !== 9 || !/^\d+$/.test(phone)) {
      alert('Номер телефона должен содержать ровно 9 цифр');
      return;
    }
    
    if (!newCompany.password) {
      alert('Введите пароль');
      return;
    }
    
    if (newCompany.access_key.length !== 30) {
      alert('Ключ доступа должен содержать ровно 30 символов');
      return;
    }

    try {
      await addCompany({
        name: newCompany.name,
        phone: phone,
        password: newCompany.password,
        access_key: newCompany.access_key
      });
      
      alert(`✅ Компания "${newCompany.name}" успешно добавлена!`);
      
      // Очистка формы
      setNewCompany({
        name: '',
        phone: '',
        password: '',
        access_key: ''
      });
      setShowAddForm(false);
      
      // Перезагрузка списка
      loadCompanies();
    } catch (error: any) {
      console.error('Error adding company:', error);
      alert('Ошибка: ' + (error.message || 'Не удалось добавить компанию'));
    }
  };

  const handleDeleteCompany = async (company: Company) => {
    if (company.id === 1) {
      alert('❌ Главную компанию нельзя удалить!');
      return;
    }
    
    if (!confirm(`Вы уверены что хотите удалить компанию "${company.name}"?\n\nВместе с компанией будут удалены:\n• Все товары компании\n• История продаж\n• Заказы покупателей\n\nЭто действие нельзя отменить!`)) {
      return;
    }

    try {
      await deleteCompany(company.id.toString());
      alert(`✅ Компания "${company.name}" удалена`);
      loadCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Ошибка при удалении компании');
    }
  };

  const generateAccessKey = () => {
    // Генерация случайного 30-значного ключа
    const chars = '0123456789';
    let key = '';
    for (let i = 0; i < 30; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCompany({ ...newCompany, access_key: key });
  };

  const togglePasswordVisibility = (companyId: number) => {
    setShowPasswords(prev => ({
      ...prev,
      [companyId]: !prev[companyId]
    }));
  };

  const toggleAccessKeyVisibility = (companyId: number) => {
    setShowAccessKeys(prev => ({
      ...prev,
      [companyId]: !prev[companyId]
    }));
  };

  // 🔒 Функция переключения режима компании (public/private)
  const handleTogglePrivacy = async (company: Company) => {
    const newPrivateStatus = !company.is_private;
    
    // Генерируем 5-7 значный числовой ID для приватного режима
    const generatePrivateId = () => {
      const length = Math.floor(Math.random() * 3) + 5; // 5, 6 или 7 цифр
      let id = '';
      for (let i = 0; i < length; i++) {
        id += Math.floor(Math.random() * 10).toString();
      }
      return id;
    };
    
    try {
      if (newPrivateStatus) {
        // Переключаем на приватный режим
        const privateId = generatePrivateId();
        const confirmMessage = `🔒 Вы переводите компанию "${company.name}" в приватный режим.\n\nБудет сгенерирован ID для доступа: ${privateId}\n\nПокупатели смогут зарегистрироваться только с этим ID.\n\nПродолжить?`;
        
        if (!confirm(confirmMessage)) {
          return;
        }
        
        await toggleCompanyPrivacy(company.id, true, privateId);
        alert(`✅ Компания переведена в приватный режим!\n\n🔑 ID для доступа: ${privateId}\n\nСохраните этот ID для передачи покупателям.`);
      } else {
        // Переключаем на публичный режим
        const confirmMessage = `🌐 Вы переводите компанию "${company.name}" в публичный режим.\n\nКомпания станет доступна всем покупателям.\n\nПродолжить?`;
        
        if (!confirm(confirmMessage)) {
          return;
        }
        
        await toggleCompanyPrivacy(company.id, false);
        alert(`✅ Компания переведена в публичный режим!`);
      }
      
      // Перезагружаем список компаний
      loadCompanies();
    } catch (error: any) {
      console.error('Error toggling privacy:', error);
      alert('❌ Ошибка: ' + (error.message || 'Не удалось изменить режим компании'));
    }
  };

  // 📋 Функция копирования ID (с fallback для старых браузеров)
  const handleCopyId = (id: string) => {
    // Пробуем использовать современный Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(id)
        .then(() => {
          alert('✅ ID скопирован в буфер обмена!');
        })
        .catch(() => {
          // Fallback если Clipboard API не работает
          copyToClipboardFallback(id);
        });
    } else {
      // Fallback для старых браузеров или небезопасного контекста
      copyToClipboardFallback(id);
    }
  };

  // Fallback метод копирования
  const copyToClipboardFallback = (text: string) => {
    // Создаем временный input элемент
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        alert('✅ ID скопирован: ' + text);
      } else {
        alert('📋 ID компании: ' + text + '\n\nСкопируйте вручную');
      }
    } catch (err) {
      alert('📋 ID компании: ' + text + '\n\nСкопируйте вручную');
    }
    
    document.body.removeChild(textArea);
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8" />
            <div>
              <h2 className="text-2xl">Управление компаниями</h2>
              <p className="text-purple-100 text-sm mt-1">
                Всего компаний: {companies.length} | Активных: {companies.filter(c => c.is_active).length}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-white text-purple-600 px-6 py-3 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-2 font-medium"
          >
            {showAddForm ? (
              <>
                <X className="w-5 h-5" />
                Отмена
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Добавить компанию
              </>
            )}
          </button>
        </div>
      </div>

      {/* Информационный баннер */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-blue-900 mb-1">О системе компаний</h3>
            <p className="text-sm text-blue-700">
              Каждая компания работает <strong>полностью независимо</strong> с собственным складом, кассой, аналитикой и заказами. 
              Компании используют <strong>телефон (9 цифр)</strong>, <strong>пароль</strong> и <strong>30-значный ключ доступа</strong> для входа. 
              Главную компанию (ID #1) нельзя удалить.
            </p>
          </div>
        </div>
      </div>

      {/* Форма добавления компании */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-purple-200">
          <h3 className="text-xl mb-4 flex items-center gap-2">
            <Plus className="w-6 h-6 text-purple-600" />
            Добавить новую компанию
          </h3>
          
          <form onSubmit={handleAddCompany} className="space-y-4">
            {/* Название */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название компании *
              </label>
              <input
                type="text"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Например: Мой магазин"
                required
              />
            </div>

            {/* Телефон */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Номер телефона * (9 цифр)
              </label>
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={newCompany.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setNewCompany({ ...newCompany, phone: value });
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="912345678"
                  maxLength={9}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Только цифры, без пробелов и символов</p>
            </div>

            {/* Пароль */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Пароль *
              </label>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={newCompany.password}
                  onChange={(e) => setNewCompany({ ...newCompany, password: e.target.value })}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Введите пароль"
                  required
                />
              </div>
            </div>

            {/* Ключ доступа */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ключ доступа * (30 символов)
              </label>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={newCompany.access_key}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 30);
                    setNewCompany({ ...newCompany, access_key: value });
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                  placeholder="123456789012345678901234567890"
                  maxLength={30}
                  required
                />
                <button
                  type="button"
                  onClick={generateAccessKey}
                  className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
                >
                  Генерировать
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Только цифры. {newCompany.access_key.length}/30 символов
              </p>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Check className="w-5 h-5" />
                Создать компанию
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCompany({ name: '', phone: '', password: '', access_key: '' });
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Список команий */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {companies.map((company) => (
          <div
            key={company.id}
            className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all ${
              company.id === 1
                ? 'border-yellow-300 bg-yellow-50'
                : company.is_active
                ? 'border-green-200 hover:border-green-300'
                : 'border-gray-200 opacity-60'
            }`}
          >
            {/* Заголовок */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className={`w-6 h-6 ${company.id === 1 ? 'text-yellow-600' : 'text-purple-600'}`} />
                  <div>
                    <h3 className="text-xl font-medium">{company.name}</h3>
                    <p className="text-sm text-gray-500">ID: #{company.id}</p>
                  </div>
                </div>
                
                {company.id === 1 && (
                  <div className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full inline-block mb-2">
                    ⭐ Главная компания
                  </div>
                )}
              </div>

              {/* Кнопка удаленя */}
              {company.id !== 1 && (
                <button
                  onClick={() => handleDeleteCompany(company)}
                  className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                  title="Удалить компанию"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Информация */}
            <div className="space-y-3">
              {/* Телефон */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                <Phone className="w-5 h-5 text-gray-600" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Телефон</p>
                  <p className="font-medium">{company.phone}</p>
                </div>
              </div>

              {/* Пароль */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                <Lock className="w-5 h-5 text-gray-600" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Пароль</p>
                  <p className="font-medium font-mono">
                    {showPasswords[company.id] ? company.password || '•••••' : '•••••'}
                  </p>
                </div>
                <button
                  onClick={() => togglePasswordVisibility(company.id)}
                  className="text-gray-600 hover:text-gray-800 p-1"
                >
                  {showPasswords[company.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Ключ доступа */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                <Key className="w-5 h-5 text-gray-600" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Ключ доступа (30 символов)</p>
                  <p className="font-medium font-mono text-sm break-all">
                    {showAccessKeys[company.id] ? company.access_key : '••••••••••••••••••••••••••••••'}
                  </p>
                </div>
                <button
                  onClick={() => toggleAccessKeyVisibility(company.id)}
                  className="text-gray-600 hover:text-gray-800 p-1"
                >
                  {showAccessKeys[company.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Режим компании (Приватный/Публичный) */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {company.is_private ? (
                      <LockIcon className="w-5 h-5 text-purple-600" />
                    ) : (
                      <Globe className="w-5 h-5 text-green-600" />
                    )}
                    <div>
                      <p className="text-xs text-gray-600">Режим компании</p>
                      <p className="font-semibold text-gray-900">
                        {company.is_private ? '🔒 Приватный' : '🌐 Публичный'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTogglePrivacy(company)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      company.is_private
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    Изменить
                  </button>
                </div>

                {/* ID компании для приватного режима */}
                {company.is_private && company.company_id && (
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <p className="text-xs text-gray-600 mb-1">ID компании для доступа</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white px-3 py-2 rounded border border-purple-300 font-mono text-sm font-bold text-purple-900">
                        {company.company_id}
                      </code>
                      <button
                        onClick={() => handleCopyId(company.company_id || '')}
                        className="bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 transition-colors text-xs font-medium"
                      >
                        Копировать
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Покупатели используют этот ID для доступа к вашим товарам
                    </p>
                  </div>
                )}
              </div>

              {/* Статус */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-600">Статус:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  company.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {company.is_active ? '✓ Активна' : '✗ Неактивна'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {companies.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>Нет зарегистрированных компаний</p>
          <p className="text-sm mt-2">Нажмите "Добавить компанию" чтобы создать первую компанию</p>
        </div>
      )}
    </div>
  );
}