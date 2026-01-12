import { useState } from 'react';
import { Building2, Phone, Lock, ArrowLeft } from 'lucide-react';

interface CompanyLoginProps {
  onLogin: (phone: string, password: string) => boolean;
  onSwitchToCustomer: () => void;
}

export default function CompanyLogin({ onLogin, onSwitchToCustomer }: CompanyLoginProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone.trim() || !password.trim()) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    const success = onLogin(phone, password);
    if (!success) {
      setError('Неверный номер телефона или пароль');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <button
            onClick={onSwitchToCustomer}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Назад
          </button>

          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          
          <h1 className="text-center mb-2">Вход для компании</h1>
          <p className="text-center text-gray-600 mb-6">Введите данные компании</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Номер телефона</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="901234567"
                  maxLength={9}
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Введите пароль"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Войти
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}