import { Store, Lock, ArrowRight } from 'lucide-react';

interface CustomerRegistrationModeSelectorProps {
  onSelectPublic: () => void;
  onSelectPrivate: () => void;
  onSwitchToCompany: () => void;
}

export default function CustomerRegistrationModeSelector({ 
  onSelectPublic, 
  onSelectPrivate,
  onSwitchToCompany 
}: CustomerRegistrationModeSelectorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Выберите тип регистрации</h1>
            <p className="text-gray-600">Выберите способ доступа к платформе</p>
          </div>

          {/* Две панели выбора */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Публичная регистрация */}
            <button
              onClick={onSelectPublic}
              className="group relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                  <Store className="w-10 h-10" />
                </div>
                
                <h2 className="text-2xl font-bold mb-2">Публичная</h2>
                <p className="text-blue-100 mb-4 text-sm">
                  Доступ ко всем публичным компаниям на платформе
                </p>
                
                <div className="flex items-center text-sm font-semibold">
                  <span>Продолжить</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Значок по умолчанию */}
              <div className="absolute top-4 right-4">
                <span className="bg-white/20 text-xs px-2 py-1 rounded-full font-semibold">
                  По умолчанию
                </span>
              </div>
            </button>

            {/* Приватная регистрация */}
            <button
              onClick={onSelectPrivate}
              className="group relative bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                  <Lock className="w-10 h-10" />
                </div>
                
                <h2 className="text-2xl font-bold mb-2">Приватная</h2>
                <p className="text-purple-100 mb-4 text-sm">
                  Доступ только к одной компании по её ID
                </p>
                
                <div className="flex items-center text-sm font-semibold">
                  <span>Продолжить</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          </div>

          {/* Описание каждого типа */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h3 className="font-semibold text-blue-600 mb-2 flex items-center">
                  <Store className="w-4 h-4 mr-2" />
                  Публичная регистрация
                </h3>
                <ul className="space-y-1 text-gray-600">
                  <li>✓ Доступ ко всем магазинам</li>
                  <li>✓ Широкий выбор товаров</li>
                  <li>✓ Без ограничений</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-purple-600 mb-2 flex items-center">
                  <Lock className="w-4 h-4 mr-2" />
                  Приватная регистрация
                </h3>
                <ul className="space-y-1 text-gray-600">
                  <li>✓ Доступ к одной компании</li>
                  <li>✓ Требуется ID компании</li>
                  <li>✓ Эксклюзивный доступ</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Переключение на вход компании */}
          <div className="pt-6 border-t border-gray-200">
            <button
              onClick={onSwitchToCompany}
              className="w-full text-blue-600 hover:text-blue-700 transition-colors font-medium"
            >
              Вход для компании →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}