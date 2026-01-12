import { projectId, publicAnonKey } from './supabase/info';
import { supabase } from './supabase/client';
import { getUzbekistanISOString } from './uzbekTime';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-6a74b22c`;

// 🔍 Health Check - перевірка працездатності сервера
export async function checkServerHealth() {
  try {
    console.log('🏥 [Health Check] Testing server connection...');
    console.log('   URL:', `${API_BASE}/health`);
    
    const response = await fetch(`${API_BASE}/health`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    
    if (!response.ok) {
      console.error('❌ [Health Check] Server returned:', response.status, response.statusText);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ [Health Check] Server is healthy:', data);
    return true;
  } catch (error) {
    console.error('❌ [Health Check] Server is DOWN!', error);
    console.error('   This means the Supabase Edge Function is not deployed or not responding.');
    console.error('   The app will try to use direct Supabase calls where possible.');
    return false;
  }
}

// 🏢 ОДНА ГЛАВНАЯ КОМПАНИЯ
// Все данные привязаны к этой компании (company_id = 1)
export const MAIN_COMPANY = {
  id: 1,
  name: 'Главная Компания',
  phone: '909383572',
  password: '24067',
  access_key: '123456789012345678901234567890' // 30 цифр
};

async function apiCall(endpoint: string, options: RequestInit = {}) {
  try {
    const url = `${API_BASE}${endpoint}`;
    console.log(`🌐 [API] Calling: ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      
      // Читаем тело ответа как текст
      try {
        const body = await response.text();
        
        // Пытаемся распарсить как JSON
        try {
          const errorData = JSON.parse(body);
          errorMessage = errorData.error || errorData.message || response.statusText;
        } catch (jsonError) {
          // Если не JSON, используем текст как есть
          errorMessage = body || response.statusText;
        }
      } catch (textError) {
        // Если не удалось прочитать тело, используем statusText
        errorMessage = response.statusText;
      }
      
      // Не логируем 404 ошибки для companies - это нормальная ситуация
      if (!(endpoint.includes('/companies') && response.status === 404)) {
        console.error(`❌ [API] Failed ${endpoint}:`, errorMessage);
      }
      
      throw new Error(errorMessage);
    }

    console.log(`✅ [API] Success: ${endpoint}`);
    return response.json();
  } catch (error) {
    // Перехватываем сетевые ошибки (например, когда сервер недоступен)
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error(`❌ [API] Network error for ${endpoint}: Failed to fetch`);
      console.error(`   URL was: ${API_BASE}${endpoint}`);
      console.error(`   This usually means:`);
      console.error(`   1. Server is not deployed`);
      console.error(`   2. CORS issue`);
      console.error(`   3. Network connectivity problem`);
      throw new Error('NETWORK_ERROR: Не удалось подключиться к серверу. Проверьте подключение к интернету.');
    }
    // Пробрасываем остальные ошибки
    throw error;
  }
}

// ========== Products API ==========

// NEW: Optimized paginated products endpoint with server-side filtering
export async function getProductsPaginated(params: {
  companyId?: number;
  limit?: number;
  offset?: number;
  search?: string;
  availableOnly?: boolean;
}) {
  const { companyId, limit = 50, offset = 0, search = '', availableOnly = false } = params;
  
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    available_only: availableOnly.toString(),
  });
  
  if (companyId) {
    queryParams.append('company_id', companyId.toString());
  }
  
  if (search) {
    queryParams.append('search', search);
  }
  
  const endpoint = `/products/paginated?${queryParams.toString()}`;
  console.log(`📦 [Paginated] Fetching products: ${endpoint}`);
  
  const data = await apiCall(endpoint);
  return {
    products: data.products || [],
    total: data.total || 0,
    hasMore: data.hasMore || false
  };
}

export async function getProducts(companyId?: number) {
  const endpoint = companyId ? `/products?company_id=${companyId}` : '/products';
  console.log(`📦 Fetching products with endpoint: ${endpoint}`);
  const data = await apiCall(endpoint);
  return data.products || [];
}

export async function addProduct(product: { 
  company_id: number; 
  name: string; 
  quantity: number; 
  price: number; 
  markup_percent?: number;
  has_color_options?: boolean;
  category?: string;
  barcode?: string;
}) {
  console.log('➕ [API] Add product request:', product);
  console.log('➕ [API] company_id type:', typeof product.company_id, 'value:', product.company_id);
  
  if (!product.company_id || isNaN(product.company_id)) {
    console.error('❌ [API] Invalid company_id!', product.company_id);
    throw new Error('Invalid company_id: ' + product.company_id);
  }
  
  // 🧹 Очистка пустых строк в числовых полях перед отправкой
  const cleanedProduct = { ...product };
  // ✅ ИСПРАВЛЕНО: company_id в таблице products это INTEGER, не TEXT!
  // ✅ ДОБАВЛЕНО: barcode и barid также могут быть NUMERIC и требуют очистки пустых строк
  const numericFields = ['company_id', 'quantity', 'price', 'markup_percent', 'barcode', 'barid'];
  
  numericFields.forEach(field => {
    const value = cleanedProduct[field as keyof typeof cleanedProduct];
    if (value === '' || value === null || value === undefined) {
      // ✅ КРИТИЧЕСКОЕ: пустая строка "" должна стать null, не 0!
      cleanedProduct[field as keyof typeof cleanedProduct] = field === 'markup_percent' ? 0 : (null as any);
    }
  });
  
  const data = await apiCall('/products/add', {
    method: 'POST',
    body: JSON.stringify(cleanedProduct),
  });
  
  console.log('➕ [API] Add product response:', data);
  return data;
}

export async function updateProduct(id: number, updates: any) {
  // 🧹 Очистка пустых строк в числовых полях перед отправкой
  const cleanedUpdates = { ...updates };
  
  // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Удаляем company_id из обновлений!
  // company_id НЕ ДОЛЖНО изменяться при обновлении товара
  if (cleanedUpdates.company_id !== undefined) {
    console.log(`⚠️ [updateProduct] Попытка изменить company_id для товара ${id}. Это запрещено! Удаляем из обновлений.`);
    delete cleanedUpdates.company_id;
  }
  
  // ✅ ИСПРАВЛЕНО: barcode и barid также могут быть NUMERIC и требуют очистки пустых строк
  const numericFields = ['price', 'markup_percent', 'markup_amount', 'selling_price', 'quantity', 'barcode', 'barid'];
  
  numericFields.forEach(field => {
    if (cleanedUpdates[field] === '' || cleanedUpdates[field] === null || cleanedUpdates[field] === undefined) {
      // ✅ КРИТИЧЕСКОЕ: пустая строка "" должна стать null!
      cleanedUpdates[field] = null;
    } else if (typeof cleanedUpdates[field] === 'string' && numericFields.includes(field)) {
      // Конвертируем строки в числа
      const parsed = parseFloat(cleanedUpdates[field]);
      // ✅ ВАЖНО: Если парсинг не удался - ставим null
      cleanedUpdates[field] = isNaN(parsed) ? null : parsed;
    }
  });
  
  await apiCall(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cleanedUpdates),
  });
}

export async function deleteProduct(id: number) {
  await apiCall(`/products/${id}`, {
    method: 'DELETE',
  });
}

export async function bulkImportProducts(companyId: number, products: any[]) {
  // 🧹 Очистка пустых строк в числовых полях для каждого товара
  const cleanedProducts = products.map(product => {
    const cleaned = { ...product };
    // ✅ ДОБАВЛЕНО: barcode и barid также могут быть NUMERIC и требуют очистки пустых строк
    const numericFields = ['quantity', 'price', 'markup_percent', 'barcode', 'barid'];
    
    numericFields.forEach(field => {
      if (cleaned[field] === '' || cleaned[field] === null || cleaned[field] === undefined) {
        cleaned[field] = field === 'markup_percent' ? 0 : 0;
      } else if (typeof cleaned[field] === 'string') {
        const parsed = parseFloat(cleaned[field]);
        cleaned[field] = isNaN(parsed) ? 0 : parsed;
      }
    });
    
    return cleaned;
  });
  
  await apiCall('/products/bulk-import', {
    method: 'POST',
    body: JSON.stringify({ company_id: companyId, products: cleanedProducts }),
  });
}

export async function deleteAllProducts() {
  await apiCall('/products', {
    method: 'DELETE',
  });
}

export async function toggleProductCustomerAvailability(id: number) {
  const data = await apiCall(`/products/${id}/toggle-customer-availability`, {
    method: 'PUT',
  });
  return data;
}

// ========== BULK TOGGLE - FAST & POWERFUL! ==========
export async function bulkToggleCustomerAvailability(productIds: number[], setAvailable: boolean) {
  console.log(`🚀 [API] Bulk toggle ${productIds.length} products to ${setAvailable}`);
  const data = await apiCall('/products/bulk-toggle-availability', {
    method: 'POST',
    body: JSON.stringify({ 
      product_ids: productIds, 
      set_available: setAvailable 
    }),
  });
  return data;
}

// ========== BULK UPDATE BARCODES - SUPERFAST! ==========
export async function bulkUpdateBarcodes(updates: Array<{ id: number; barcode: string }>) {
  console.log(`📊 [API] Bulk update ${updates.length} barcodes`);
  const data = await apiCall('/products/bulk-update-barcodes', {
    method: 'POST',
    body: JSON.stringify({ updates }),
  });
  return data;
}

// ========== Users API ==========

export async function getUsers() {
  const data = await apiCall('/users');
  return data.users || [];
}

export async function addUser(user: { first_name: string; last_name: string; phone_number: string; company_id?: string | null }) {
  const data = await apiCall('/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
  return data; // Return the response with user data
}

export async function getUserByPhone(phone: string) {
  const data = await apiCall(`/users/${phone}`);
  return data.user || null;
}

export async function deleteAllUsers() {
  await apiCall('/users', {
    method: 'DELETE',
  });
}

// ========== Sales History API ==========

export async function getSalesHistory(companyId: number) {
  try {
    // 🔥 Прямой запрос к Supabase с ЛИИТОМ (последние 500 продаж)
    // ⚡ ОПТИМИЗАЦИЯ: Загружаем только последние записи, чтобы не переполнить память
    const { data, error } = await supabase
      .from('sales_history')
      .select('*')
      .eq('company_id', companyId)
      .order('id', { ascending: false })
      .limit(500); // ✅ Максимум 500 последних продаж
    
    if (error) throw error;
    
    console.log(`📊 [API] Sales history loaded (direct): ${data?.length || 0} records (max 500)`);
    return data || [];
  } catch (error) {
    console.error('❌ [API] Error getting sales history:', error);
    return [];
  }
}

export async function addSale(sale: { company_id: number; items: any[]; total_amount: number }) {
  const data = await apiCall('/sales-history', {
    method: 'POST',
    body: JSON.stringify(sale),
  });
  return data;
}

// 🎯 НОВОЕ: Продажа из кассы (сохраняется в customer_orders для аналитики)
export async function addCashierSale(sale: { 
  company_id: number; 
  items: any[]; 
  total_amount: number;
  markup_profit: number; // Общая прибыль от наценки
}) {
  try {
    console.log('💰 [API] Creating cashier sale in customer_orders...');
    
    // Генериуем уникальный код заказа
    const orderCode = `CASH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Создаем заказ напрямую в customer_orders
    const { data, error } = await supabase
      .from('customer_orders')
      .insert({
        company_id: sale.company_id,
        user_name: 'Касса',
        user_phone: 'CASH',
        order_code: orderCode,
        items: sale.items,
        total_amount: sale.total_amount,
        markup_profit: sale.markup_profit,
        status: 'completed',
        payment_confirmed: true,
        created_date: new Date().toISOString(), // ✅ ИСПРАВЛЕНО: created_date вместо created_at
        confirmed_date: new Date().toISOString(),
        order_date: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ [API] Cashier sale saved:', data);
    return { success: true, order: data };
  } catch (error) {
    console.error('❌ [API] Error creating cashier sale:', error);
    throw error;
  }
}

// ========== Customer Orders API ==========

export async function getCustomerOrders(companyId: number) {
  try {
    // 🔥 ВАЖНО: Используем Edge Function для автоматической проверки и очистки невалидных заказов!
    console.log(`📦 [API] Loading customer orders for company ${companyId} via server...`);
    
    const data = await apiCall(`/customer-orders?company_id=${companyId}`);
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to load orders');
    }
    
    const orders = data.orders || [];
    
    // Если были автоматически отменены заказы - показываем информационное сообщение (не ошибку)
    if (data.auto_cancelled && data.auto_cancelled > 0) {
      console.log(`ℹ️ [API] ${data.auto_cancelled} заказ(ов) был автоматически отменен из-за недоступности товаров`);
      // Это нормальное поведение системы - заказы отменяются если товары закончились
    }
    
    console.log(`✅ [API] Customer orders loaded: ${orders.length} records`);
    return orders;
  } catch (error) {
    console.error('❌ [API] Error getting customer orders:', error);
    return [];
  }
}

export async function addCustomerOrder(order: { user_id?: number; user_name?: string; user_phone?: string; items: any[]; total_amount: number }) {
  try {
    // 🔥 ВАЖНО: Используем Edge Function с проверкой наличия товаров!
    console.log('📝 [API] Creating customer order via server:', {
      user_name: order.user_name,
      user_phone: order.user_phone,
      items_count: order.items.length,
      total: order.total_amount
    });
    
    const data = await apiCall('/customer-orders', {
      method: 'POST',
      body: JSON.stringify({
        user_id: order.user_id,
        user_name: order.user_name,
        user_phone: order.user_phone,
        items: order.items,
        total_amount: order.total_amount
      })
    });
    
    if (!data.success) {
      // Если товар недоступен, показываем информацию
      if (data.unavailableItems) {
        console.error('❌ [API] Order creation failed - unavailable items:', data.unavailableItems);
        throw new Error(`Некоторые товары недоступны:\n${data.unavailableItems.map((item: any) => `• ${item.name}: ${item.reason || 'Недоступен'}`).join('\n')}`);
      }
      throw new Error(data.error || 'Ошибка создания заказа');
    }
    
    console.log('✅ [API] Order created successfully:', {
      order_id: data.order_id,
      order_code: data.order_code
    });
    
    return {
      order_id: data.order_id,
      order_code: data.order_code
    };
  } catch (error) {
    console.error('❌ [API] Error creating order:', error);
    throw error;
  }
}

export async function confirmOrderPayment(orderId: number) {
  console.log('\n' + '='.repeat(80));
  console.log(`💰 [API] Подтверждение оплаты заказа #${orderId}...`);
  console.log('='.repeat(80));
  
  const result = await apiCall(`/customer-orders/${orderId}/confirm-payment`, {
    method: 'PUT',
  });
  
  console.log('✅ [API] Заказ подтвержден! Результат от сервера:');
  console.log(JSON.stringify(result, null, 2));
  console.log('='.repeat(80) + '\n');
  
  return result;
}

// ========== ОТМЕНА ЗАКАЗА ПОКУПАТЕЛЯ ==========
export async function cancelOrder(orderId: number) {
  console.log(`🚫 [API] Cancelling order ${orderId}...`);
  const data = await apiCall(`/customer-orders/${orderId}/cancel`, {
    method: 'PUT',
  });
  console.log(`✅ [API] Order ${orderId} cancelled successfully`);
  return data;
}

export async function searchOrderByCode(orderCode: string) {
  const data = await apiCall(`/customer-orders/search/${orderCode}`);
  return data.order;
}

export async function getOrdersByPhone(phoneNumber: string) {
  try {
    // 🔥 Прямой запрос к Supabase вместо Edge Function
    console.log('📱 [API] Getting orders by phone (direct):', phoneNumber);
    
    const { data, error } = await supabase
      .from('customer_orders')
      .select('*')
      .eq('user_phone', phoneNumber)
      .order('id', { ascending: false });
    
    if (error) throw error;
    
    console.log(`✅ [API] Orders loaded (direct): ${data?.length || 0} orders`);
    return data || [];
  } catch (error) {
    console.error('❌ [API] Error getting orders by phone:', error);
    return [];
  }
}

// ========== Companies API ==========

export async function getCompanies() {
  const data = await apiCall('/companies');
  return data.companies || [];
}

export async function addCompany(company: { 
  name: string; 
  phone: string; 
  password: string; 
  access_key: string;
  is_private?: boolean;
  company_id?: string;
  first_name?: string;
  last_name?: string;
}) {
  const data = await apiCall('/companies/secure-create', {
    method: 'POST',
    body: JSON.stringify(company),
  });
  return data.company;
}

// 🔒 Get company by company_id (for private companies)
export async function getCompanyByCompanyId(companyId: string) {
  try {
    const data = await apiCall(`/companies/by-company-id/${companyId}`);
    return data.company;
  } catch (error) {
    console.error('Error getting company by company_id:', error);
    throw error;
  }
}

// 🔄 Toggle company privacy mode
export async function toggleCompanyPrivacy(
  companyId: number, 
  isPrivate: boolean, 
  privateId?: string
) {
  try {
    const data = await apiCall(`/companies/${companyId}/toggle-privacy`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_private: isPrivate,
        company_id: privateId
      }),
    });
    return data.company;
  } catch (error) {
    console.error('Error toggling company privacy:', error);
    throw error;
  }
}

// Update main company details
export async function updateMainCompany(updates: { name?: string; phone?: string; password?: string; access_key?: string }) {
  try {
    // Сначала получаем актуальную компанию (чтобы узнать правильный ID)
    const currentCompany = await getMainCompany();
    
    // Обновляем с правильным ID
    const data = await apiCall(`/companies/${currentCompany.id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    
    // Обновляем глобальный ID если изменился
    if (currentCompany.id !== MAIN_COMPANY.id) {
      (MAIN_COMPANY as any).id = currentCompany.id;
    }
    
    return data.company;
  } catch (error) {
    console.error('Error updating main company:', error);
    throw error;
  }
}

// Create main company if it doesn't exist
async function createMainCompany(updates: { name?: string; phone?: string; password?: string; access_key?: string }) {
  const companyData = {
    name: updates.name || MAIN_COMPANY.name,
    phone: updates.phone || MAIN_COMPANY.phone,
    password: updates.password || MAIN_COMPANY.password,
    access_key: updates.access_key || MAIN_COMPANY.access_key
  };
  
  try {
    const data = await apiCall('/companies', {
      method: 'POST',
      body: JSON.stringify(companyData),
    });
    console.log('✅ New company created:', data.company.id);
    return data.company;
  } catch (error) {
    // Если компания уже существует, ищем её
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('ℹ️ Company already exists, searching...');
      try {
        const allData = await apiCall('/companies');
        const companies = allData.companies || [];
        
        // Ищем по телефону или по ключу
        const company = companies.find((c: any) => 
          c.phone === companyData.phone.replace(/\s/g, '') ||
          c.access_key === companyData.access_key
        );
        
        if (company) {
          console.log('✅ Found existing company:', company.id);
          (MAIN_COMPANY as any).id = company.id;
          return company;
        }
        
        // Если не нашли, берем первую
        if (companies.length > 0) {
          console.log('ℹ️ Using first company:', companies[0].id);
          (MAIN_COMPANY as any).id = companies[0].id;
          return companies[0];
        }
      } catch (searchError) {
        console.warn('Failed to search for existing company:', searchError);
      }
    }
    
    // В крайнем случае возвращаем дефолтные данные
    console.log('⚠️ Using default company data');
    return {
      id: MAIN_COMPANY.id,
      ...companyData
    };
  }
}

// Get main company from database
export async function getMainCompany() {
  try {
    // Сначала пробуем получить по ID
    const data = await apiCall(`/companies/${MAIN_COMPANY.id}`);
    return data.company;
  } catch (error) {
    // Если не найдена по ID, ищем по телефону
    if (error instanceof Error && error.message.includes('404')) {
      console.log('🔍 Company with ID=1 not found, searching by phone...');
      try {
        // Получаем все компании и ищем по телефону
        const allData = await apiCall('/companies');
        const companies = allData.companies || [];
        
        // Ищем компанию с нашим телефоном
        const company = companies.find((c: any) => 
          c.phone === MAIN_COMPANY.phone.replace(/\s/g, '')
        );
        
        if (company) {
          console.log('✅ Found existing company with phone:', company.phone, 'ID:', company.id);
          // Обновляем MAIN_COMPANY.id для будущих запросов
          (MAIN_COMPANY as any).id = company.id;
          return company;
        }
        
        // Еси не найдена, берем первую компанию или создаем новую
        if (companies.length > 0) {
          console.log('ℹ️ Using first available company');
          (MAIN_COMPANY as any).id = companies[0].id;
          return companies[0];
        }
        
        // Создаем новую компанию
        console.log('🏢 No companies found, creating new one...');
        return await createMainCompany({
          name: MAIN_COMPANY.name,
          phone: MAIN_COMPANY.phone,
          password: MAIN_COMPANY.password,
          access_key: MAIN_COMPANY.access_key
        });
      } catch (searchError) {
        console.error('Failed to search for company:', searchError);
        throw searchError;
      }
    }
    throw error;
  }
}

export async function deleteCompany(id: string) {
  await apiCall(`/companies/${id}`, {
    method: 'DELETE',
  });
}

export async function getCompanyRevenue(companyId: number) {
  try {
    console.log(`💰 [API] Getting revenue for company ${companyId}...`);
    
    // 🔥 Прямой запрос к Supabase вместо Edge Function
    // Получаем все продажи компании
    const { data: sales, error } = await supabase
      .from('sales_history')
      .select('total_amount, items')
      .eq('company_id', companyId);
    
    if (error) throw error;
    
    console.log(`📊 [API] Found ${sales?.length || 0} sales for company ${companyId}`);
    
    // Вычисляем выручку
    const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    
    // Вычисляем заработок компании (наценки)
    // ✅ ИСПРАВЛЕНО: Используем markup_amount вместо пересчёта!
    let companyEarnings = 0;
    console.log('💰 [API] Расчет прибыли от наценок:');
    sales?.forEach((sale, saleIndex) => {
      const items = sale.items || [];
      console.log(`   📦 Продажа ${saleIndex + 1}: ${items.length} товаров`);
      items.forEach((item: any) => {
        // ✅ markup_amount уже сохранено в базе при создании заказа
        const markupAmount = item.markup_amount || 0;
        const quantity = item.quantity || 0;
        const itemEarnings = markupAmount * quantity;
        console.log(`      💵 ${item.name}: markup=${markupAmount} × ${quantity} = ${itemEarnings} сум`);
        companyEarnings += itemEarnings;
      });
    });
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`💰 [API] ИТОГО ПРИБЫЛЬ ОТ НАЦЕНОК: ${companyEarnings.toLocaleString()} сум`);
    console.log(`${'='.repeat(60)}\n`);
    
    console.log(`💰 [API] Revenue calculated:`, { 
      totalRevenue, 
      companyEarnings,
      sales: sales?.length || 0
    });
    
    return {
      totalRevenue,
      companyEarnings,
      sellersRevenue: 0
    };
  } catch (error) {
    console.error('❌ [API] Error getting company revenue:', error);
    return {
      totalRevenue: 0,
      companyEarnings: 0,
      sellersRevenue: 0
    };
  }
}

// 💰 НОВОЕ: Получить финансовую статистику из financial_stats
export async function getFinancialStats(companyId: number) {
  try {
    console.log(`📊 [API] Getting financial stats for company ${companyId}...`);
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-6a74b22c/companies/${companyId}/financial-stats`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      // 🔍 ПРОВЕРКА: Если колонка markup_profit не существует - показываем понятную ошибку
      if (data.error && data.error.includes('markup_profit')) {
        console.error('❌❌❌ [API] КОЛОНКА markup_profit НЕ СУЩЕСТВУЕТ!');
        console.error('📋 [API] ОТКРОЙТЕ ФАЙЛ: /ADD_COLUMN_INSTRUCTION.md');
        console.error('📋 [API] НУЖНО: Добавить колонку markup_profit в таблицу customer_orders');
        alert('⚠️ ОШИБКА: Колонка markup_profit не существует!\n\nОткройте файл /ADD_COLUMN_INSTRUCTION.md для инструкций.');
      }
      throw new Error(data.error || 'Failed to get financial stats');
    }
    
    console.log('✅ [API] Financial stats loaded:', data);
    
    return {
      totalMarkupProfit: data.totalMarkupProfit || 0,
      totalRevenue: data.totalRevenue || 0,
      salesCount: data.salesCount || 0,
      orders: data.orders || []
    };
  } catch (error) {
    console.error('❌ [API] Error getting financial stats:', error);
    return {
      totalMarkupProfit: 0,
      totalRevenue: 0,
      salesCount: 0,
      orders: []
    };
  }
}

export async function loginCompany(phone: string, password: string) {
  console.log('🔐 [API] Login company request'); // 🔒 БЕЗОПАСНОСТЬ: Не логируем phone и password
  const data = await apiCall('/companies/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
  console.log('🔐 [API] Login company response:', data);
  
  if (!data.success) {
    throw new Error(data.error || 'Login failed');
  }
  
  return data.company;
}

export async function verifyCompanyAccess(companyId: number, accessKey: string) {
  console.log('🔑 [API] Verify access request for company:', companyId); // 🔒 БЕЗОПАСНОСТЬ: Не логируем accessKey
  const data = await apiCall('/companies/verify-access', {
    method: 'POST',
    body: JSON.stringify({ company_id: companyId, access_key: accessKey }),
  });
  console.log('🔑 [API] Verify access response:', data);
  
  if (!data.success) {
    throw new Error(data.error || 'Access verification failed');
  }
  
  return data.company;
}

export async function getCompanyExpenses(companyId: number) {
  console.log('💰 [API] Get company expenses (direct Supabase):', companyId);
  
  try {
    // 🔥 Прямой запрос к Supabase вместо Edge Function
    const { data, error } = await supabase
      .from('expenses')
      .select('employee_expenses, electricity_expenses, purchase_costs')
      .eq('company_id', companyId)
      .single();
    
    // 📊 НОВОЕ: Получаем также все пользовательские затраты с датами
    const { data: customExpenses, error: customError } = await supabase
      .from('company_custom_expenses')
      .select('*')
      .eq('company_id', companyId)
      .order('expense_date', { ascending: false });
    
    if (error) {
      // Если запись не найдена, возвращаем нули
      if (error.code === 'PGRST116') {
        console.log('💰 [API] No expenses found, returning zeros');
        return { 
          expenses: {
            employee_expenses: 0,
            electricity_expenses: 0,
            purchase_costs: 0,
            custom_expenses: 0,
            all_custom_expenses: customExpenses || []
          }
        };
      }
      throw error;
    }
    
    // Рассчитываем сумму всех пользовательских затрат
    const totalCustomExpenses = customExpenses?.reduce((sum, expense) => {
      return sum + (parseFloat(expense.amount) || 0);
    }, 0) || 0;
    
    console.log('💰 [API] Expenses loaded:', data);
    console.log('💰 [API] Custom expenses loaded:', customExpenses?.length, 'items, total:', totalCustomExpenses);
    
    return { 
      expenses: {
        ...data,
        custom_expenses: totalCustomExpenses,
        all_custom_expenses: customExpenses || []
      }
    };
  } catch (error) {
    console.error('❌ [API] Error getting expenses:', error);
    // Возвращаем нули вместо ошибки
    return { 
      expenses: {
        employee_expenses: 0,
        electricity_expenses: 0,
        purchase_costs: 0,
        custom_expenses: 0,
        all_custom_expenses: []
      }
    };
  }
}

export async function updateCompanyExpenses(
  companyId: number, 
  expenses: {
    employee_expenses?: number;
    electricity_expenses?: number;
    purchase_costs?: number;
  }
) {
  console.log('💰 [API] Update company expenses (direct Supabase):', { companyId, expenses });
  
  try {
    // 🔥 Прямой запрос к Supabase вместо Edge Function
    
    // Сначала проверяем существует ли запись
    const { data: existing, error: checkError } = await supabase
      .from('expenses')
      .select('id')
      .eq('company_id', companyId)
      .single();
    
    let result;
    
    if (existing && !checkError) {
      // Обновляем существующую запись
      console.log('💰 [API] Updating existing expenses...');
      const { data, error } = await supabase
        .from('expenses')
        .update({
          employee_expenses: expenses.employee_expenses ?? 0,
          electricity_expenses: expenses.electricity_expenses ?? 0,
          purchase_costs: expenses.purchase_costs ?? 0
        })
        .eq('company_id', companyId)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Создаем новую запись
      console.log('💰 [API] Creating new expenses record...');
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          company_id: companyId,
          employee_expenses: expenses.employee_expenses ?? 0,
          electricity_expenses: expenses.electricity_expenses ?? 0,
          purchase_costs: expenses.purchase_costs ?? 0
        })
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }
    
    console.log('✅ [API] Expenses saved successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ [API] Error updating expenses:', error);
    throw error;
  }
}

// ========== User Cart API ==========

export async function getUserCart(phoneNumber: string) {
  console.log('🛒 [API] Get user cart:', phoneNumber);
  const data = await apiCall(`/user-cart/${phoneNumber}`);
  return data.cart || {};
}

export async function saveUserCart(phoneNumber: string, cartData: any) {
  console.log('💾 [API] Save user cart:', phoneNumber, 'items:', Object.keys(cartData).length);
  await apiCall('/user-cart', {
    method: 'POST',
    body: JSON.stringify({ phone_number: phoneNumber, cart_data: cartData }),
  });
}

// ========== User Receipts API ==========

export async function getUserReceipts(phoneNumber: string) {
  console.log('📄 [API] Get user receipts:', phoneNumber);
  const data = await apiCall(`/user-receipts/${phoneNumber}`);
  return data.receipts || [];
}

export async function saveUserReceipt(receipt: {
  phone_number: string;
  order_code: string;
  total: number;
  items_count: number;
  items: any[];
}) {
  console.log('💾 [API] Save user receipt:', receipt.order_code);
  await apiCall('/user-receipts', {
    method: 'POST',
    body: JSON.stringify(receipt),
  });
}

// ========== User Likes API ==========

export async function getUserLikes(phoneNumber: string) {
  console.log('❤️ [API] Get user likes:', phoneNumber);
  const data = await apiCall(`/user-likes/${phoneNumber}`);
  return data.likes || [];
}

export async function saveUserLikes(phoneNumber: string, likedProductIds: number[]) {
  console.log('💾 [API] Save user likes:', phoneNumber, 'products:', likedProductIds.length);
  await apiCall('/user-likes', {
    method: 'POST',
    body: JSON.stringify({ phone_number: phoneNumber, liked_product_ids: likedProductIds }),
  });
}

// ========== Product Images API ==========

export async function uploadProductImage(productId: number, imageFile: File) {
  console.log('📸 [API] Uploading image for product:', productId);
  
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const response = await fetch(`${API_BASE}/products/${productId}/upload-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`Image upload failed:`, error);
    throw new Error(`Image upload error: ${error}`);
  }
  
  const data = await response.json();
  console.log('✅ [API] Image uploaded:', data);
  return data;
}

export async function getProductImages(productId: number) {
  const data = await apiCall(`/products/${productId}/images`);
  return data.images || [];
}

export async function deleteProductImage(productId: number, imageIndex: number) {
  console.log('🗑️ [API] Deleting image', imageIndex, 'from product', productId);
  await apiCall(`/products/${productId}/images/${imageIndex}`, {
    method: 'DELETE',
  });
}

// ========== Company Rating API ==========

// Получить информацию о компании с рейтингом
export async function getCompanyProfile(companyId: number) {
  return await apiCall(`/companies/${companyId}/profile`);
}

// Поставить оценку компании
export async function rateCompany(companyId: number, customerId: string, rating: number) {
  return await apiCall(`/companies/${companyId}/rate`, {
    method: 'POST',
    body: JSON.stringify({ customer_id: customerId, rating }),
  });
}

// ========== Advertisements API ==========

export interface Advertisement {
  id: string;
  company_id: number;
  company_name: string;
  smm_post_id: string;
  image_url: string;
  caption: string;
  link_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

// Создать рекламу (отправить на модерацию)
export async function createAdvertisement(data: {
  company_id: number;
  company_name: string;
  smm_post_id: string;
  image_url: string;
  caption: string;
  link_url?: string;
}) {
  return await apiCall('/ads', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Получить рекламы (с фильтрами)
export async function getAdvertisements(filters?: {
  status?: 'pending' | 'approved' | 'rejected';
  company_id?: number;
}) {
  let endpoint = '/ads';
  const params = new URLSearchParams();
  
  if (filters?.status) params.append('status', filters.status);
  if (filters?.company_id) params.append('company_id', filters.company_id.toString());
  
  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }
  
  return await apiCall(endpoint);
}

// Утвердить рекламу (админ)
export async function approveAdvertisement(adId: string) {
  return await apiCall(`/ads/${adId}/approve`, {
    method: 'PUT',
  });
}

// Отклонить рекламу (админ)
export async function rejectAdvertisement(adId: string, reason?: string) {
  return await apiCall(`/ads/${adId}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  });
}

// Удалить рекламу
export async function deleteAdvertisement(adId: string) {
  console.log('🗑️ [API] deleteAdvertisement called for:', adId);
  const result = await apiCall(`/ads/${adId}`, {
    method: 'DELETE',
  });
  console.log('🗑️ [API] deleteAdvertisement result:', result);
  return result;
}

// ========== Company API ==========