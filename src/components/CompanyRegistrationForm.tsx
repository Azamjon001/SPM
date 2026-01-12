import { useState } from 'react';
import { Building2, User, Users as UsersIcon, Phone, Key, Lock, Eye, EyeOff, ArrowLeft, Sparkles } from 'lucide-react';

interface CompanyRegistrationFormProps {
  mode: 'public' | 'private';
  onBack: () => void;
  onSubmit: (data: CompanyFormData) => void;
}

export interface CompanyFormData {
  mode: 'public' | 'private';
  name: string;
  phone: string;
  password: string;
  access_key: string;
  // Для приватного режима
  first_name?: string;
  last_name?: string;
  company_id?: string;
}

export default function CompanyRegistrationForm({ mode, onBack, onSubmit }: CompanyRegistrationFormProps) {
  const [formData, setFormData] = useState<CompanyFormData>({
    mode,
    name: '',
    phone: '',
    password: '',
    access_key: '',
    first_name: '',
    last_name: '',
    company_id: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showAccessKey, setShowAccessKey] = useState(false);

  const generateAccessKey = () => {
    const chars = '0123456789';
    let key = '';
    for (let i = 0; i < 30; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, access_key: key });
  };

  const generateCompanyId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, company_id: id });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Базовая валидация
    if (mode === 'private') {
      if (!formData.first_name?.trim()) {
        alert('Введите имя');
        return;
      }
      if (!formData.last_name?.trim()) {
        alert('Введите фамилию');
        return;
      }
      if (!formData.company_id?.trim()) {
        alert('Введите ID компании');
        return;
      }
      if (formData.company_id.length < 6) {
        alert('ID компании должен содержать минимум 6 символов');
        return;
      }
    }

    if (!formData.name.trim()) {
      alert('Введите название компании');
      return;
    }

    const phone = formData.phone.replace(/\s/g, '');
    if (phone.length !== 9 || !/^\d+$/.test(phone)) {
      alert('Номер телефона должен содержать ровно 9 цифр');
      return;
    }

    if (!formData.password) {
      alert('Введите пароль');
      return;
    }

    if (formData.access_key.length !== 30) {
      alert('Ключ доступа должен содержать ровно 30 символов');
      return;
    }

    onSubmit({ ...formData, phone });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Кнопка назад */}
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-white hover:text-purple-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Назад к выбору режима
        </button>

        {/* Карточка формы */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                mode === 'public' 
                  ? 'bg-gradient-to-br from-green-500 to-green-600' 
                  : 'bg-gradient-to-br from-purple-500 to-purple-600'
              }`}>
                {mode === 'public' ? (
                  <Building2 className="w-8 h-8 text-white" />
                ) : (
                  <Lock className="w-8 h-8 text-white" />
                )}
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {mode === 'public' ? 'Публичная компания' : 'Приватная компания'}
            </h2>
            <p className="text-gray-600">
              {mode === 'public' 
                ? 'Заполните данные для регистрации публичной компании' 
                : 'Заполните данные для регистрации приватной компании'}
            </p>
          </div>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Поля для приватного режима */}
            {mode === 'private' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {/* Имя */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Имя <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="Иван"
                      />
                    </div>
                  </div>

                  {/* Фамилия */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Фамилия <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="Иванов"
                      />
                    </div>
                  </div>
                </div>

                {/* ID компании */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID компании (уникальный) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.company_id}
                        onChange={(e) => setFormData({ ...formData, company_id: e.target.value.toUpperCase() })}
                        className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono"
                        placeholder="MYSHOP01"
                        maxLength={12}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={generateCompanyId}
                      className="bg-purple-100 text-purple-600 px-4 py-3 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2 font-medium whitespace-nowrap"
                    >
                      <Sparkles className="w-4 h-4" />
                      Сгенерировать
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Покупатели будут использовать этот ID для доступа к вашей компании
                  </p>
                </div>

                <div className="border-t-2 border-gray-200 my-6"></div>
              </>
            )}

            {/* Название компании */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название компании <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Мой магазин"
                />
              </div>
            </div>

            {/* Номер телефона */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Номер телефона <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <div className="absolute left-11 top-1/2 -translate-y-1/2 text-gray-600">
                  +998
                </div>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 9) {
                      setFormData({ ...formData, phone: value });
                    }
                  }}
                  className="w-full pl-20 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="90 123 45 67"
                  maxLength={9}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                9 цифр без кода страны
              </p>
            </div>

            {/* Пароль */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Пароль <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Ключ доступа */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ключ доступа (30 символов) <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showAccessKey ? 'text' : 'password'}
                    value={formData.access_key}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 30) {
                        setFormData({ ...formData, access_key: value });
                      }
                    }}
                    className="w-full pl-11 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono text-sm"
                    placeholder="••••••••••••••••••••••••••••••"
                    maxLength={30}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessKey(!showAccessKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showAccessKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={generateAccessKey}
                  className="bg-purple-100 text-purple-600 px-4 py-3 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2 font-medium whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  Сгенерировать
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.access_key.length}/30 символов
              </p>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                type="submit"
                className={`flex-1 text-white px-6 py-3 rounded-lg transition-all font-medium shadow-lg ${
                  mode === 'public'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                    : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                }`}
              >
                Зарегистрировать компанию
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
