// ========== ЛОКАЛЬНОЕ ХРАНИЛИЩЕ В БРАУЗЕРЕ ПОЛЬЗОВАТЕЛЯ ==========
// ✅ Работает ТОЛЬКО для покупателей (HomePage)
// ❌ НЕ работает для: LikesPage, AdminPanel, CompanyPanel, DigitalWarehouse

const CACHE_VERSION = 'v2'; // Версия кэша (меняйте при изменении структуры данных)
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 часа (можно настроить)
const MAX_CACHE_SIZE = 2 * 1024 * 1024; // 🔒 Максимум 2MB на один ключ (защита от переполнения)

interface CacheData<T> {
  data: T;
  timestamp: number;
  version: string;
}

// ========== ОСНОВНОЙ КЭШ ==========
export const LocalStorageCache = {
  // Получить данные из кэша
  get: <T,>(key: string): T | null => {
    try {
      const cacheKey = `${CACHE_VERSION}_${key}`;
      const item = localStorage.getItem(cacheKey);
      
      if (!item) {
        console.log(`📭 [LocalCache] No cache found for: ${key}`);
        return null;
      }
      
      const cached: CacheData<T> = JSON.parse(item);
      
      // Проверяем версию
      if (cached.version !== CACHE_VERSION) {
        console.log(`🔄 [LocalCache] Cache version mismatch for: ${key}, clearing...`);
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      // Проверяем срок действия
      const age = Date.now() - cached.timestamp;
      if (age > CACHE_EXPIRY) {
        console.log(`⏰ [LocalCache] Cache expired for: ${key} (age: ${Math.round(age / 1000 / 60)} min)`);
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      console.log(`✅ [LocalCache] Cache hit for: ${key} (age: ${Math.round(age / 1000 / 60)} min)`);
      return cached.data;
    } catch (error) {
      console.error(`❌ [LocalCache] Error reading cache for: ${key}`, error);
      return null;
    }
  },
  
  // Сохранить данные в кэш
  set: <T,>(key: string, data: T): void => {
    try {
      const cacheKey = `${CACHE_VERSION}_${key}`;
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now(),
        version: CACHE_VERSION
      };
      
      const serializedData = JSON.stringify(cacheData);
      if (serializedData.length > MAX_CACHE_SIZE) {
        console.error(`❌ [LocalCache] Data too large to cache: ${key} (${serializedData.length} bytes)`);
        return;
      }
      
      localStorage.setItem(cacheKey, serializedData);
      console.log(`💾 [LocalCache] Saved to cache: ${key} (${serializedData.length} bytes)`);
    } catch (error) {
      console.error(`❌ [LocalCache] Error saving cache for: ${key}`, error);
      
      // Если переполнение - очищаем старые данные
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.log(`🗑️ [LocalCache] Storage full, clearing old cache...`);
        LocalStorageCache.clearOldCache();
        
        // Пробуем сохранить снова
        try {
          const cacheKey = `${CACHE_VERSION}_${key}`;
          const cacheData: CacheData<T> = {
            data,
            timestamp: Date.now(),
            version: CACHE_VERSION
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (retryError) {
          console.error(`❌ [LocalCache] Failed to save even after clearing:`, retryError);
        }
      }
    }
  },
  
  // Удалить конкретный ключ
  remove: (key: string): void => {
    const cacheKey = `${CACHE_VERSION}_${key}`;
    localStorage.removeItem(cacheKey);
    console.log(`🗑️ [LocalCache] Removed from cache: ${key}`);
  },
  
  // Очистить весь кэш текущей версии
  clear: (): void => {
    const keys = Object.keys(localStorage);
    let cleared = 0;
    
    keys.forEach(key => {
      if (key.startsWith(`${CACHE_VERSION}_`)) {
        localStorage.removeItem(key);
        cleared++;
      }
    });
    
    console.log(`🗑️ [LocalCache] Cleared ${cleared} cache entries`);
  },
  
  // Очистить старые версии кэша
  clearOldCache: (): void => {
    const keys = Object.keys(localStorage);
    let cleared = 0;
    
    keys.forEach(key => {
      // Удаляем всё кроме текущей версии
      if (key.includes('_') && !key.startsWith(`${CACHE_VERSION}_`)) {
        localStorage.removeItem(key);
        cleared++;
      }
    });
    
    console.log(`🗑️ [LocalCache] Cleared ${cleared} old cache entries`);
  },
  
  // Проверить есть ли данные в кэше
  has: (key: string): boolean => {
    const cacheKey = `${CACHE_VERSION}_${key}`;
    return localStorage.getItem(cacheKey) !== null;
  },
  
  // Получить возраст кэша в миллисекундах
  getAge: (key: string): number | null => {
    try {
      const cacheKey = `${CACHE_VERSION}_${key}`;
      const item = localStorage.getItem(cacheKey);
      
      if (!item) return null;
      
      const cached: CacheData<any> = JSON.parse(item);
      return Date.now() - cached.timestamp;
    } catch {
      return null;
    }
  },
  
  // Получить размер кэша в байтах
  getSize: (): number => {
    let total = 0;
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(`${CACHE_VERSION}_`)) {
        const item = localStorage.getItem(key);
        if (item) {
          total += item.length + key.length;
        }
      }
    });
    
    return total;
  },
  
  // Получить информацию о кэше
  getInfo: (): { count: number; size: number; keys: string[] } => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(`${CACHE_VERSION}_`));
    const size = LocalStorageCache.getSize();
    
    return {
      count: keys.length,
      size: size,
      keys: keys.map(k => k.replace(`${CACHE_VERSION}_`, ''))
    };
  }
};

// ========== СПЕЦИФИЧНЫЕ ФУНКЦИИ ДЛЯ ТОВАРОВ ==========

export interface Product {
  id: number;
  company_id: number;
  name: string;
  quantity: number;
  price: number;
  selling_price: number;
  markup_percent: number;
  category?: string;
  image_url?: string;
  barcode?: string;
  customer_available?: boolean;
  colors?: string;
  created_at?: string;
}

// Получить товары из кэша
export function getCachedProducts(): Product[] | null {
  return LocalStorageCache.get<Product[]>('products');
}

// Сохранить товары в кэш
export function setCachedProducts(products: Product[]): void {
  LocalStorageCache.set<Product[]>('products', products);
}

// Проверить нужно ли обновить кэш товаров
export function shouldRefreshProducts(maxAgeMinutes: number = 5): boolean {
  const age = LocalStorageCache.getAge('products');
  
  if (age === null) {
    console.log(`🔄 [ProductsCache] No cache, need to refresh`);
    return true;
  }
  
  const ageMinutes = age / 1000 / 60;
  const needRefresh = ageMinutes > maxAgeMinutes;
  
  if (needRefresh) {
    console.log(`🔄 [ProductsCache] Cache too old (${Math.round(ageMinutes)} min), need to refresh`);
  } else {
    console.log(`✅ [ProductsCache] Cache fresh (${Math.round(ageMinutes)} min), no need to refresh`);
  }
  
  return needRefresh;
}

// ========== УТИЛИТЫ ==========

// Вывести статистику кэша в консоль
export function logCacheStats(): void {
  const info = LocalStorageCache.getInfo();
  console.log('📊 [LocalCache] Statistics:');
  console.log(`   - Entries: ${info.count}`);
  console.log(`   - Size: ${(info.size / 1024).toFixed(2)} KB`);
  console.log(`   - Keys:`, info.keys);
}

// Очистить весь кэш (для отладки)
export function clearAllCache(): void {
  LocalStorageCache.clear();
  console.log('🗑️ [LocalCache] All cache cleared!');
}

// Экспортируем для использования
export default LocalStorageCache;

// ========== ПРЕДЗАГРУЗКА ВСЕХ ДАННЫХ В RAM ПРИ ПЕРВОМ ВХОДЕ ==========

/**
 * Предзагрузка всех данных в localStorage при первом входе на сайт
 * Вызывайте эту функцию при первой загрузке приложения
 */
export async function uploadAllDataToRAM(
  onProgress?: (step: string, progress: number) => void
): Promise<void> {
  console.log('🚀 [RAM Upload] Начинаем предзагрузку всех данных в localStorage...');
  
  try {
    // Шаг 1: Загружаем товары (самое важное!)
    if (onProgress) onProgress('Загрузка товаров...', 20);
    console.log('📦 [RAM Upload] Загружаем товары...');
    
    // Используем динамический импорт чтобы не создавать циклические зависимости
    const { getProductsPaginated } = await import('./api');
    
    const productsData = await getProductsPaginated({
      availableOnly: false, // Загружаем ВСЕ товары
      limit: 10000 // Максимум товаров
    });
    
    console.log(`✅ [RAM Upload] Загружено ${productsData.products.length} товаров`);
    setCachedProducts(productsData.products);
    
    if (onProgress) onProgress('Товары загружены!', 50);
    
    // Шаг 2: Можно добавить загрузку других данных (категории, настройки и т.д.)
    // Например: категории товаров
    if (onProgress) onProgress('Подготовка данных...', 80);
    
    // Создаем дополнительные индексы для быстрого поиска
    const productsByCategory: { [key: string]: Product[] } = {};
    productsData.products.forEach(product => {
      const category = product.category || 'Без категории';
      if (!productsByCategory[category]) {
        productsByCategory[category] = [];
      }
      productsByCategory[category].push(product);
    });
    
    LocalStorageCache.set('products_by_category', productsByCategory);
    console.log(`✅ [RAM Upload] Создан индекс по категориям: ${Object.keys(productsByCategory).length} категорий`);
    
    // Шаг 3: Сохраняем метку что предзагрузка выполнена
    LocalStorageCache.set('ram_upload_completed', {
      timestamp: Date.now(),
      productsCount: productsData.products.length,
      categoriesCount: Object.keys(productsByCategory).length
    });
    
    if (onProgress) onProgress('Готово!', 100);
    
    console.log('✅ [RAM Upload] Предзагрузка завершена успешно!');
    logCacheStats();
    
  } catch (error) {
    console.error('❌ [RAM Upload] Ошибка предзагрузки:', error);
    throw error;
  }
}

/**
 * Проверить была ли выполнена предзагрузка
 */
export function isRAMUploadCompleted(): boolean {
  const uploadInfo = LocalStorageCache.get<{
    timestamp: number;
    productsCount: number;
    categoriesCount: number;
  }>('ram_upload_completed');
  
  if (!uploadInfo) {
    console.log('📭 [RAM Upload] Предзагрузка ещё не выполнялась');
    return false;
  }
  
  // Проверяем возраст предзагрузки (если больше 7 дней - считаем устаревшей)
  const age = Date.now() - uploadInfo.timestamp;
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 дней
  
  if (age > maxAge) {
    console.log(`⏰ [RAM Upload] Предзагрузка устарела (${Math.round(age / 1000 / 60 / 60 / 24)} дней), требуется обновление`);
    return false;
  }
  
  console.log(`✅ [RAM Upload] Предзагрузка актуальна (${uploadInfo.productsCount} товаров, ${uploadInfo.categoriesCount} категорий)`);
  return true;
}

/**
 * Получить информацию о предзагрузке
 */
export function getRAMUploadInfo(): {
  timestamp: number;
  productsCount: number;
  categoriesCount: number;
  age: number;
  ageText: string;
} | null {
  const uploadInfo = LocalStorageCache.get<{
    timestamp: number;
    productsCount: number;
    categoriesCount: number;
  }>('ram_upload_completed');
  
  if (!uploadInfo) return null;
  
  const age = Date.now() - uploadInfo.timestamp;
  const ageMinutes = Math.round(age / 1000 / 60);
  const ageHours = Math.round(age / 1000 / 60 / 60);
  const ageDays = Math.round(age / 1000 / 60 / 60 / 24);
  
  let ageText = '';
  if (ageDays > 0) {
    ageText = `${ageDays} дн. назад`;
  } else if (ageHours > 0) {
    ageText = `${ageHours} ч. назад`;
  } else {
    ageText = `${ageMinutes} мин. назад`;
  }
  
  return {
    ...uploadInfo,
    age,
    ageText
  };
}