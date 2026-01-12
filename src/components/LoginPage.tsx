import { useState } from 'react';
import { User, Phone, Lock } from 'lucide-react';

interface LoginPageProps {
  onLogin: (userData: { firstName: string; lastName: string; phone: string; companyId?: string }) => void;
  onSwitchToCompany: () => void;
  isPrivateMode?: boolean; // 🔒 Новый пропс для приватного режима
  onBack?: () => void; // 🔒 Кнопка назад к выбору режима
}

export default function LoginPage({ onLogin, onSwitchToCompany, isPrivateMode = false, onBack }: LoginPageProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyId, setCompanyId] = useState(''); // 🔒 ID компании для приватного режима
  const [error, setError] = useState('');
  const [showSmsVerification, setShowSmsVerification] = useState(false);
  const [smsCode, setSmsCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check if this is admin phone number
    if (phone === '914751330') {
      // Special admin access - show SMS verification panel
      setShowSmsVerification(true);
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    if (phone.length < 9) {
      setError('Неверный формат номера телефона');
      return;
    }

    // 🔒 Проверка ID компании для приватного режима
    if (isPrivateMode && !companyId.trim()) {
      setError('Пожалуйста, введите ID компании');
      return;
    }

    // 🔒 Валидация private_id: только 5-7 цифр
    if (isPrivateMode && companyId.trim()) {
      const privateId = companyId.trim();
      if (!/^\d{5,7}$/.test(privateId)) {
        setError('ID компании должен содержать 5-7 цифр');
        return;
      }
    }

    // 🔒 Передаем companyId если это приватный режим
    onLogin({ 
      firstName, 
      lastName, 
      phone,
      ...(isPrivateMode && { companyId: companyId.trim() })
    });
  };

  const handleSmsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check if this is admin code
    if (phone === '914751330' && smsCode === '15051') {
      // Admin access - trigger login with admin credentials
      onLogin({ firstName: 'Admin', lastName: 'User', phone: '914751330' });
    } else {
      setError('Неверный код подтверждения');
    }
  };

  // If showing SMS verification panel for admin
  if (showSmsVerification && phone === '914751330') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Phone className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <h1 className="text-center mb-2">Подтверждение доступа</h1>
            <p className="text-center text-gray-600 mb-6">Введите код доступа для админа</p>

            <form onSubmit={handleSmsSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Код подтверждения</label>
                <input
                  type="text"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-center text-2xl tracking-widest"
                  placeholder="00000"
                  maxLength={5}
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                Подтвердить
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSmsVerification(false);
                  setPhone('');
                  setSmsCode('');
                  setError('');
                }}
                className="w-full text-gray-600 hover:text-gray-700 transition-colors"
              >
                Назад
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isPrivateMode ? 'bg-purple-100' : 'bg-blue-100'}`}>
              {isPrivateMode ? (
                <Lock className={`w-8 h-8 ${isPrivateMode ? 'text-purple-600' : 'text-blue-600'}`} />
              ) : (
                <User className="w-8 h-8 text-blue-600" />
              )}
            </div>
          </div>
          
          <h1 className="text-center mb-2">
            {isPrivateMode ? 'Приватная регистрация' : 'Добро пожаловать'}
          </h1>
          <p className="text-center text-gray-600 mb-6">
            {isPrivateMode 
              ? 'Введите данные и ID компании для доступа' 
              : 'Войдите для продолжения'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Имя</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Введите имя"
                disabled={phone === '914751330'}
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Фамилия</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Введите фамилию"
                disabled={phone === '914751330'}
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Номер телефона</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="901234567"
                  maxLength={9}
                />
              </div>
            </div>

            {/* 🔒 Поле для ввода ID компании в приватном режиме */}
            {isPrivateMode && (
              <div>
                <label className="block text-gray-700 mb-2 flex items-center">
                  <Lock className="w-4 h-4 mr-2 text-purple-600" />
                  ID компании (5-7 цифр)
                </label>
                <input
                  type="text"
                  value={companyId}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 7);
                    setCompanyId(value);
                  }}
                  className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50 text-center text-lg tracking-wider font-mono"
                  placeholder="12345"
                  maxLength={7}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 ID компании можно получить у менеджера компании
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Войти
            </button>
          </form>

          

          {/* 🔒 Кнопка назад к выбору режима */}
          {onBack && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={onBack}
                className="w-full text-gray-600 hover:text-gray-700 transition-colors"
              >
                Назад
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}