import React from 'react';
import { CheckCircle, Bell, Gift, TrendingUp, Package, Shield } from 'lucide-react';

interface SystemReadyProps {
  onClose: () => void;
}

export default function SystemReady({ onClose }: SystemReadyProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-10 h-10" />
            <h2 className="text-3xl">Система готова!</h2>
          </div>
          <p className="text-green-50">Все расширенные функции активированы 🚀</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">
              ✅ Миграция базы данных выполнена успешно!<br />
              ✅ 7 новых таблиц созданы в Supabase<br />
              ✅ Все API endpoints работают<br />
              ✅ Компоненты UI готовы к использованию
            </p>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-xl mb-4">🎯 Новые возможности:</h3>
            <div className="space-y-3">
              {/* Notifications */}
              <div className="flex gap-3 p-3 bg-blue-50 rounded-lg">
                <Bell className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-blue-900"><strong>Уведомления</strong></p>
                  <p className="text-sm text-blue-700">
                    Получайте уведомления о заказах, низких остатках и важных событиях
                  </p>
                </div>
              </div>

              {/* Loyalty Program */}
              <div className="flex gap-3 p-3 bg-purple-50 rounded-lg">
                <Gift className="w-6 h-6 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-purple-900"><strong>Программа лояльности</strong></p>
                  <p className="text-sm text-purple-700">
                    4 уровня VIP статуса, кэшбэк до 10% от покупок
                  </p>
                </div>
              </div>

              {/* Analytics */}
              <div className="flex gap-3 p-3 bg-orange-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="text-orange-900"><strong>Расширенная аналитика</strong></p>
                  <p className="text-sm text-orange-700">
                    Графики продаж, статистика по товарам, история цен
                  </p>
                </div>
              </div>

              {/* Inventory */}
              <div className="flex gap-3 p-3 bg-green-50 rounded-lg">
                <Package className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-green-900"><strong>Управление складом</strong></p>
                  <p className="text-sm text-green-700">
                    Мониторинг остатков, автоматические уведомления о недостатке товаров
                  </p>
                </div>
              </div>

              {/* Promo Codes */}
              <div className="flex gap-3 p-3 bg-pink-50 rounded-lg">
                <Shield className="w-6 h-6 text-pink-600 flex-shrink-0" />
                <div>
                  <p className="text-pink-900"><strong>Промокоды и скидки</strong></p>
                  <p className="text-sm text-pink-700">
                    Создавайте промокоды для покупателей с гибкими настройками
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* How to Use */}
          <div>
            <h3 className="text-xl mb-3">📱 Как использовать:</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>Для покупателей:</strong></p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Совершайте покупки и зарабатывайте баллы</li>
                <li>Используйте промокоды для получения скидок</li>
                <li>Следите за уведомлениями о статусе заказов</li>
              </ul>

              <p className="pt-2"><strong>Для компаний:</strong></p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Открывайте вкладку "Аналитика" для просмотра графиков</li>
                <li>Проверяйте уведомления о низких остатках</li>
                <li>Отслеживайте историю цен товаров</li>
              </ul>

              <p className="pt-2"><strong>Для администратора:</strong></p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Создавайте промокоды в настройках платежей</li>
                <li>Отправляйте уведомления всем пользователям</li>
                <li>Просматривайте общую аналитику системы</li>
              </ul>
            </div>
          </div>

          {/* Database Info */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <p className="text-gray-600 mb-2"><strong>📊 Созданные таблицы:</strong></p>
            <div className="grid grid-cols-2 gap-2 text-gray-600">
              <div>✓ notifications</div>
              <div>✓ price_history</div>
              <div>✓ loyalty_points</div>
              <div>✓ loyalty_transactions</div>
              <div>✓ promo_codes</div>
              <div>✓ promo_code_uses</div>
              <div>✓ user_preferences</div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all"
          >
            Отлично, начнем! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
