import { useState, useEffect } from 'react';
import { TrendingUp, Package, Search, Users, CheckSquare, Square, ShoppingCart, Receipt, DollarSign, FileText, Clock, X } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { getProducts, toggleProductCustomerAvailability, bulkToggleCustomerAvailability, getCustomerOrders, confirmOrderPayment, getSalesHistory, searchOrderByCode } from '../utils/api';
import { getUzbekistanToday, toUzbekistanDate, formatUzbekistanFullDateTime } from '../utils/uzbekTime';
import { getCurrentLanguage, useTranslation, type Language } from '../utils/translations'; // 🌍 Локализация

interface Product {
  id: number;
  name: string;
  quantity: number;
  price: number;
  markup_percent?: number;
  available_for_customers?: boolean;
}

interface Order {
  id: number;
  order_code: string;
  user_name: string;
  user_phone: string;
  order_date: string;
  confirmed_date?: string;
  total_amount: number;
  status: string;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

interface SalesPanelProps {
  companyId: number;
}

export default function SalesPanel({ companyId }: SalesPanelProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ [key: number]: number }>({});
  const [selectedForSale, setSelectedForSale] = useState<Set<number>>(new Set());
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderSearchCode, setOrderSearchCode] = useState('');
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [showOrderReceipt, setShowOrderReceipt] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<Language>(getCurrentLanguage());
  const { t } = useTranslation();

  useEffect(() => {
    loadData();
    
    // 🔄 Auto-refresh every 10 seconds
    console.log('🔄 [Sales Panel] Setting up auto-refresh every 10 seconds');
    const intervalId = setInterval(() => {
      console.log('🔄 [Sales Panel] Auto-refreshing data...');
      loadData();
    }, 10000); // 10 seconds
    
    // Cleanup on unmount
    return () => {
      console.log('🛑 [Sales Panel] Stopping auto-refresh');
      clearInterval(intervalId);
    };
  }, [companyId]);

  const loadData = async () => {
    try {
      const [productsData, salesData, customerOrdersData] = await Promise.all([
        getProducts(companyId),
        getSalesHistory(companyId),
        getCustomerOrders(companyId)
      ]);
      setProducts(productsData.filter((p: Product) => p.quantity > 0));
      setSalesHistory(salesData);
      setCustomerOrders(customerOrdersData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' сум';
  };

  const getPriceWithMarkup = (product: Product) => {
    const markupPercent = product.markup_percent || 0;
    return product.price * (1 + markupPercent / 100);
  };

  const getTodaysSales = () => {
    const today = getUzbekistanToday();
    
    // Calculate company sales from sales_history
    const companySales = salesHistory
      .filter(sale => toUzbekistanDate(sale.sale_date)?.toDateString() === today)
      .reduce((sum, sale) => sum + sale.total_amount, 0);
    
    // Calculate customer orders from customer_orders
    const customerSales = customerOrders
      .filter(order => toUzbekistanDate(order.order_date)?.toDateString() === today)
      .reduce((sum, order) => sum + order.total_amount, 0);
    
    // Return total of both
    return companySales + customerSales;
  };

  const filteredProducts = products.filter(product => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    const name = product.name.toLowerCase();
    const price = product.price.toString();
    const quantity = product.quantity.toString();
    
    return name.includes(query) || price.includes(query) || quantity.includes(query);
  });

  const handleToggleCustomerAvailability = async (productId: number) => {
    try {
      const result = await toggleProductCustomerAvailability(productId);
      // Update local state
      setProducts(products.map(p => 
        p.id === productId 
          ? { ...p, available_for_customers: result.available_for_customers }
          : p
      ));
    } catch (error) {
      console.error('Error toggling customer availability:', error);
      alert('Ошибка при изменении статуса товара');
    }
  };

  // Toggle product selection for sale
  const toggleProductSelection = (productId: number) => {
    const newSelected = new Set(selectedForSale);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
      // Also remove from selectedItems
      const newItems = { ...selectedItems };
      delete newItems[productId];
      setSelectedItems(newItems);
    } else {
      newSelected.add(productId);
      // Auto-select full quantity
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedItems({ ...selectedItems, [productId]: product.quantity });
      }
    }
    setSelectedForSale(newSelected);
  };

  // Open sale modal with selected products
  const openSaleModal = () => {
    if (selectedForSale.size === 0) {
      alert('Выберите товары для выставления на продажу');
      return;
    }
    setShowSaleModal(true);
  };

  // Handle making products available for customers
  const handleConfirmMakeAvailable = async () => {
    try {
      console.log(`🚀 [Sales Panel] Making ${selectedForSale.size} products available for customers...`);
      const startTime = Date.now();
      
      // Toggle availability for all selected products
      const productIds = Array.from(selectedForSale);
      const result = await bulkToggleCustomerAvailability(productIds, true); // true = make available
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log(`✅ [Sales Panel] Completed in ${duration} seconds!`);

      // Reset
      setSelectedForSale(new Set());
      setShowSaleModal(false);
      
      // ✅ НОВАЯ СИСТЕМА: Данные обновлены в Supabase! Перезагружаем!
      console.log('🔄 [Sales Panel] Reloading data from Supabase...');
      await loadData();
      console.log('✅ [Sales Panel] Data reloaded!');

      alert(`✅ Успешно выставлено!\n\n${productIds.length} товаров доступны для покупателей\nВремя: ${duration} секунд`);
    } catch (error) {
      console.error('Error making products available:', error);
      alert('Ошибка при выставлении товаров');
    }
  };

  // Handle confirming customer payment
  const handleConfirmPayment = async (orderId: number) => {
    if (!confirm('Подтвердить получение оплаты за этот заказ?')) return;

    try {
      await confirmOrderPayment(orderId);
      await loadData();
      alert('Оплата подтверждена! Товары обновлены.');
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Ошибка при подтверждении оплаты');
    }
  };

  // Handle selecting all products
  const handleSelectAll = () => {
    if (products.length === 0) {
      return;
    }

    // Check if all products are already selected
    const allSelected = selectedForSale.size === products.length;

    if (allSelected) {
      // Deselect all
      setSelectedForSale(new Set());
      setSelectedItems({});
    } else {
      // Select all products
      const allProductIds = new Set(products.map(p => p.id));
      setSelectedForSale(allProductIds);

      // Auto-set full quantity for all products
      const allItems: { [key: number]: number } = {};
      products.forEach(product => {
        allItems[product.id] = product.quantity;
      });
      setSelectedItems(allItems);
    }
  };

  // Get pending customer orders
  const getPendingOrders = () => {
    return customerOrders.filter(order => order.status === 'pending');
  };

  // Search order by code
  const handleSearchOrder = async () => {
    if (!orderSearchCode.trim()) {
      setFoundOrder(null);
      return;
    }

    try {
      const order = await searchOrderByCode(orderSearchCode);
      setFoundOrder(order);
    } catch (error) {
      console.error('Error searching order:', error);
      alert('Ошибка при поиске заказа');
    }
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-5 h-5 text-blue-600" />
            <div className="text-gray-600">Товаров в наличии</div>
          </div>
          <div className="text-3xl text-blue-600">{products.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-green-600" />
            <div className="text-gray-600">Доступно покупателям</div>
          </div>
          <div className="text-3xl text-green-600">
            {products.filter(p => p.available_for_customers).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingCart className="w-5 h-5 text-purple-600" />
            <div className="text-gray-600">Выбрано товаров</div>
          </div>
          <div className="text-3xl text-purple-600">{selectedForSale.size}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={openSaleModal}
            disabled={selectedForSale.size === 0}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-5 h-5" />
            В продажу ({selectedForSale.size})
          </button>
          <button
            onClick={async () => {
              if (selectedForSale.size === 0) {
                alert('Выберите товары для снятия с продажи');
                return;
              }
              
              if (!confirm(`Убрать ${selectedForSale.size} товаров из панели покупателей?`)) {
                return;
              }
              
              try {
                console.log(`🚫 [Sales Panel] Removing ${selectedForSale.size} products from customer view...`);
                const startTime = Date.now();
                
                const productIds = Array.from(selectedForSale);
                await bulkToggleCustomerAvailability(productIds, false); // false = make unavailable
                
                const endTime = Date.now();
                const duration = ((endTime - startTime) / 1000).toFixed(2);
                
                console.log(`✅ [Sales Panel] Removed in ${duration} seconds!`);
                
                setSelectedForSale(new Set());
                
                // ✅ НОВАЯ СИСТЕМА: Данные обновлены в Supabase! Перезагружаем!
                console.log('🔄 [Sales Panel] Reloading data from Supabase...');
                await loadData();
                console.log('✅ [Sales Panel] Data reloaded!');
                
                alert(`✅ Успешно убрано!\n\n${productIds.length} товаров скрыты от покупателей\nВремя: ${duration} секунд`);
              } catch (error) {
                console.error('Error removing products from sale:', error);
                alert('Ошибка при снятии товаров с продажи');
              }
            }}
            disabled={selectedForSale.size === 0}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
            Убрать из продажи ({selectedForSale.size})
          </button>
          <button
            onClick={handleSelectAll}
            disabled={products.length === 0}
            className={`flex items-center gap-2 text-white px-6 py-3 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed ${
              selectedForSale.size === products.length && products.length > 0
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {selectedForSale.size === products.length && products.length > 0 ? (
              <>
                <CheckSquare className="w-5 h-5" />
                ✓ Отменить всё
              </>
            ) : (
              <>
                <Square className="w-5 h-5" />
                Выбрать всё
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4">
          <Search className="w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Поиск по названию..."
          />
          {searchQuery && (
            <div className="text-sm text-gray-600 whitespace-nowrap">
              Найдено: {filteredProducts.length}
            </div>
          )}
        </div>
      </div>

      {/* Found Order Receipt */}
      {foundOrder && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Receipt className="w-6 h-6 text-orange-600" />
            <h2 className="text-orange-600">Найденный заказ (Чек #{foundOrder.id})</h2>
          </div>
          <div className="space-y-4">
            <div key={foundOrder.id} className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
              {/* Order Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3>Чек #{foundOrder.order_code || foundOrder.id}</h3>
                    <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs">
                      Ожидает оплаты
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4" />
                      <span>{foundOrder.user_name || 'Гость'}</span>
                    </div>
                    {foundOrder.user_phone && (
                      <div className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                        📱 {foundOrder.user_phone}
                      </div>
                    )}
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatUzbekistanFullDateTime(foundOrder.order_date)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl text-orange-600 mb-2">
                    {formatPrice(foundOrder.total_amount)}
                  </div>
                  <button
                    onClick={() => handleConfirmPayment(foundOrder.id)}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <DollarSign className="w-5 h-5" />
                    Оплата получена
                  </button>
                </div>
              </div>

              {/* Order Items */}
              <div className="border-t border-orange-200 pt-4">
                <div className="text-sm text-gray-600 mb-2">Товары в заказе:</div>
                <div className="space-y-2">
                  {foundOrder.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm bg-white rounded p-3">
                      <div>
                        <span className="">{item.name}</span>
                        <span className="text-gray-600 ml-2">× {item.quantity} шт.</span>
                      </div>
                      <div className="text-gray-700">
                        {formatPrice(item.total)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>Нет товаров в наличии</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className={`bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 ${selectedForSale.has(product.id) ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-200/50' : 'hover:shadow-blue-100'}`}>
              {/* Product Image */}
              <div className="relative h-48 bg-gray-100">
                {/* Checkbox for selection */}
                <button
                  onClick={() => toggleProductSelection(product.id)}
                  className="absolute top-2 left-2 w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors z-10"
                >
                  {selectedForSale.has(product.id) ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1705495140141-d955bab1ebf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9kdWN0JTIwYm94JTIwcGFja2FnZXxlbnwxfHx8fDE3NjUzNDk0OTR8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="mb-2 line-clamp-2">{product.name}</h3>
                <div className="mb-3">
                  {product.markup_percent && product.markup_percent > 0 ? (
                    <>
                      <div className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</div>
                      <div className="text-blue-600 mb-1 text-lg">
                        {formatPrice(getPriceWithMarkup(product))} <span className="text-xs text-orange-600">+{product.markup_percent}%</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-blue-600 mb-1">{formatPrice(product.price)}</div>
                  )}
                  <div className="text-sm text-gray-600">
                    В наличии: <span className="font-medium">{product.quantity} шт.</span>
                  </div>
                </div>

                {/* Customer Availability Toggle */}
                <button
                  onClick={() => handleToggleCustomerAvailability(product.id)}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded transition-colors text-sm ${
                    product.available_for_customers
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  {product.available_for_customers ? 'Доступен покупателям' : 'Выставить для покупателей'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sale Confirmation Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-blue-600 text-white p-6">
              <h2 className="text-2xl">Выставить товары для покупателей</h2>
              <p className="text-blue-100 text-sm mt-1">Эти товары станут доступны в магазине для покупателей</p>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {Array.from(selectedForSale).map(productId => {
                  const product = products.find(p => p.id === productId);
                  if (!product) return null;

                  return (
                    <div key={productId} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="mb-1">{product.name}</h3>
                        <div className="text-sm text-gray-600">
                          {product.markup_percent && product.markup_percent > 0 ? (
                            <>
                              Цена: <span className="line-through text-gray-400">{formatPrice(product.price)}</span> → <span className="text-blue-600">{formatPrice(getPriceWithMarkup(product))}</span> <span className="text-orange-600">+{product.markup_percent}%</span> | В наличии: {product.quantity} шт.
                            </>
                          ) : (
                            <>
                              Цена: {formatPrice(product.price)} | В наличии: {product.quantity} шт.
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded text-sm ${
                          product.available_for_customers 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {product.available_for_customers ? 'Уже в продаже' : 'Будет выставлен'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                  <div className="flex-1">
                    <div className="">Товары будут доступны покупателям</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Покупатели смогут увидеть эти товары в магазине и оформить заказ
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-6 flex gap-4">
              <button
                onClick={() => setShowSaleModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmMakeAvailable}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                Выставить для покупателей
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}