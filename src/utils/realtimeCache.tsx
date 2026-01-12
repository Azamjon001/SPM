/**
 * 🚀 ГИБРИДНАЯ СИСТЕМА: REALTIME + RAM КЭШ
 * Постоянные Realtime подписки + агрессивное RAM кэширование
 */

import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabase/client'; // 🔥 Используем SINGLETON клиент!
import { queryClient, localCache } from './cache';

// ========== RAM КЭШ (В ПАМЯТИ) ==========
interface RAMCacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live в миллисекундах
}

class RAMCache {
  private cache = new Map<string, RAMCacheEntry<any>>();
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Проверяем не истек ли TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`⚡ [RAM CACHE HIT] ${key}`);
    return entry.data as T;
  }
  
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    console.log(`💾 [RAM CACHE SET] ${key} (TTL: ${ttl}ms)`);
  }
  
  delete(key: string) {
    this.cache.delete(key);
    console.log(`🗑️ [RAM CACHE DELETE] ${key}`);
  }
  
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 [RAM CACHE CLEAR] Очищено ${size} записей`);
  }
  
  has(key: string): boolean {
    return this.cache.has(key);
  }
  
  size(): number {
    return this.cache.size;
  }
  
  // Очистка истекших записей
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 [RAM CACHE CLEANUP] Удалено ${cleaned} истекших записей`);
    }
  }
}

export const ramCache = new RAMCache();

// Автоматическая очистка каждые 2 минуты
setInterval(() => {
  ramCache.cleanup();
}, 2 * 60 * 1000);

// ========== REALTIME SUBSCRIPTIONS MANAGER ==========
class RealtimeManager {
  private subscriptions = new Map<string, any>();
  private listeners = new Map<string, Set<(data: any) => void>>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3 секунды
  
  /**
   * 🔄 НОВОЕ: Автоматическое переподключение при ошибке
   */
  private reconnect(channelName: string, subscribeFunction: () => void, attempt: number = 1) {
    if (attempt > this.maxReconnectAttempts) {
      console.error(`❌ [REALTIME] Превышено максимальное количество попыток переподключения для ${channelName}`);
      return;
    }
    
    const delay = this.reconnectDelay * attempt; // Экспоненциальная задержка
    console.log(`🔄 [REALTIME] Переподключение к ${channelName} через ${delay}ms (попытка ${attempt}/${this.maxReconnectAttempts})`);
    
    const timer = setTimeout(() => {
      console.log(`🔌 [REALTIME] Попытка переподключения к ${channelName}...`);
      this.unsubscribe(channelName);
      subscribeFunction();
    }, delay);
    
    this.reconnectTimers.set(channelName, timer);
  }
  
  /**
   * Подписка на таблицу products с автоматическим обновлением всех кэшей
   */
  subscribeToProducts(companyId?: number) {
    const channelName = companyId ? `products_${companyId}` : 'products_all';
    
    // Если уже подписаны - не создаём новую подписку
    if (this.subscriptions.has(channelName)) {
      console.log(`✅ [REALTIME] Уже подписаны на ${channelName}`);
      return;
    }
    
    console.log(`🔌 [REALTIME] Подписка на ${channelName}...`);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'products',
          ...(companyId ? { filter: `company_id=eq.${companyId}` } : {})
        },
        (payload) => {
          console.log(`🔔 [REALTIME] Изменение в products:`, payload);
          
          // Очищаем все кэши
          ramCache.delete(`products_${companyId || 'all'}`);
          ramCache.delete(`company_products_${companyId || 'all'}`);
          localCache.remove(`products_${companyId || 'all'}`);
          localCache.remove(`company_products_${companyId || 'all'}`);
          
          // Инвалидируем React Query
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['company-products'] });
          
          // Уведомляем слушателей
          const listeners = this.listeners.get(channelName);
          if (listeners) {
            listeners.forEach(callback => callback(payload));
          }
          
          console.log(`✅ [REALTIME] Кэши обновлены для ${channelName}`);
        }
      )
      .subscribe((status, error) => {
        console.log(`📡 [REALTIME] Статус ${channelName}: ${status}`);
        
        // ✅ НОВОЕ: Обработка ошибок и автоматическое переподключение
        if (status === 'CHANNEL_ERROR') {
          console.error(`❌ [REALTIME] Ошибка канала ${channelName}:`, error);
          this.reconnect(channelName, () => this.subscribeToProducts(companyId));
        } else if (status === 'TIMED_OUT') {
          console.error(`⏱️ [REALTIME] Таймаут соединения ${channelName}`);
          this.reconnect(channelName, () => this.subscribeToProducts(companyId));
        } else if (status === 'CLOSED') {
          console.warn(`🔌 [REALTIME] Соединение закрыто ${channelName}`);
          this.reconnect(channelName, () => this.subscribeToProducts(companyId));
        } else if (status === 'SUBSCRIBED') {
          console.log(`✅ [REALTIME] Успешно подписаны на ${channelName}`);
          // Очищаем таймеры переподключения при успешном подключении
          const timer = this.reconnectTimers.get(channelName);
          if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(channelName);
          }
        }
      });
    
    this.subscriptions.set(channelName, channel);
  }
  
  /**
   * Подписка на таблицу companies
   */
  subscribeToCompanies() {
    const channelName = 'companies';
    
    if (this.subscriptions.has(channelName)) {
      console.log(`✅ [REALTIME] Уже подписаны на ${channelName}`);
      return;
    }
    
    console.log(`🔌 [REALTIME] Подписка на ${channelName}...`);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'companies'
        },
        (payload) => {
          console.log(`🔔 [REALTIME] Изменение в companies:`, payload);
          
          // Очищаем кэши компаний
          ramCache.clear(); // Очищаем всё т.к. компании могут быть везде
          queryClient.invalidateQueries({ queryKey: ['companies'] });
          queryClient.invalidateQueries({ queryKey: ['company-profile'] });
          
          // Уведомляем слушателей
          const listeners = this.listeners.get(channelName);
          if (listeners) {
            listeners.forEach(callback => callback(payload));
          }
        }
      )
      .subscribe((status, error) => {
        console.log(`📡 [REALTIME] Статус ${channelName}: ${status}`);
        
        // ✅ НОВОЕ: Обработка ошибок и автоматическое переподключение
        if (status === 'CHANNEL_ERROR') {
          console.error(`❌ [REALTIME] Ошибка канала ${channelName}:`, error);
          this.reconnect(channelName, () => this.subscribeToCompanies());
        } else if (status === 'TIMED_OUT') {
          console.error(`⏱️ [REALTIME] Таймаут соединения ${channelName}`);
          this.reconnect(channelName, () => this.subscribeToCompanies());
        } else if (status === 'CLOSED') {
          console.warn(`🔌 [REALTIME] Соединение закрыто ${channelName}`);
          this.reconnect(channelName, () => this.subscribeToCompanies());
        } else if (status === 'SUBSCRIBED') {
          console.log(`✅ [REALTIME] Успешно подписаны на ${channelName}`);
          const timer = this.reconnectTimers.get(channelName);
          if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(channelName);
          }
        }
      });
    
    this.subscriptions.set(channelName, channel);
  }
  
  /**
   * Подписка на таблицу ads
   */
  subscribeToAds() {
    const channelName = 'ads';
    
    if (this.subscriptions.has(channelName)) return;
    
    console.log(`🔌 [REALTIME] Подписка на ${channelName}...`);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ads'
        },
        (payload) => {
          console.log(`🔔 [REALTIME] Изменение в ads:`, payload);
          
          queryClient.invalidateQueries({ queryKey: ['ads'] });
          queryClient.invalidateQueries({ queryKey: ['company-smm-posts'] });
          
          const listeners = this.listeners.get(channelName);
          if (listeners) {
            listeners.forEach(callback => callback(payload));
          }
        }
      )
      .subscribe((status, error) => {
        console.log(`📡 [REALTIME] Статус ${channelName}: ${status}`);
        
        // ✅ НОВОЕ: Обработка ошибок и автоматическое переподключение
        if (status === 'CHANNEL_ERROR') {
          console.error(`❌ [REALTIME] Ошибка канала ${channelName}:`, error);
          this.reconnect(channelName, () => this.subscribeToAds());
        } else if (status === 'TIMED_OUT') {
          console.error(`⏱️ [REALTIME] Таймаут соединения ${channelName}`);
          this.reconnect(channelName, () => this.subscribeToAds());
        } else if (status === 'CLOSED') {
          console.warn(`🔌 [REALTIME] Соединение закрыто ${channelName}`);
          this.reconnect(channelName, () => this.subscribeToAds());
        } else if (status === 'SUBSCRIBED') {
          console.log(`✅ [REALTIME] Успешно подписаны на ${channelName}`);
          const timer = this.reconnectTimers.get(channelName);
          if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(channelName);
          }
        }
      });
    
    this.subscriptions.set(channelName, channel);
  }
  
  /**
   * 🛒 НОВОЕ: Подписка на таблицу customer_orders для Realtime обновления корзины
   */
  subscribeToCustomerOrders(phoneNumber?: string) {
    const channelName = phoneNumber ? `customer_orders_${phoneNumber}` : 'customer_orders_all';
    
    if (this.subscriptions.has(channelName)) {
      console.log(`✅ [REALTIME] Уже подписаны на ${channelName}`);
      return;
    }
    
    console.log(`🔌 [REALTIME] Подписка на ${channelName}...`);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'customer_orders',
          ...(phoneNumber ? { filter: `customer_phone=eq.${phoneNumber}` } : {})
        },
        (payload) => {
          console.log(`🔔 [REALTIME] Изменение в customer_orders:`, payload);
          
          // Очищаем кэши заказов
          ramCache.delete(`customer_orders_${phoneNumber || 'all'}`);
          localCache.remove(`customer_orders_${phoneNumber || 'all'}`);
          
          // Инвалидируем React Query
          queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
          queryClient.invalidateQueries({ queryKey: ['user-orders'] });
          
          // Уведомляем слушателей
          const listeners = this.listeners.get(channelName);
          if (listeners) {
            listeners.forEach(callback => callback(payload));
          }
          
          console.log(`✅ [REALTIME] Кэши заказов обновлены для ${channelName}`);
        }
      )
      .subscribe((status, error) => {
        console.log(`📡 [REALTIME] Статус ${channelName}: ${status}`);
        
        // ✅ НОВОЕ: Обработка ошибок и автоматическое переподключение
        if (status === 'CHANNEL_ERROR') {
          console.error(`❌ [REALTIME] Ошибка канала ${channelName}:`, error);
          this.reconnect(channelName, () => this.subscribeToCustomerOrders(phoneNumber));
        } else if (status === 'TIMED_OUT') {
          console.error(`⏱️ [REALTIME] Таймаут соединения ${channelName}`);
          this.reconnect(channelName, () => this.subscribeToCustomerOrders(phoneNumber));
        } else if (status === 'CLOSED') {
          console.warn(`🔌 [REALTIME] Соединение закрыто ${channelName}`);
          this.reconnect(channelName, () => this.subscribeToCustomerOrders(phoneNumber));
        } else if (status === 'SUBSCRIBED') {
          console.log(`✅ [REALTIME] Успешно подписаны на ${channelName}`);
          const timer = this.reconnectTimers.get(channelName);
          if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(channelName);
          }
        }
      });
    
    this.subscriptions.set(channelName, channel);
  }
  
  /**
   * Добавить слушателя для конкретного канала
   */
  addListener(channelName: string, callback: (data: any) => void) {
    if (!this.listeners.has(channelName)) {
      this.listeners.set(channelName, new Set());
    }
    this.listeners.get(channelName)!.add(callback);
  }
  
  /**
   * Удалить слушателя
   */
  removeListener(channelName: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(channelName);
    if (listeners) {
      listeners.delete(callback);
    }
  }
  
  /**
   * Отписаться от канала
   */
  unsubscribe(channelName: string) {
    const subscription = this.subscriptions.get(channelName);
    if (subscription) {
      supabase.removeChannel(subscription);
      this.subscriptions.delete(channelName);
      this.listeners.delete(channelName);
      console.log(`🔌 [REALTIME] Отписка от ${channelName}`);
    }
  }
  
  /**
   * Отписаться от всех каналов
   */
  unsubscribeAll() {
    console.log(`🔌 [REALTIME] Отписка от всех каналов (${this.subscriptions.size})...`);
    for (const [channelName, subscription] of this.subscriptions.entries()) {
      supabase.removeChannel(subscription);
    }
    this.subscriptions.clear();
    this.listeners.clear();
  }
  
  /**
   * 🔄 НОВОЕ: Переподключить все активные подписки
   */
  reconnectAll() {
    console.log('🔄 [REALTIME] Переподключение всех каналов...');
    const channelNames = Array.from(this.subscriptions.keys());
    
    // Отписываемся от всех
    this.unsubscribeAll();
    
    // Заново подписываемся на все каналы
    channelNames.forEach(channelName => {
      if (channelName.startsWith('products_')) {
        const companyId = channelName === 'products_all' ? undefined : parseInt(channelName.replace('products_', ''));
        this.subscribeToProducts(companyId);
      } else if (channelName === 'companies') {
        this.subscribeToCompanies();
      } else if (channelName === 'ads') {
        this.subscribeToAds();
      } else if (channelName.startsWith('customer_orders_')) {
        const phoneNumber = channelName === 'customer_orders_all' ? undefined : channelName.replace('customer_orders_', '');
        this.subscribeToCustomerOrders(phoneNumber);
      }
    });
    
    console.log(`✅ [REALTIME] Переподключено ${channelNames.length} каналов`);
  }
}

export const realtimeManager = new RealtimeManager();

// ========== АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ REALTIME ==========
// Включаем Realtime подписки сразу при загрузке модуля
if (typeof window !== 'undefined') {
  console.log('🚀 [REALTIME] Автоматическая инициализация...');
  
  // Подписываемся на все важные таблицы
  realtimeManager.subscribeToProducts(); // Все товары
  realtimeManager.subscribeToCompanies(); // Все компании
  realtimeManager.subscribeToAds(); // Реклама
  
  console.log('✅ [REALTIME] Все подписки активированы!');
  
  // ✅ НОВОЕ: Обработка возвращения пользователя на вкладку (Page Visibility API)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('👁️ [REALTIME] Пользователь вернулся на вкладку - проверяем соединение...');
      
      // Переподключаем все каналы при возвращении
      setTimeout(() => {
        realtimeManager.reconnectAll();
        
        // Очищаем все кэши чтобы загрузить свежие данные
        ramCache.clear();
        queryClient.invalidateQueries();
        
        console.log('✅ [REALTIME] Соединения восстановлены после возвращения пользователя');
      }, 1000); // Небольшая задержка чтобы браузер полностью активировался
    }
  });
  
  // ✅ НОВОЕ: Обработка потери сетевого соединения
  window.addEventListener('online', () => {
    console.log('🌐 [REALTIME] Сеть восстановлена - переподключаемся...');
    realtimeManager.reconnectAll();
    ramCache.clear();
    queryClient.invalidateQueries();
  });
  
  window.addEventListener('offline', () => {
    console.warn('❌ [REALTIME] Потеряно сетевое соединение');
  });
}

// ========== REACT ХУКИ ==========

/**
 * Хук для использования Realtime подписки в компонентах
 */
export function useRealtimeSubscription(
  channelName: string,
  callback: (data: any) => void
) {
  useEffect(() => {
    realtimeManager.addListener(channelName, callback);
    
    return () => {
      realtimeManager.removeListener(channelName, callback);
    };
  }, [channelName, callback]);
}

/**
 * Хук для товаров с Realtime + RAM кэш
 */
export function useProductsWithRealtime(companyId?: number) {
  const cacheKey = `products_${companyId || 'all'}`;
  const [products, setProducts] = useState<any[]>(() => {
    // Сначала проверяем RAM кэш
    const ramData = ramCache.get<any[]>(cacheKey);
    if (ramData) return ramData;
    
    // Потом localStorage
    const localData = localCache.get<any[]>(cacheKey);
    if (localData) {
      ramCache.set(cacheKey, localData);
      return localData;
    }
    
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const isFirstLoad = useRef(true);
  
  // Загрузка данных
  const loadProducts = async () => {
    // Если данные уже есть в кэше - не загружаем
    if (!isFirstLoad.current && products.length > 0) {
      console.log('⚡ Используем кэш, не загружаем заново');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6a74b22c/products${companyId ? `?company_id=${companyId}` : ''}`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      const data = await response.json();
      
      if (data.success) {
        // Сохраняем во все кэши
        ramCache.set(cacheKey, data.products, 5 * 60 * 1000);
        localCache.set(cacheKey, data.products);
        queryClient.setQueryData(['products', companyId], data.products);
        setProducts(data.products);
        console.log(`✅ Загружено ${data.products.length} товаров в ВСЕ кэши`);
      }
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
    } finally {
      setIsLoading(false);
      isFirstLoad.current = false;
    }
  };
  
  // Загружаем при монтировании
  useEffect(() => {
    loadProducts();
  }, [companyId]);
  
  // Подписываемся на Realtime обновления
  useEffect(() => {
    const channelName = companyId ? `products_${companyId}` : 'products_all';
    
    const handleRealtimeUpdate = () => {
      console.log('🔔 Realtime обновление - перезагружаем товары');
      loadProducts();
    };
    
    realtimeManager.addListener(channelName, handleRealtimeUpdate);
    
    // Убеждаемся что подписка активна
    realtimeManager.subscribeToProducts(companyId);
    
    return () => {
      realtimeManager.removeListener(channelName, handleRealtimeUpdate);
    };
  }, [companyId]);
  
  return {
    products,
    isLoading,
    refetch: loadProducts
  };
}

/**
 * 🛒 НОВЫЙ ХУК: Заказы покупателя с Realtime
 */
export function useCustomerOrdersRealtime(phoneNumber: string | undefined) {
  const [shouldRefresh, setShouldRefresh] = useState(0);
  
  useEffect(() => {
    if (!phoneNumber) return;
    
    const channelName = `customer_orders_${phoneNumber}`;
    
    const handleRealtimeUpdate = (payload: any) => {
      console.log('🔔 [ORDERS REALTIME] Обновление заказов для', phoneNumber, payload);
      // Триггерим обновление через изменение состояния
      setShouldRefresh(prev => prev + 1);
    };
    
    realtimeManager.addListener(channelName, handleRealtimeUpdate);
    realtimeManager.subscribeToCustomerOrders(phoneNumber);
    
    return () => {
      realtimeManager.removeListener(channelName, handleRealtimeUpdate);
    };
  }, [phoneNumber]);
  
  return { shouldRefresh };
}