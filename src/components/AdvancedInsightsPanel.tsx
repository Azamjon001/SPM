/**
 * 📊 РАСШИРЕННАЯ АНАЛИТИКА
 * - TOP 10 самых продаваемых товаров
 * - Товары с низким остатком (умная логика)
 */

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, AlertTriangle, Package } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  quantity: number;
  price: number;
  selling_price?: number;
}

interface SaleItem {
  product_id: number;
  product_name: string;
  quantity: number;
}

interface AdvancedInsightsPanelProps {
  products: Product[];
  customerOrders: any[];
}

export default function AdvancedInsightsPanel({ products, customerOrders }: AdvancedInsightsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [topProducts, setTopProducts] = useState<Array<{ name: string; totalSold: number; revenue: number }>>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Array<{ name: string; quantity: number; price: number; threshold: number }>>([]);
  const [rankingMode, setRankingMode] = useState<'quantity' | 'revenue'>('quantity'); // 🆕 Режим рейтинга

  useEffect(() => {
    calculateTopProducts();
    calculateLowStockProducts();
  }, [products, customerOrders, rankingMode]); // 🆕 Пересчитываем при изменени режима

  // 🏆 TOP 10 самых продаваемых товаров
  const calculateTopProducts = () => {
    const salesMap = new Map<string, { name: string; totalSold: number; revenue: number }>(); // 🔥 Группируем по НАЗВАНИЮ, а не ID

    console.log('\n' + '🏆'.repeat(40));
    console.log('🏆 [TOP Products] Начало подсчета TOP продаваемых товаров');
    console.log('🏆 Заказов получено:', customerOrders.length);
    console.log('🏆 Товаров в базе:', products.length);
    console.log('🏆'.repeat(40));

    // Собираем все продажи из заказов (только delivered и paid)
    customerOrders.forEach((order, idx) => {
      console.log(`\n📦 Заказ ${idx + 1}/${customerOrders.length}:`, {
        order_code: order.order_code,
        status: order.status,
        has_items: !!order.items,
        items_is_array: Array.isArray(order.items),
        items_length: order.items?.length || 0,
        full_order: order
      });

      // Учитываем только подтвержденные и оплаченные заказы
      // ✅ ИСПРАВЛЕНО: Добавлен статус 'completed' для кассовых продаж
      if (order.status !== 'delivered' && order.status !== 'paid' && order.status !== 'completed') {
        console.log(`  ❌ Пропускаем: статус "${order.status}" (нужен "paid", "delivered" или "completed")`);
        return;
      }

      console.log(`  ✅ Статус подходит: ${order.status}`);

      if (!order.items) {
        console.log(`  ❌ У заказа НЕТ поля items!`);
        return;
      }

      if (!Array.isArray(order.items)) {
        console.log(`  ❌ items не является массивом! Тип:`, typeof order.items);
        return;
      }

      if (order.items.length === 0) {
        console.log(`  ❌ items пустой массив`);
        return;
      }

      console.log(`  ✅ items массив с ${order.items.length} товарами`);

      order.items.forEach((item: SaleItem, itemIdx) => {
        console.log(`    📦 Товар ${itemIdx + 1}:`, item);
        
        const productId = item.product_id || item.id;
        const productName = item.product_name || item.name;
        
        if (!productName) {
          console.log(`      ❌ Товар без названия`);
          return;
        }
        
        // 🔥 ИСПРАВЛЕНИЕ: Группируем по названию (регистронезависимо)
        const normalizedName = productName.toLowerCase().trim();
        
        const existing = salesMap.get(normalizedName);
        const product = products.find(p => p.id === productId || p.name.toLowerCase().trim() === normalizedName);
        const itemPrice = product?.selling_price || product?.price || 0;
        const itemRevenue = itemPrice * item.quantity;

        if (existing) {
          existing.totalSold += item.quantity;
          existing.revenue += itemRevenue;
          console.log(`      ➕ ${productName}: +${item.quantity} шт (всего: ${existing.totalSold} шт, выручка: ${existing.revenue.toLocaleString()} сум)`);
        } else {
          const newEntry = {
            name: productName, // Сохраняем оригинальное название (с заглавными буквами)
            totalSold: item.quantity,
            revenue: itemRevenue
          };
          salesMap.set(normalizedName, newEntry);
          console.log(`      🆕 ${productName}: ${item.quantity} шт (новый товар в топе, выручка: ${itemRevenue.toLocaleString()} сум)`);
        }
      });
    });

    console.log('\n📊 Всего уникальных товаров в топе:', salesMap.size);

    // Сортируем по количеству продаж и берем TOP 10
    // 🔥 ВАЖНО: Показываем только товары которые ЕЩЁ ЕСТЬ на складе (quantity > 0)
    const sorted = Array.from(salesMap.values())
      .filter(item => {
        // Ищем товар в складе
        const normalizedName = item.name.toLowerCase().trim();
        const productInStock = products.find(p => p.name.toLowerCase().trim() === normalizedName);
        
        if (!productInStock) {
          console.log(`  ❌ "${item.name}" - нет на складе (товар удален или не найден)`);
          return false;
        }
        
        if (productInStock.quantity <= 0) {
          console.log(`  ❌ "${item.name}" - нет на складе (quantity = ${productInStock.quantity})`);
          return false;
        }
        
        console.log(`  ✅ "${item.name}" - есть на складе (${productInStock.quantity} шт)`);
        return true;
      })
      .sort((a, b) => rankingMode === 'quantity' ? b.totalSold - a.totalSold : b.revenue - a.revenue)
      .slice(0, 10); // Максимум 10, минимум может быть меньше

    console.log('\n🏆 TOP 10 товаров по продажам:');
    sorted.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.name} - ${item.totalSold} шт (выручка: ${item.revenue.toLocaleString()} сум)`);
    });
    console.log('🏆'.repeat(40) + '\n');

    setTopProducts(sorted);
  };

  // ⚠️ Товары с низким остатком (умная логика)
  const calculateLowStockProducts = () => {
    if (products.length === 0) {
      setLowStockProducts([]);
      return;
    }

    // 1. Рассчитываем среднюю цену
    const totalPrice = products.reduce((sum, p) => sum + p.price, 0);
    const averagePrice = totalPrice / products.length;

    console.log('📊 [Low Stock] Средняя цена товаров:', averagePrice.toLocaleString(), 'сум');

    // 2. Фильтруем товары с низким остатком
    // 🔥 УВЕЛИЧЕНЫ ПОРОГИ: Дешевые ≤20 шт, Дорогие ≤10 шт (было 15/7)
    const lowStock = products
      .filter(product => {
        const threshold = product.price < averagePrice ? 20 : 10; // 🔥 ИСПРАВЛЕНО
        const isLowStock = product.quantity <= threshold && product.quantity > 0;
        
        if (isLowStock) {
          console.log(`  ⚠️ "${product.name}": ${product.quantity} шт ≤ ${threshold} (цена: ${product.price.toLocaleString()} сум)`);
        }
        
        return isLowStock;
      })
      .map(product => ({
        name: product.name,
        quantity: product.quantity,
        price: product.price,
        threshold: product.price < averagePrice ? 20 : 10 // 🔥 ИСПРАВЛЕНО
      }))
      .sort((a, b) => a.quantity - b.quantity); // Сортируем по возрастанию количества

    setLowStockProducts(lowStock);
    
    console.log(`⚠️ [Low Stock] Найдено ${lowStock.length} товаров с низким остатком`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' сум';
  };

  return (
    <div className="mt-6 max-w-7xl mx-auto">
      {/* Кнопка раскрытия/скрытия */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-6 py-4 rounded-lg shadow-lg transition-all duration-300 ${
          isOpen 
            ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900' 
            : 'bg-gradient-to-r from-cyan-400 to-cyan-500 text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6" />
          <span className="text-xl font-bold">
            📊 Расширенная аналитика
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <span className="text-sm opacity-90">
              {topProducts.length > 0 ? `${topProducts.length} TOP товаров` : ''}
              {lowStockProducts.length > 0 ? ` • ${lowStockProducts.length} товаров с низким остатком` : ''}
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-6 h-6" />
          ) : (
            <ChevronDown className="w-6 h-6" />
          )}
        </div>
      </button>

      {/* Содержимое панели */}
      {isOpen && (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 🏆 TOP 10 самых продаваемых товаров */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <h3 className="text-lg font-bold">🏆 TOP 10 самых продаваемых товаров</h3>
                </div>
              </div>
              
              {/* 🆕 Кнопки переключения режима рейтинга */}
              <div className="flex gap-2">
                <button
                  onClick={() => setRankingMode('quantity')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    rankingMode === 'quantity'
                      ? 'bg-white text-purple-600 shadow-md'
                      : 'bg-purple-400 text-white hover:bg-purple-300'
                  }`}
                >
                  📦 По количеству
                </button>
                <button
                  onClick={() => setRankingMode('revenue')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    rankingMode === 'revenue'
                      ? 'bg-white text-purple-600 shadow-md'
                      : 'bg-purple-400 text-white hover:bg-purple-300'
                  }`}
                >
                  💰 По прибыли
                </button>
              </div>
            </div>
            <div className="p-4">
              {topProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Пока нет продаж</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((product, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-orange-600' :
                          'bg-purple-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-600">
                            {rankingMode === 'quantity' ? (
                              <>Выручка: {formatPrice(product.revenue)}</>
                            ) : (
                              <>Продано: {product.totalSold} шт</>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-purple-600">
                          {rankingMode === 'quantity' ? (
                            <>{product.totalSold} шт</>
                          ) : (
                            <>{formatPrice(product.revenue)}</>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {rankingMode === 'quantity' ? 'продано' : 'выручка'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ⚠️ Товары с низким остатком */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-lg font-bold">⚠️ Товары с низким остатком</h3>
              </div>
              <p className="text-sm text-orange-100 mt-1">
                Дешевые: ≤20 шт • Дорогие: ≤10 шт
              </p>
            </div>
            <div className="p-4">
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Все товары в наличии</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lowStockProducts.map((product, index) => {
                    const urgencyLevel = 
                      product.quantity <= 3 ? 'critical' :
                      product.quantity <= 5 ? 'warning' :
                      'normal';

                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                          urgencyLevel === 'critical' ? 'bg-red-50 hover:bg-red-100' :
                          urgencyLevel === 'warning' ? 'bg-orange-50 hover:bg-orange-100' :
                          'bg-yellow-50 hover:bg-yellow-100'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-600">
                            Цена: {formatPrice(product.price)} • Порог: {product.threshold} шт
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className={`text-2xl font-bold ${
                            urgencyLevel === 'critical' ? 'text-red-600' :
                            urgencyLevel === 'warning' ? 'text-orange-600' :
                            'text-yellow-700'
                          }`}>
                            {product.quantity}
                          </div>
                          <div className="text-xs text-gray-500">осталось</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}