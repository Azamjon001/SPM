import React, { useState, useEffect } from 'react';
import { Save, CreditCard, Receipt, Banknote, CheckCircle, XCircle, Loader } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

type PaymentMode = 'manual_check' | 'demo_online' | 'real_online';

interface PaymentConfig {
  mode: PaymentMode;
  payme?: {
    merchantId: string;
    secretKey: string;
  };
  click?: {
    serviceId: string;
    merchantId: string;
    secretKey: string;
  };
}

export default function PaymentSettings() {
  const [config, setConfig] = useState<PaymentConfig>({
    mode: 'manual_check'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Загрузка текущей конфигурации
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6a74b22c/payment-config`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load config');
      }

      const data = await response.json();
      
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Error loading payment config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      setSaveStatus('idle');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6a74b22c/payment-config`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(config)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save config');
      }

      setSaveStatus('success');
      
      // Уведомляем все страницы об изменении режима оплаты
      window.dispatchEvent(new CustomEvent('paymentModeChanged', { 
        detail: config.mode 
      }));
      
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving payment config:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <h2 className="text-2xl mb-2">💳 Настройки оплаты</h2>
        <p className="text-blue-100">
          Выберите режим оплаты для всех покупателей магазина
        </p>
      </div>

      {/* Режимы оплаты */}
      <div className="space-y-4">
        {/* 1. Чеки/Коды */}
        <button
          onClick={() => setConfig({ ...config, mode: 'manual_check' })}
          className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${
            config.mode === 'manual_check'
              ? 'border-blue-600 bg-blue-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${
              config.mode === 'manual_check'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}>
              <Receipt className="w-6 h-6" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-medium">1️⃣ Чеки/Коды (ручная проверка)</h3>
                {config.mode === 'manual_check' && (
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                    Активно
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                Покупатель получает номер заказа (чек), говорит компании, компания проверяет вручную и выдаёт товар
              </p>
              
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  ✅ Простота
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  ✅ Без интеграций
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  ✅ Полный контроль
                </span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                  ⚠️ Ручная работа
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* 2. Демо онлайн */}
        <button
          onClick={() => setConfig({ ...config, mode: 'demo_online' })}
          className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${
            config.mode === 'demo_online'
              ? 'border-purple-600 bg-purple-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${
              config.mode === 'demo_online'
                ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}>
              <CreditCard className="w-6 h-6" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-medium">2️⃣ Демо онлайн оплата (виртуальные деньги)</h3>
                {config.mode === 'demo_online' && (
                  <span className="px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs rounded-full">
                    Активно
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                Красивый UI как в Uzum, виртуальные деньги, бесконечный баланс, всегда успешная оплата. Идеально для демонстрации!
              </p>
              
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  ✅ Красивый UI
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  ✅ Автоматизация
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  ✅ Чеки с QR
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  ✅ История заказов
                </span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                  🎬 Виртуальные деньги
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* 3. Реальная онлайн */}
        <button
          onClick={() => setConfig({ ...config, mode: 'real_online' })}
          className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${
            config.mode === 'real_online'
              ? 'border-green-600 bg-green-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${
              config.mode === 'real_online'
                ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}>
              <Banknote className="w-6 h-6" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-medium">3️⃣ Реальная онлайн оплата (банковские счета)</h3>
                {config.mode === 'real_online' && (
                  <span className="px-2 py-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs rounded-full">
                    Активно
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                Настоящие деньги через Payme, Click, UzCard. Требует API ключи от платёжных систем.
              </p>
              
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  ✅ Реальные деньги
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  ✅ Автоматизация
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  ✅ Официальные чеки
                </span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                  ⚠️ Нужна регистрация
                </span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                  ⚠️ Комиссия
                </span>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* API ключи для реального режима */}
      {config.mode === 'real_online' && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-yellow-500 text-white rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium mb-1">⚙️ Настройки API ключей</h3>
              <p className="text-sm text-gray-600">
                Для реальной оплаты нужно зарегистрироваться в Payme и Click, получить API ключи
              </p>
            </div>
          </div>

          {/* Payme */}
          <div className="space-y-3 mb-4">
            <h4 className="font-medium">💰 Payme</h4>
            <input
              type="text"
              placeholder="Merchant ID"
              value={config.payme?.merchantId || ''}
              onChange={(e) => setConfig({
                ...config,
                payme: { ...config.payme!, merchantId: e.target.value }
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="password"
              placeholder="Secret Key"
              value={config.payme?.secretKey || ''}
              onChange={(e) => setConfig({
                ...config,
                payme: { ...config.payme!, secretKey: e.target.value }
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Click */}
          <div className="space-y-3">
            <h4 className="font-medium">🔵 Click</h4>
            <input
              type="text"
              placeholder="Service ID"
              value={config.click?.serviceId || ''}
              onChange={(e) => setConfig({
                ...config,
                click: { ...config.click!, serviceId: e.target.value }
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Merchant ID"
              value={config.click?.merchantId || ''}
              onChange={(e) => setConfig({
                ...config,
                click: { ...config.click!, merchantId: e.target.value }
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="password"
              placeholder="Secret Key"
              value={config.click?.secretKey || ''}
              onChange={(e) => setConfig({
                ...config,
                click: { ...config.click!, secretKey: e.target.value }
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Инструкции */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-2 font-medium">📝 Как получить API ключи:</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Payme:</strong> <a href="https://payme.uz/business" target="_blank" rel="noopener noreferrer" className="underline">payme.uz/business</a></li>
              <li>• <strong>Click:</strong> <a href="https://my.click.uz" target="_blank" rel="noopener noreferrer" className="underline">my.click.uz</a></li>
            </ul>
          </div>
        </div>
      )}

      {/* Кнопка сохранения */}
      <button
        onClick={saveConfig}
        disabled={saving}
        className={`w-full py-4 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 ${
          saving
            ? 'bg-gray-400 cursor-not-allowed'
            : saveStatus === 'success'
            ? 'bg-green-600'
            : saveStatus === 'error'
            ? 'bg-red-600'
            : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
        }`}
      >
        {saving ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Сохранение...
          </>
        ) : saveStatus === 'success' ? (
          <>
            <CheckCircle className="w-5 h-5" />
            Сохранено!
          </>
        ) : saveStatus === 'error' ? (
          <>
            <XCircle className="w-5 h-5" />
            Ошибка сохранения
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Сохранить настройки
          </>
        )}
      </button>

      {/* Предупреждение */}
      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
        <p className="text-sm text-orange-800">
          ⚠️ <strong>Внимание:</strong> Изменение режима оплаты влияет на всех покупателей магазина. 
          Убедитесь, что выбрали правильный режим перед сохранением.
        </p>
      </div>
    </div>
  );
}
