import React, { useState, useEffect } from 'react';
import { TrendingUp, Package, DollarSign, ShoppingCart, Calendar, Download, Award } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AdvancedAnalyticsProps {
  companyId?: number;
}

export default function AdvancedAnalytics({ companyId }: AdvancedAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    averageOrderValue: 0
  });

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, companyId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Загружаем историю продаж
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6a74b22c/analytics/sales?range=${timeRange}${companyId ? `&company_id=${companyId}` : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Обрабатываем данные для графиков
        processSalesData(data.sales || []);
        processTopProducts(data.sales || []);
        processCategoryData(data.sales || []);
        calculateStats(data.sales || []);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processSalesData = (sales: any[]) => {
    // Группируем продажи по дням
    const grouped: { [key: string]: { revenue: number; profit: number; orders: number } } = {};
    
    sales.forEach(sale => {
      const date = new Date(sale.created_at).toLocaleDateString('ru-RU');
      
      if (!grouped[date]) {
        grouped[date] = { revenue: 0, profit: 0, orders: 0 };
      }
      
      const revenue = sale.total_amount || 0;
      const purchasePrice = (sale.items || []).reduce((sum: number, item: any) => 
        sum + (item.purchase_price || 0) * item.quantity, 0
      );
      const profit = revenue - purchasePrice;
      
      grouped[date].revenue += revenue;
      grouped[date].profit += profit;
      grouped[date].orders += 1;
    });

    const chartData = Object.entries(grouped)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        profit: data.profit,
        orders: data.orders
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); // Последние 30 дней

    setSalesData(chartData);
  };

  const processTopProducts = (sales: any[]) => {
    // Считаем продажи по товарам
    const products: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    
    sales.forEach(sale => {
      (sale.items || []).forEach((item: any) => {
        if (!products[item.product_id]) {
          products[item.product_id] = {
            name: item.name,
            quantity: 0,
            revenue: 0
          };
        }
        
        products[item.product_id].quantity += item.quantity;
        products[item.product_id].revenue += item.price * item.quantity;
      });
    });

    const top = Object.values(products)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    setTopProducts(top);
  };

  const processCategoryData = (sales: any[]) => {
    // Здесь можно добавить группировку по категориям
    // Пока используем заглушку
    const categories = [
      { name: 'Электроника', value: 0, color: '#3b82f6' },
      { name: 'Одежда', value: 0, color: '#10b981' },
      { name: 'Продукты', value: 0, color: '#f59e0b' },
      { name: 'Аксессуары', value: 0, color: '#8b5cf6' },
      { name: 'Другое', value: 0, color: '#6b7280' }
    ];

    setCategoryData(categories);
  };

  const calculateStats = (sales: any[]) => {
    let totalRevenue = 0;
    let totalProfit = 0;
    const totalOrders = sales.length;

    sales.forEach(sale => {
      const revenue = sale.total_amount || 0;
      const purchasePrice = (sale.items || []).reduce((sum: number, item: any) => 
        sum + (item.purchase_price || 0) * item.quantity, 0
      );
      
      totalRevenue += revenue;
      totalProfit += revenue - purchasePrice;
    });

    setStats({
      totalRevenue,
      totalProfit,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
    });
  };

  const exportToExcel = () => {
    // Формируем CSV данные
    const csv = [
      ['Дата', 'Выручка', 'Прибыль', 'Заказы'],
      ...salesData.map(row => [row.date, row.revenue, row.profit, row.orders])
    ].map(row => row.join(',')).join('\n');

    // Скачиваем файл
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_${timeRange}_${new Date().toISOString()}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">📊 Расширенная аналитика</h2>
        
        <div className="flex items-center gap-3">
          {/* Выбор периода */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="week">Неделя</option>
            <option value="month">Месяц</option>
            <option value="year">Год</option>
          </select>

          {/* Кнопка экспорта */}
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Экспорт Excel
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-sm opacity-90">Выручка</p>
          <p className="text-3xl font-bold mt-1">{stats.totalRevenue.toLocaleString()} ₸</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-sm opacity-90">Прибыль</p>
          <p className="text-3xl font-bold mt-1">{stats.totalProfit.toLocaleString()} ₸</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <ShoppingCart className="w-8 h-8 opacity-80" />
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-sm opacity-90">Заказы</p>
          <p className="text-3xl font-bold mt-1">{stats.totalOrders}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-8 h-8 opacity-80" />
            <DollarSign className="w-5 h-5" />
          </div>
          <p className="text-sm opacity-90">Средний чек</p>
          <p className="text-3xl font-bold mt-1">{Math.round(stats.averageOrderValue).toLocaleString()} ₸</p>
        </div>
      </div>

      {/* График продаж */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Динамика продаж</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Выручка" strokeWidth={2} />
            <Line type="monotone" dataKey="profit" stroke="#10b981" name="Прибыль" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ТОП товаров */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">ТОП-10 товаров по выручке</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topProducts}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#3b82f6" name="Выручка" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Продажи по категориям */}
      {categoryData.some(c => c.value > 0) && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Продажи по категориям</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
