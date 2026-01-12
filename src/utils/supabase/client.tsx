// 🔥 SINGLETON: Единственный экземпляр Supabase клиента для всего приложения
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// ⚡ Создаем клиент ОДИН РАЗ с правильной проверкой и настройками для долгих сессий
if (!(window as any).__supabaseClient) {
  (window as any).__supabaseClient = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey,
    {
      auth: {
        persistSession: false, // Отключаем session storage чтобы избежать конфликтов
        autoRefreshToken: true // ✅ ИСПРАВЛЕНИЕ: Включаем автообновление токенов для долгих сессий
      },
      realtime: {
        // ✅ Настройки для автоматического переподключения Realtime
        params: {
          eventsPerSecond: 10
        },
        // Таймауты для переподключения
        timeout: 10000, // 10 секунд для первого подключения
        heartbeatIntervalMs: 30000, // Проверка соединения каждые 30 секунд
      },
      global: {
        headers: {
          'x-client-info': 'supabase-js-web'
        }
      }
    }
  );
  console.log('✅ [Supabase Client] Singleton instance created with auto-reconnect');
}

// 💾 Экспортируем существующий экземпляр
export const supabase = (window as any).__supabaseClient;