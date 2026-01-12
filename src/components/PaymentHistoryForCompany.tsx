import React, { useState, useEffect } from 'react';
import { Search, Calendar, Filter, CreditCard, CheckCircle, AlertCircle, X, ChevronDown, TrendingUp } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface PaymentHistoryItem {
  orderId: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  cardLastFour: string; // Всегда будет "••••" для компании
  cardType: string;
  amount: number;
  markupProfit?: number; // ✅ НОВОЕ: Прибыль от наценки
  status: string;
  method: string;
  items: Array<{
    id: number;
    name: string;
    price: number;
    selling_price?: number; // ✅ НОВОЕ: Цена с наценкой
    quantity: number;
    color?: string;
  }>;
  createdAt: string;
}

export default function PaymentHistoryForCompany() {
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');
  const [filterMethod, setFilterMethod] = useState<'all' | 'payme' | 'click' | 'uzum'>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // 🆕 ФИЛЬТР ПО ПЕРИОДУ ВРЕМЕНИ
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month' | 'year' | 'custom' | 'all'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    loadPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchQuery, filterStatus, filterMethod, timePeriod, customStartDate, customEndDate]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      
      // 🔒 Получаем платежи БЕЗ последних 4 цифр карты
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6a74b22c/company-payments?limit=1000`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('📊 [COMPANY] Загружено платежей:', data.payments?.length || 0);
        setPayments(data.payments || []);
      } else {
        const errorText = await response.text();
        console.error('❌ [COMPANY] Ошибка загрузки платежей:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ [COMPANY] Ошибка при загрузке платежей:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.orderId.toLowerCase().includes(query) ||
        p.userName?.toLowerCase().includes(query) ||
        p.userPhone?.includes(query) ||
        p.items.some(item => item.name.toLowerCase().includes(query))
      );
    }

    // Фильтр по статусу
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    // Фильтр по методу оплаты
    if (filterMethod !== 'all') {
      filtered = filtered.filter(p => p.method === filterMethod);
    }

    // 🆕 ФИЛЬТР ПО ПЕРИОДУ ВРЕМЕНИ
    if (timePeriod !== 'all') {
      const now = new Date();
      const startDate = new Date();
      const endDate = new Date();

      if (timePeriod === 'day') {
        // Сегодня с 00:00:00
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (timePeriod === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (timePeriod === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (timePeriod === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
      } else if (timePeriod === 'custom') {
        if (customStartDate && customEndDate) {
          startDate.setTime(new Date(customStartDate).getTime());
          endDate.setTime(new Date(customEndDate).getTime());
          endDate.setHours(23, 59, 59, 999);
        }
      }

      filtered = filtered.filter(p => {
        const paymentDate = new Date(p.createdAt);
        return paymentDate >= startDate && paymentDate <= endDate;
      });
    }

    setFilteredPayments(filtered);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
            <CheckCircle className="w-4 h-4" />
            Оплачено
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
            <AlertCircle className="w-4 h-4" />
            В обработке
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-sm">
            <X className="w-4 h-4" />
            Ошибка
          </span>
        );
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">{status}</span>;
    }
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'payme': return 'Payme';
      case 'click': return 'Click';
      case 'uzum': return 'Uzum';
      default: return method;
    }
  };

  const getCardTypeIcon = (cardType: string) => {
    switch (cardType?.toLowerCase()) {
      case 'uzcard': return '💳';
      case 'humo': return '💳';
      case 'visa': return '💳';
      case 'mastercard': return '💳';
      default: return '💳';
    }
  };

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = filteredPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalProfit = filteredPayments.reduce((sum, p) => sum + (p.markupProfit || 0), 0); // ✅ НОВОЕ: Общий прибыль

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Загрузка платежей...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. Всего платежей */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-blue-100 text-sm font-medium mb-1">Всего платежей</p>
              <p className="text-3xl font-bold">{filteredPayments.length}</p>
            </div>
            
          </div>
        </div>

        {/* 2. Оплачено */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-green-100 text-sm font-medium mb-1">Оплачено</p>
              <p className="text-3xl font-bold">{formatPrice(paidAmount)}</p>
              <p className="text-green-100 text-xs mt-1">сум</p>
            </div>
          </div>
        </div>
      </div>

      {/* Поиск и фильтры */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Поиск */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Поиск по заказу, клиенту, товар..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Кнопка фильтров */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <Filter className="w-5 h-5" />
            Фильтры
          </button>
        </div>

        {/* Развёрнутые фильтры */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm mb-2">Статус</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все</option>
                <option value="paid">Оплачено</option>
                <option value="pending">В обработке</option>
                <option value="failed">Ошибка</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2">Метод оплаты</label>
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все</option>
                <option value="payme">Payme</option>
                <option value="click">Click</option>
                <option value="uzum">Uzum</option>
              </select>
            </div>

            {/* 🆕 ФИЛЬТР ПО ПЕРИОДУ ВРЕМЕНИ */}
            <div>
              <label className="block text-sm mb-2">Период времени</label>
              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все</option>
                <option value="day">Последний день</option>
                <option value="week">Последняя неделя</option>
                <option value="month">Последний месяц</option>
                <option value="year">Последний год</option>
                <option value="custom">Пользовательский</option>
              </select>
            </div>

            {timePeriod === 'custom' && (
              <div className="flex flex-col md:flex-row gap-4">
                <div>
                  <label className="block text-sm mb-2">Начальная дата</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Конечная дата</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Список платежей */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Платежи не найдены</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-500">Дата</th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-500">Клиент</th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-500">Товары</th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-500">🔒 Карта</th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-500">Сумма</th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-500">Прибыль</th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-500">Метод</th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-500">Статус</th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-500">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.orderId} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div>{payment.userName || 'Гость'}</div>
                        <div className="text-gray-500">+998 {payment.userPhone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm max-w-xs">
                        {payment.items.length > 0 ? (
                          <div className="space-y-1">
                            {payment.items.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="text-gray-700">
                                {item.name} <span className="text-gray-500">×{item.quantity}</span>
                              </div>
                            ))}
                            {payment.items.length > 2 && (
                              <div className="text-gray-500 text-xs">
                                + ещё {payment.items.length - 2} товаров
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Нет товаров</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{getCardTypeIcon(payment.cardType)}</span>
                        <span className="text-gray-400 text-sm">••• •••</span>
                        <span className="text-xs text-gray-400">🔒 Скрыто</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-green-600 font-medium">{formatPrice(payment.amount)} сум</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-amber-600 font-medium">{formatPrice(payment.markupProfit || 0)} сум</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getMethodName(payment.method)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedPayment(payment)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Детали
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модальное окно с деталями */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl">Детали платежа</h3>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">ID заказа</p>
                <p className="font-mono text-sm">{selectedPayment.orderId}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Дата и время</p>
                <p>{formatDate(selectedPayment.createdAt)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Клиент</p>
                <p>{selectedPayment.userName || 'Гость'}</p>
                <p className="text-sm text-gray-500">+998 {selectedPayment.userPhone}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">🔒 Карта (данные скрыты)</p>
                <div className="flex items-center gap-2 mt-1">
                  <span>{getCardTypeIcon(selectedPayment.cardType)}</span>
                  <span className="text-gray-400">•••• ••••</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {selectedPayment.cardType?.toUpperCase() || 'Неизвестно'}
                  </span>
                  <span className="text-xs text-gray-500">🔒 Защищено</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Метод оплаты</p>
                <p>{getMethodName(selectedPayment.method)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Статус</p>
                <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Товары</p>
                <div className="space-y-2">
                  {selectedPayment.items.map((item, index) => {
                    // ✅ ИСПРАВЛЕНО: Используем selling_price (цена с наценкой) вместо price
                    const itemPrice = item.selling_price || item.price;
                    return (
                      <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p>{item.name}</p>
                          {item.color && (
                            <p className="text-sm text-gray-500">Цвет: {item.color}</p>
                          )}
                          <p className="text-sm text-gray-500">Количество: {item.quantity}</p>
                        </div>
                        <p className="text-green-600">{formatPrice(selectedPayment.amount)} сум</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between items-center text-lg">
                  <span>Итого:</span>
                  <span className="text-green-600">{formatPrice(selectedPayment.amount)} сум</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span>Прибыль:</span>
                  <span className="text-amber-600 font-semibold">{formatPrice(selectedPayment.markupProfit || 0)} сум</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}