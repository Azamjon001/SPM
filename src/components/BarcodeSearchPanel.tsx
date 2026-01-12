import { useState, useRef, useEffect } from 'react';
import { Search, Barcode, X, Package, ShoppingCart, Trash2, RefreshCw, Plus, Minus, CheckCircle } from 'lucide-react';
import { useProducts, useUpdateProduct, queryClient, localCache } from '../utils/cache';
import { addCashierSale } from '../utils/api';
import { invalidateCache } from '../utils/productsCache';

interface Product {
  id: number;
  name: string;
  quantity: number;
  price: number;
  markup_percent?: number;
  markup_amount?: number; // 💰 НОВОЕ: Сумма наценки в деньгах
  selling_price?: number; // 💰 НОВОЕ: Цена продажи с наценкой
  available_for_customers?: boolean;
  images?: Array<{ url: string; filepath: string; uploaded_at: string }>;
  has_color_options?: boolean;
  category?: string;
  barcode?: string;
  barid?: string; // 🏷️ НОВОЕ: Barid для быстрого поиска
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface BarcodeSearchPanelProps {
  companyId: number;
}

export default function BarcodeSearchPanel({ companyId }: BarcodeSearchPanelProps) {
  const { data: products = [], isLoading, refetch } = useProducts(companyId);
  const updateProductMutation = useUpdateProduct();
  const [searchBarcode, setSearchBarcode] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [processing, setProcessing] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [editingQuantities, setEditingQuantities] = useState<{ [key: number]: string }>({}); // 🎯 Локальное состояние для инпутов количества

  // 🔍 Отладка: Выводим первые 3 товара чтобы посмотреть есть ли barid
  useEffect(() => {
    if (products.length > 0) {
      console.log('📦 [Debug] Первые 3 товара из БД:');
      products.slice(0, 3).forEach((p, index) => {
        console.log(`  Товар ${index + 1}:`, {
          id: p.id,
          name: p.name,
          barcode: p.barcode,
          barid: p.barid,
          hasBarid: !!p.barid,
          allKeys: Object.keys(p)
        });
      });
    }
  }, [products]);

  // 🎯 Вспомогательная функция для расчета цены с наценкой
  const getPriceWithMarkup = (price: number, markupPercent: number = 0) => {
    return price * (1 + markupPercent / 100);
  };

  // 🎯 Автоматический фокус на поле ввода при загрузке
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // 🎯 Возвращаем фокус после каждого сканирования
  useEffect(() => {
    if (lastScannedProduct || notFound) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [lastScannedProduct, notFound]);

  const handleScan = () => {
    if (!searchBarcode.trim()) {
      return;
    }

    const trimmedBarcode = searchBarcode.trim();
    
    // 🔍 Поиск по штрих-коду, barid или названию товара
    console.log('🔍 [Search] Ищем товар с barcode/barid/name:', trimmedBarcode);
    console.log('🔍 [Search] Всего товаров:', products.length);
    
    const foundProduct = products.find(p => {
      const matchBarcode = p.barcode === trimmedBarcode;
      const matchBarid = p.barid === trimmedBarcode;
      const matchName = p.name.toLowerCase().includes(trimmedBarcode.toLowerCase());
      
      if (matchBarcode || matchBarid || matchName) {
        console.log('✅ [Search] Товар найден!', {
          name: p.name,
          barcode: p.barcode,
          barid: p.barid,
          matchedBy: matchBarcode ? 'barcode' : matchBarid ? 'barid' : 'name'
        });
      }
      
      return matchBarcode || matchBarid || matchName;
    });

    if (foundProduct) {
      // ✅ Товар найден - добавляем в корзину
      setLastScannedProduct(foundProduct);
      setNotFound(false);
      addToCart(foundProduct);
      
      // Очищаем поле для следующего сканирования
      setSearchBarcode('');
    } else {
      // ❌ Товар не найден
      setLastScannedProduct(null);
      setNotFound(true);
      
      // Автоматически убираем уведомление через 2 секунды
      setTimeout(() => {
        setNotFound(false);
        setSearchBarcode('');
      }, 2000);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        // Товар уже в корзине - увеличиваем количество
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Новый товар - добавляем в корзину
        return [...prevCart, { product, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const handleNewOrder = () => {
    if (cart.length === 0) {
      return;
    }
    
    if (confirm('🔄 Начать новый заказ?\n\nТекущая корзина будет очищена.')) {
      setCart([]);
      setLastScannedProduct(null);
      setNotFound(false);
      setSearchBarcode('');
      barcodeInputRef.current?.focus();
    }
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => {
      const priceWithMarkup = getPriceWithMarkup(item.product.price, item.product.markup_percent || 0);
      return sum + (priceWithMarkup * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' сум';
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      return;
    }

    // 🚫 Проверяем что все товары имеют количество >= 1
    const invalidItems = cart.filter(item => item.quantity < 1);
    if (invalidItems.length > 0) {
      const itemsList = invalidItems.map(item => `• ${item.product.name}: ${item.quantity}`).join('\n');
      alert(`❌ Невозможно оформить заказ!\n\nСледующие товары имеют некорректное количество (должно быть >= 1):\n\n${itemsList}\n\nИзмените количество или удалите эти товары из корзины.`);
      return;
    }

    // Проверяем достаточно ли товаров на складе
    for (const item of cart) {
      if (item.product.quantity < item.quantity) {
        alert(`❌ Недостаточно товара на складе!\n\n${item.product.name}: требуется ${item.quantity} шт., доступно ${item.product.quantity} шт.`);
        return;
      }
    }

    if (!confirm(`✅ Оформить продажу?\n\nВсего товаров: ${getTotalItems()} шт.\nСумма: ${formatPrice(getTotalAmount())}\n\nТовары будут списаны со склада и добавлены в аналитику.`)) {
      return;
    }

    setProcessing(true);

    try {
      console.log('🛒 [Checkout] Starting checkout process...');
      console.log('🛒 [Checkout] Cart items:', cart);
      
      // 💰 Расчет общей прибыли от наценки
      let totalMarkupProfit = 0;
      
      const saleData = {
        company_id: companyId,
        items: cart.map(item => {
          const basePrice = item.product.price;
          const markupPercent = item.product.markup_percent || 0;
          const priceWithMarkup = getPriceWithMarkup(basePrice, markupPercent);
          const markupAmount = priceWithMarkup - basePrice; // Наценка за 1 штуку
          
          // ✅ Добавляем прибыль от наценки этого товара
          totalMarkupProfit += markupAmount * item.quantity;
          
          console.log(`💰 [Checkout] Item: ${item.product.name}, base: ${basePrice}, markup: ${markupPercent}%, markup_amount: ${markupAmount}, qty: ${item.quantity}, profit: ${markupAmount * item.quantity}`);
          
          return {
            product_id: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            price: basePrice,
            markup_percent: markupPercent,
            markup_amount: markupAmount, // 🎯 Добавляем наценку за 1 штуку!
            image_url: item.product.images && item.product.images.length > 0 ? item.product.images[0].url : null
          };
        }),
        total_amount: getTotalAmount(),
        markup_profit: totalMarkupProfit // 💰 Общая прибыль от наценки
      };
      
      console.log('🛒 [Checkout] Sale data:', saleData);
      console.log(`💰 [Checkout] Total markup profit: ${totalMarkupProfit.toLocaleString()} сум`);
      
      // 1. Сохраняем продажу в аналитику
      console.log('💾 [Checkout] Saving sale to analytics...');
      console.log(`💰 [Checkout] Данные для сохранения:`);
      console.log(`   - total_amount (selling_price): ${saleData.total_amount.toLocaleString()} сум`);
      console.log(`   - markup_profit (прибыль): ${saleData.markup_profit.toLocaleString()} сум`);
      console.log(`   - purchase_cost (price): ${(saleData.total_amount - saleData.markup_profit).toLocaleString()} сум`);
      const saleResult = await addCashierSale(saleData);
      console.log('✅ [Checkout] Sale saved:', saleResult);

      // 2. Уменьшаем количество товаров на складе
      console.log('📦 [Checkout] Updating product quantities...');
      for (const item of cart) {
        console.log(`📦 [Checkout] Updating ${item.product.name}: ${item.product.quantity} - ${item.quantity} = ${item.product.quantity - item.quantity}`);
        await updateProductMutation.mutateAsync({
          id: item.product.id,
          updates: {
            quantity: item.product.quantity - item.quantity
          }
        });
      }
      console.log('✅ [Checkout] All products updated');

      // 3. Очищаем кэш и обновляем данные
      console.log('🔄 [Checkout] Refreshing cache...');
      localCache.clear();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['salesHistory'] });
      queryClient.invalidateQueries({ queryKey: ['company-revenue'] }); // 💰 Обновляем выручку!
      invalidateCache(companyId);
      await refetch();
      console.log('✅ [Checkout] Cache refreshed');

      // 4. Очищаем корзину
      setCart([]);
      setLastScannedProduct(null);
      setNotFound(false);
      setSearchBarcode('');
      barcodeInputRef.current?.focus();

      alert(`✅ Продажа успешно оформлена!\n\nТовары списаны со склада.\nДанные добавлены в аналитику.`);
      console.log('✅ [Checkout] Checkout completed successfully!');
    } catch (error) {
      console.error('❌ [Checkout] Error:', error);
      
      // Более детальная информация об ошибке
      let errorMessage = '❌ Ошибка при оформлении продажи.\n\n';
      
      if (error instanceof Error) {
        errorMessage += `Детали: ${error.message}\n\n`;
      }
      
      errorMessage += 'Попробуйте снова или обратитесь к администратору.';
      
      alert(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 🎯 Касса - Поле сканирования штрих-кода */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2">
            <ShoppingCart className="w-7 h-7" />
            <span className="text-2xl">Цифровая Касса</span>
          </h2>
          
          {cart.length > 0 && (
            <button
              onClick={handleNewOrder}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-md"
            >
              <RefreshCw className="w-5 h-5" />
              🔄 Новый заказ
            </button>
          )}
        </div>
        
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              ref={barcodeInputRef}
              type="text"
              value={searchBarcode}
              onChange={(e) => {
                e.stopPropagation(); // ✅ Предотвращаем всплытие события
                setSearchBarcode(e.target.value);
                setNotFound(false);
                setLastScannedProduct(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // ✅ Предотвращаем стандартное поведение Enter
                  e.stopPropagation(); // ✅ Предотвращаем всплытие события
                  handleScan();
                }
              }}
              onClick={(e) => e.stopPropagation()} // ✅ Предотвращаем всплытие клика
              onFocus={(e) => e.stopPropagation()} // ✅ Предотвращаем всплытие фокуса
              className="w-full px-5 py-4 pl-14 text-gray-900 border-2 border-white rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-300 text-lg"
              placeholder="Штрих-код, barid или название товара..."
              autoFocus
            />
            <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
          </div>
          
          <button
            onClick={handleScan}
            className="bg-white text-blue-600 px-10 py-4 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-md"
          >
            <Search className="w-5 h-5" />
            Найти
          </button>
        </div>
        
        <p className="text-blue-100 text-sm mt-3">
          💡 Отсканируйте товар или введите штрих-код/barid/название и нажмите Enter
        </p>
      </div>

      {/* ✅ Уведомление о последнем отсканированном тваре */}
      {lastScannedProduct && (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 flex items-center gap-4 animate-pulse">
          <div className="bg-green-500 text-white rounded-full p-3">
            <Package className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="text-green-800 font-medium text-lg">✅ Добавлено в заказ!</div>
            <div className="text-green-700">
              {lastScannedProduct.name} - {formatPrice(getPriceWithMarkup(lastScannedProduct.price, lastScannedProduct.markup_percent || 0))}
            </div>
          </div>
          <button
            onClick={() => setLastScannedProduct(null)}
            className="text-green-600 hover:text-green-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ❌ Уведомление о ненайденном товаре */}
      {notFound && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 flex items-center gap-4 animate-pulse">
          <div className="bg-red-500 text-white rounded-full p-3">
            <X className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="text-red-800 font-medium text-lg">❌ Товар не найден!</div>
            <div className="text-red-700 font-mono">Штрих-код: {searchBarcode}</div>
          </div>
        </div>
      )}

      {/* 🛒 Корзина товаров */}
      {cart.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl text-gray-800 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
              Текущий заказ ({getTotalItems()} {getTotalItems() === 1 ? 'товар' : 'товаров'})
            </h3>
          </div>

          <div className="space-y-3">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Изображение */}
                  <div className="w-20 h-20 flex-shrink-0">
                    {item.product.images && item.product.images.length > 0 ? (
                      <img
                        src={item.product.images[0].url}
                        alt={item.product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Информация о товаре */}
                  <div className="flex-1">
                    <div className="text-lg font-medium text-gray-900">{item.product.name}</div>
                    <div className="text-sm text-gray-600 font-mono">{item.product.barcode}</div>
                    <div className="text-green-600 font-medium mt-1">
                      {(() => {
                        const priceWithMarkup = getPriceWithMarkup(item.product.price, item.product.markup_percent || 0);
                        const totalPrice = priceWithMarkup * item.quantity;
                        return `${formatPrice(priceWithMarkup)} × ${item.quantity} = ${formatPrice(totalPrice)}`;
                      })()}
                    </div>
                  </div>

                  {/* Управление количеством */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newQty = Math.max(0, item.quantity - 1); // Не уходим в минус
                        updateQuantity(item.product.id, newQty);
                      }}
                      className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    
                    <input
                      type="number"
                      min="0"
                      value={editingQuantities[item.product.id] !== undefined ? editingQuantities[item.product.id] : item.quantity}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        
                        // Сохраняем значение в локальное состояние (разрешаем пустую строку и 0)
                        setEditingQuantities(prev => ({ ...prev, [item.product.id]: inputValue }));
                        
                        // Обновляем корзину если значение валидное (включая 0)
                        // Если поле пустое - НЕ обновляем корзину, товар остается с прежним количеством
                        if (inputValue !== '') {
                          const val = parseInt(inputValue);
                          if (!isNaN(val) && val >= 0) {
                            updateQuantity(item.product.id, val);
                          }
                        }
                        // Если inputValue === '' - ничего не делаем, товар остается в корзине!
                      }}
                      onBlur={() => {
                        // При потере фокуса просто очищаем локальное состояние
                        // Товар останется в корзине с текущим количеством (даже если это 0)
                        setEditingQuantities(prev => {
                          const newState = { ...prev };
                          delete newState[item.product.id];
                          return newState;
                        });
                      }}
                      onFocus={() => {
                        // При фокусе инициализируем локальное состояние текущим значением из корзины
                        setEditingQuantities(prev => ({ ...prev, [item.product.id]: item.quantity.toString() }));
                      }}
                      className="w-20 text-center border-2 border-gray-300 rounded-lg py-2 font-medium text-lg"
                    />
                    
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="bg-green-100 text-green-600 p-2 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors ml-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 💰 Итоговая сумма */}
          <div className="mt-6 pt-6 border-t-2 border-gray-300">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-medium text-gray-800">Итого:</div>
              <div className="text-4xl font-bold text-green-600">
                {formatPrice(getTotalAmount())}
              </div>
            </div>
            <div className="text-right text-sm text-gray-600 mt-2">
              Всего товаров: {getTotalItems()} шт.
            </div>
          </div>

          {/* ✅ Кнопка "Куплено" */}
          <div className="mt-6">
            <button
              onClick={handleCheckout}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-5 rounded-xl hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-3 shadow-lg text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={processing}
            >
              {processing ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  Обработка...
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6" />
                  ✅ Куплено
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 📊 Пустая корзина */}
      {cart.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl text-gray-600 mb-2">Корзина пуста</h3>
          <p className="text-gray-500">
            Отсканируйте штрих-код товара для начала работы
          </p>
        </div>
      )}

      {/* 📊 Статистика */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="mb-4 text-gray-800">Статистика товаров со штрих-кодами</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 mb-1">Всего товаров</div>
            <div className="text-3xl text-blue-700">{products.length}</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-600 mb-1">Со штрих-кодом</div>
            <div className="text-3xl text-green-700">
              {products.filter(p => p.barcode && p.barcode.trim()).length}
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-sm text-orange-600 mb-1">Без штрих-кода</div>
            <div className="text-3xl text-orange-700">
              {products.filter(p => !p.barcode || !p.barcode.trim()).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}