import { useState } from 'react';
import { Clock, Calendar, RefreshCw } from 'lucide-react';
import { 
  getUzbekistanISOString, 
  formatUzbekistanDate, 
  formatUzbekistanTime,
  formatUzbekistanDateTime,
  formatUzbekistanFullDateTime 
} from '../utils/uzbekTime';

/**
 * 🧪 Компонент для тестирования и отладки функций времени
 * Показывает текущее время в разных форматах
 */
export default function TimeDebugPanel() {
  const [currentTime, setCurrentTime] = useState(new Date().toISOString());

  const refresh = () => {
    setCurrentTime(new Date().toISOString());
  };

  const uzbekISOTime = getUzbekistanISOString();
  const dateTime = formatUzbekistanDateTime(uzbekISOTime);
  const fullDateTime = formatUzbekistanFullDateTime(uzbekISOTime);

  // Также проверим с тестовой датой
  const testDate = '2024-12-23T10:30:00.000Z'; // 10:30 UTC = 15:30 GMT+5
  const testDateTime = formatUzbekistanDateTime(testDate);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">🧪 Тест времени GMT+5</h2>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Обновить
        </button>
      </div>

      <div className="space-y-6">
        {/* Текущее время */}
        <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
          <h3 className="font-bold text-gray-900 mb-3">📍 Текущее время (Asia/Tashkent, GMT+5)</h3>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 w-40">ISO String (UTC):</span>
              <code className="bg-white px-3 py-1 rounded text-sm font-mono">{uzbekISOTime}</code>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-gray-600 w-36">Дата (GMT+5):</span>
              <span className="font-bold text-blue-600 text-lg">{dateTime.date}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-gray-600 w-36">Время (GMT+5):</span>
              <span className="font-bold text-blue-600 text-lg">{dateTime.time}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-gray-600 w-40">Полный формат:</span>
              <span className="font-bold text-blue-600">{fullDateTime}</span>
            </div>
          </div>
        </div>

        {/* Тестовая дата */}
        <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
          <h3 className="font-bold text-gray-900 mb-3">🧪 Тестовая дата</h3>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 w-40">ISO String (UTC):</span>
              <code className="bg-white px-3 py-1 rounded text-sm font-mono">{testDate}</code>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-gray-600 w-36">Дата (GMT+5):</span>
              <span className="font-bold text-green-600 text-lg">{testDateTime.date}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-gray-600 w-36">Время (GMT+5):</span>
              <span className="font-bold text-green-600 text-lg">{testDateTime.time}</span>
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-white rounded border border-green-300">
            <p className="text-sm text-gray-700">
              ✅ <strong>Проверка:</strong> 10:30 UTC должно быть <strong>15:30 GMT+5</strong>
            </p>
          </div>
        </div>

        {/* Информация */}
        <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
          <h3 className="font-bold text-gray-900 mb-2">ℹ️ Информация</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>🌍 Временная зона: <strong>Asia/Tashkent</strong></li>
            <li>⏰ Смещение: <strong>UTC+5</strong> (GMT+5)</li>
            <li>📍 Город: <strong>Андижан, Узбекистан</strong></li>
            <li>💾 В базе данных: <strong>UTC время</strong></li>
            <li>👁️ При отображении: <strong>Конвертируется в GMT+5</strong></li>
          </ul>
        </div>

        {/* Проверьте консоль */}
        <div className="border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50">
          <h3 className="font-bold text-gray-900 mb-2">🔍 Отладка</h3>
          <p className="text-sm text-gray-700">
            Откройте консоль браузера (F12) и найдите логи с эмодзи 🕒. 
            Там вы увидите подробную информацию о конвертации времени.
          </p>
        </div>
      </div>
    </div>
  );
}
