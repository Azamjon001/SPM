import { CheckCircle, Clock, DollarSign, FileText, Receipt, Search, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { confirmOrderPayment, getCompanyRevenue, getCustomerOrders, searchOrderByCode } from '../utils/api';
import { formatUzbekistanFullDateTime } from '../utils/uzbekTime';

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
    color?: string; // 🎨 Выбранный цвет
  }>;
}

interface OrdersPanelProps {
  companyId: number;
}

export default function OrdersPanel({ companyId }: OrdersPanelProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderSearchCode, setOrderSearchCode] = useState('');
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [companyEarnings, setCompanyEarnings] = useState(0);
  // ⚡ НОВОЕ: Защита от множественных нажатий
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);

  useEffect(() => {
    loadOrders();
    loadRevenue();

    // 🔄 Auto-refresh every 30 seconds (вместо 10) - меньше нагрузка
    console.log('🔄 [Orders Panel] Setting up auto-refresh every 30 seconds');
    const intervalId = setInterval(() => {
      console.log('🔄 [Orders Panel] Auto-refreshing data...');
      loadOrders();
      loadRevenue();
    }, 30000); // 30 seconds вместо 10

    // Cleanup on unmount
    return () => {
      console.log('🛑 [Orders Panel] Stopping auto-refresh');
      clearInterval(intervalId);
    };
  }, [companyId]);

  const loadOrders = async () => {
    try {
      const ordersData = await getCustomerOrders(companyId);
      setOrders(ordersData);

      // 🔍 ДИАГНОСТИКА: Показываем статус всех заказов
      console.log('\n' + '='.repeat(80));
      console.log('📋 [Orders Panel] СТАТУС ЗАКАЗОВ:');
      console.log('='.repeat(80));
      console.log(`📦 Всего заказов: ${ordersData.length}`);

      const pending = ordersData.filter(o => o.status === 'pending').length;
      const paid = ordersData.filter(o => o.status === 'paid').length;
      const cancelled = ordersData.filter(o => o.status === 'cancelled').length;

      console.log(`⏳ Ожидают подтверждения: ${pending}`);
      console.log(`✅ Подтверждены: ${paid}`);
      console.log(`❌ Отменены: ${cancelled}`);

      if (pending > 0) {
        console.log('\n⚠️ ВНИМАНИЕ! Есть неподтвержденные заказы:');
        ordersData
          .filter(o => o.status === 'pending')
          .forEach((order, index) => {
            console.log(`\n  📦 Заказ ${index + 1}:`);
            console.log(`     Код: ${order.order_code}`);
            console.log(`     Сумма: ${order.total_amount} сум`);
            console.log(`     Клиент: ${order.user_name} (${order.user_phone})`);
            console.log(`     Товаров: ${order.items.length}`);
            console.log(`     ⚡ ДЕЙСТВИЕ: Нажмите "Подтвердить оплату" чтобы добавить в историю продаж!`);
          });
      }
      console.log('='.repeat(80) + '\n');
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Ошибка загрузки заказов');
    } finally {
      setLoading(false);
    }
  };

  const loadRevenue = async () => {
    try {
      const revenueData = await getCompanyRevenue(companyId);
      setTotalRevenue(revenueData.totalRevenue);
      setCompanyEarnings(revenueData.companyEarnings);
      console.log('💰 [Orders Panel] Revenue loaded:', revenueData);
    } catch (error) {
      console.error('Error loading revenue:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' сум';
  };

  const handleConfirmPayment = async (orderId: number) => {
    if (!confirm('Подтвердить получение оплаты за этот заказ?')) return;

    // ⚡ НОВОЕ: Защита от множественных нажатий
    setProcessingOrderId(orderId);

    try {
      await confirmOrderPayment(orderId);
      await loadOrders();
      await loadRevenue(); // ✅ Обновить выручку после подтверждения
      // Clear search if confirming the found order
      if (foundOrder && foundOrder.id === orderId) {
        setFoundOrder(null);
        setOrderSearchCode('');
      }
      alert('Оплата подтверждена! Товары обновлены.');
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Ошибка при подтверждении оплаты');
    } finally {
      // ⚡ НОВОЕ: Сбросить защиту после завершения
      setProcessingOrderId(null);
    }
  };

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
      alert('Заказ не найден');
      setFoundOrder(null);
    }
  };

  const getPendingOrders = () => {
    return orders.filter(order => order.status === 'pending');
  };

  const getConfirmedOrders = () => {
    return orders.filter(order => order.status === 'paid');
  };

  // ⚡ НОВОЕ: Получить отменённые заказы
  const getCancelledOrders = () => {
    return orders.filter(order => order.status === 'cancelled');
  };

  const getFilteredOrders = () => {
    switch (filterStatus) {
      case 'pending':
        return getPendingOrders();
      case 'confirmed':
        return getConfirmedOrders();
      case 'cancelled':
        return getCancelledOrders();
      default:
        return orders;
    }
  };

  const renderOrder = (order: Order) => (
    <div
      key={order.id}
      className={`rounded-lg p-6 border-2 ${order.status === 'cancelled'
          ? 'bg-red-50 border-red-200'
          : order.status === 'pending'
            ? 'bg-orange-50 border-orange-200'
            : 'bg-green-50 border-green-200'
        }`}
    >
      {/* Order Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3>Чек #{order.order_code || order.id}</h3>
            <span className={`px-3 py-1 rounded-full text-xs text-white ${order.status === 'cancelled'
                ? 'bg-red-600'
                : order.status === 'pending'
                  ? 'bg-orange-600'
                  : 'bg-green-600'
              }`}>
              {order.status === 'cancelled'
                ? 'ОТМЕНЁН'
                : order.status === 'pending'
                  ? 'Ожидает оплаты'
                  : 'Оплачено'}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4" />
              <span>{order.user_name || 'Гость'}</span>
            </div>
            {order.user_phone && (
              <div className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                📱 {order.user_phone}
              </div>
            )}
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatUzbekistanFullDateTime(order.order_date)}
            </div>
            {order.confirmed_date && (
              <div className="text-sm text-green-600 flex items-center gap-1 mt-1">
                <CheckCircle className="w-3 h-3" />
                Подтверждено: {formatUzbekistanFullDateTime(order.confirmed_date)}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl mb-2 ${order.status === 'cancelled'
              ? 'text-red-600'
              : order.status === 'pending'
                ? 'text-orange-600'
                : 'text-green-600'
            }`}>
            {formatPrice(order.total_amount)}
          </div>
          {order.status === 'pending' && (
            <button
              onClick={() => handleConfirmPayment(order.id)}
              disabled={processingOrderId === order.id}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${processingOrderId === order.id
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
                } text-white`}
            >
              <DollarSign className="w-5 h-5" />
              {processingOrderId === order.id ? 'Обработка...' : 'Оплата получена'}
            </button>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className={`border-t pt-4 ${order.status === 'cancelled'
          ? 'border-red-200'
          : order.status === 'pending'
            ? 'border-orange-200'
            : 'border-green-200'
        }`}>
        <div className="text-sm text-gray-600 mb-2">Товары в заказе:</div>
        <div className="space-y-2">
          {order.items.map((item: any, index: number) => (
            <div key={index} className="flex justify-between text-sm bg-white rounded p-3">
              <div>
                <span>{item.name}</span>
                <span className="text-gray-600 ml-2">× {item.quantity} шт.</span>
                {item.color && (
                  <span className="ml-2 text-xs text-purple-600">
                    🎨 ({item.color})
                  </span>
                )}
              </div>
              <div className="text-gray-700">
                {formatPrice(item.total)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Загрузка...</div>;
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <div className="text-gray-600">Всего заказов</div>
          </div>
          <div className="text-3xl text-blue-600">{orders.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <div className="text-gray-600">Ожидают оплаты</div>
          </div>
          <div className="text-3xl text-orange-600">{getPendingOrders().length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div className="text-gray-600">Оплачено</div>
          </div>
          <div className="text-3xl text-green-600">{getConfirmedOrders().length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
            <div className="text-gray-600">Общая выручка</div>
          </div>
          <div className="text-2xl text-purple-600">{formatPrice(totalRevenue)}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4">
          <FileText className="w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={orderSearchCode}
            onChange={(e) => setOrderSearchCode(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearchOrder();
              }
            }}
            className="w-full border border-gray-300 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Поиск заказа по коду..."
          />
          <button
            onClick={handleSearchOrder}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={() => setFilterStatus('all')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <Receipt className="w-5 h-5" />
            Все заказы ({orders.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${filterStatus === 'pending'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <Clock className="w-5 h-5" />
            Ожидают ({getPendingOrders().length})
          </button>
          <button
            onClick={() => setFilterStatus('confirmed')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${filterStatus === 'confirmed'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <CheckCircle className="w-5 h-5" />
            Оплачено ({getConfirmedOrders().length})
          </button>
          <button
            onClick={() => setFilterStatus('cancelled')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${filterStatus === 'cancelled'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <X className="w-5 h-5" />
            Отменённые ({getCancelledOrders().length})
          </button>
        </div>
      </div>

      {/* Found Order */}
      {foundOrder && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Receipt className="w-6 h-6 text-blue-600" />
            <h2 className="text-blue-600">Найденный заказ</h2>
            <button
              onClick={() => {
                setFoundOrder(null);
                setOrderSearchCode('');
              }}
              className="ml-auto text-gray-500 hover:text-gray-700"
            >
              ✕ Закрыть
            </button>
          </div>
          {renderOrder(foundOrder)}
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <Receipt className="w-6 h-6 text-gray-700" />
          <h2>
            {filterStatus === 'all' && 'Все заказы'}
            {filterStatus === 'pending' && 'Ожидающие оплаты'}
            {filterStatus === 'confirmed' && 'Оплаченные заказы'}
            {filterStatus === 'cancelled' && 'Отменённые заказы'}
          </h2>
        </div>

        {getFilteredOrders().length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Нет заказов</p>
          </div>
        ) : (
          <div className="space-y-4">
            {getFilteredOrders().map(renderOrder)}
          </div>
        )}
      </div>
    </div>
  );
}