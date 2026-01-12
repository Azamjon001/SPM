import React, { useState, useEffect } from 'react';
import { CreditCard, Download, Filter, Search, ChevronDown, Calendar } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface PaymentHistoryItem {
  orderId: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  cardLastFour: string;
  cardType: string;
  amount: number;
  status: string;
  method: string;
  items: any[];
  createdAt: string;
}

interface Company {
  id: number;
  name: string;
}

export default function PaymentHistoryPanel() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6a74b22c/companies`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
        console.log('📊 Загружено компаний:', data.companies?.length || 0);
      }
    } catch (error) {
      console.error('Ошибка загрузки компаний:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async (companyId: number) => {
    try {
      setLoadingPayments(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6a74b22c/company-payments?limit=100&company_id=${companyId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
        console.log('📊 Загружено платежей для компании', companyId, ':', data.payments?.length || 0);
      }
    } catch (error) {
      console.error('Ошибка загрузки платежей:', error);
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleCompanySelect = (companyId: string) => {
    const id = parseInt(companyId);
    if (id > 0) {
      setSelectedCompanyId(id);
      loadPayments(id);
    } else {
      setSelectedCompanyId(null);
      setPayments([]);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.userPhone?.includes(searchTerm) ||
      payment.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.cardLastFour.includes(searchTerm);

    const matchesMethod = filterMethod === 'all' || payment.method === filterMethod;
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const getCardIcon = (cardType: string) => {
    switch (cardType) {
      case 'uzcard': return '🟦';
      case 'humo': return '🟩';
      case 'visa': return '💳';
      case 'mastercard': return '💳';
      case 'other': return '🎫'; // Для чеков/кодов
      default: return '💳';
    }
  };

  const getCardTypeName = (cardType: string) => {
    switch (cardType) {
      case 'uzcard': return 'UzCard';
      case 'humo': return 'Humo';
      case 'visa': return 'Visa';
      case 'mastercard': return 'MasterCard';
      case 'other': return 'Чек/Код';
      default: return cardType;
    }
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'checks_codes': return 'Чеки/Коды';
      case 'payme': return 'Payme';
      case 'click': return 'Click';
      case 'uzum': return 'Uzum';
      case 'cash': return 'Наличные';
      default: return method;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const exportToCSV = () => {
    const headers = ['Дата', 'ID Заказа', 'Пользователь', 'Телефон', 'Карта', 'Сумма', 'Метод', 'Статус'];
    const rows = filteredPayments.map(p => [
      formatDate(p.createdAt),
      p.orderId,
      p.userName || 'Гость',
      p.userPhone || '-',
      `•••• ${p.cardLastFour} (${getCardTypeName(p.cardType)})`,
      `${p.amount} сум`,
      getMethodName(p.method),
      p.status === 'paid' ? 'Оплачено' : p.status
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const paidCount = filteredPayments.filter(p => p.status === 'paid').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 mb-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8" />
              <h1 className="text-3xl">История платежей</h1>
            </div>
            {selectedCompanyId && filteredPayments.length > 0 && (
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
              >
                <Download className="w-5 h-5" />
                <span>Экспорт CSV</span>
              </button>
            )}
          </div>

          {/* Stats - показываем только если выбрана компания */}
          {selectedCompanyId ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="text-sm opacity-90 mb-1">Всего платежей</div>
                <div className="text-2xl font-bold">{filteredPayments.length}</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="text-sm opacity-90 mb-1">Успешных</div>
                <div className="text-2xl font-bold">{paidCount}</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="text-sm opacity-90 mb-1">Общая сумма</div>
                <div className="text-2xl font-bold">{totalAmount.toLocaleString()} сум</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-lg opacity-90">📊 Выберите компанию в фильтрах для просмотра статистики платежей</p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {selectedCompanyId && (
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по телефону, имени, номеру заказа или карте..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                />
              </div>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 border-2 rounded-xl transition ${
                showFilters 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 hover:border-purple-400'
              } ${!selectedCompanyId ? 'flex-1' : ''}`}
            >
              <Filter className="w-5 h-5" />
              <span>Фильтры</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="space-y-4 pt-4 border-t">
              {/* Выбор компании - ПЕРВЫЙ фильтр */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏢 Компания
                </label>
                {loading ? (
                  <div className="flex items-center justify-center py-3">
                    <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span className="text-sm text-gray-500">Загрузка...</span>
                  </div>
                ) : (
                  <select
                    value={selectedCompanyId || ''}
                    onChange={(e) => handleCompanySelect(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-base font-medium"
                  >
                    <option value="">-- Выберите компанию --</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Остальные фильтры - показываем только если компания выбрана */}
              {selectedCompanyId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Способ оплаты</label>
                    <select
                      value={filterMethod}
                      onChange={(e) => setFilterMethod(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                    >
                      <option value="all">Все способы</option>
                      <option value="checks_codes">Чеки/Коды</option>
                      <option value="payme">Payme</option>
                      <option value="click">Click</option>
                      <option value="uzum">Uzum</option>
                      <option value="cash">Наличные</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Статус</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                    >
                      <option value="all">Все статусы</option>
                      <option value="paid">Оплачено</option>
                      <option value="pending">Ожидание</option>
                      <option value="failed">Ошибка</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment List */}
        {selectedCompanyId && (
          <>
            {loadingPayments ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">Загрузка платежей...</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-500 mb-2">Платежей пока нет</p>
                <p className="text-gray-400">История платежей появится здесь после первой оплаты</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredPayments.map((payment) => (
                  <div key={payment.orderId} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="bg-gradient-to-br from-purple-500 to-pink-500 w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl">
                          {getCardIcon(payment.cardType)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-medium">{payment.userName || 'Гость'}</h3>
                            {payment.status === 'paid' && (
                              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                ✓ Оплачено
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.userPhone ? `+998 ${payment.userPhone}` : 'Телефон не указан'}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(payment.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right mb-4">
                      <div className="text-2xl font-bold text-purple-600 mb-1">
                        {payment.amount.toLocaleString()} сум
                      </div>
                      <div className="text-sm text-gray-500">
                        через {getMethodName(payment.method)}
                      </div>
                    </div>

                    {/* Список товаров */}
                    {payment.items && payment.items.length > 0 && (
                      <div className="mb-4 bg-gray-50 rounded-xl p-4">
                        <div className="text-sm font-medium text-gray-700 mb-3">
                          📦 Товары ({payment.items.length}):
                        </div>
                        <div className="space-y-2">
                          {payment.items.map((item: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">{index + 1}.</span>
                                <div>
                                  <div className="text-gray-700">{item.name || 'Товар'}</div>
                                  {item.barid && (
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      🏷️ {item.barid}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-gray-500">× {item.quantity || 1}</span>
                                <span className="font-medium text-gray-900">
                                  {((item.sellingPrice || item.selling_price || item.price || item.price) * (item.quantity || 1)).toLocaleString()} сум
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CreditCard className="w-4 h-4" />
                        <span>•••• {payment.cardLastFour}</span>
                        <span className="text-gray-400">({getCardTypeName(payment.cardType)})</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Товаров: {payment.items?.length || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}