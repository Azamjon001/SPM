import { CreditCard, Package, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getCompanyExpenses, getCustomerOrders, getFinancialStats, getProducts, getSalesHistory } from '../utils/api';
import AdvancedInsightsPanel from './AdvancedInsightsPanel'; // 🚀 НОВАЯ ПАНЕЛЬ АНАЛИТИКИ
import CompactPeriodSelector from './CompactPeriodSelector'; // 🆕 КОМПАКТНЫЙ СЕЛЕКТОР ПЕРИОДА
import ExpensesManager from './ExpensesManager';
import PaymentHistoryForCompany from './PaymentHistoryForCompany';

interface Product {
  id: number;
  name: string;
  quantity: number;
  price: number;
  available_for_customers?: boolean;
  markup_percent?: number;
  markup_amount?: number; // 💰 НОВОЕ: Сумма наценки в деньгах
  selling_price?: number; // 💰 НОВОЕ: Цена продажи с наценкой
}

interface AnalyticsPanelProps {
  companyId: number;
}

export default function AnalyticsPanel({ companyId }: AnalyticsPanelProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [ordersWithItems, setOrdersWithItems] = useState<any[]>([]); // 🆕 Заказы с items для аналитики
  const [loading, setLoading] = useState(true);
  const [companyEarnings, setCompanyEarnings] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0); // 💰 НОВОЕ: Общая выручка (вся сумма с наценкой)

  // ✅ НОВОЕ: Выручка "Оплачено" из истории платежей (касса + онлайн)
  const [paymentHistoryProfit, setPaymentHistoryProfit] = useState(0);

  // 📑 Вкладки
  const [activeTab, setActiveTab] = useState<'analytics' | 'payments'>('analytics');

  // 💰 Expenses state - НОВОЕ: хранить все затраты с датами
  const [allCustomExpenses, setAllCustomExpenses] = useState<any[]>([]); // Пользовательские затраты с датами
  const [employeeExpenses, setEmployeeExpenses] = useState(0);
  const [electricityExpenses, setElectricityExpenses] = useState(0);
  const [purchaseCosts, setPurchaseCosts] = useState(0);
  const [customExpenses, setCustomExpenses] = useState(0); // 💰 НОВОЕ: Пользовательские затраты (отфильтрованные)

  // 💰 НОВОЕ: Количество продаж из financial_stats
  const [salesCount, setSalesCount] = useState(0);

  // 🆕 ОТДЕЛЬНЫЕ ФИЛЬТРЫ ПО ПЕРИОДУ ДЛЯ КАЖДОЙ ПАНЕЛИ/ДИАГРАММЫ
  type PeriodType = 'day' | 'yesterday' | 'week' | 'month' | 'year' | 'all';

  const [financialTimePeriod, setFinancialTimePeriod] = useState<PeriodType>('all'); // Главный фильтр для всей аналитики

  // 🆕 ZOOM для линейной диаграммы
  const [chartZoom, setChartZoom] = useState(100); // 100% = нормальный размер

  useEffect(() => {
    loadData();
  }, [companyId]);

  // 🔄 НОВОЕ: Автообновление данных каждые 30 секунд для решения AFK проблемы
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 [Analytics Panel] Auto-refresh data (every 30s)');
      loadData();
    }, 30000); // 30 секунд

    return () => clearInterval(interval);
  }, [companyId]);

  const loadData = async () => {
    try {
      console.log('\n' + '='.repeat(80));
      console.log('📊 [Analytics Panel] НАЧАЛО ЗАГРУЗКИ ДАННЫХ');
      console.log('='.repeat(80));
      console.log('🏢 Company ID:', companyId);
      console.log('🕒 Время загрузки:', new Date().toLocaleString('uz-UZ'));

      const [
        productsData,
        salesData,
        ordersData,
        financialStatsData,
        expensesData,
        paymentsData
      ] = await Promise.all([
        getProducts(companyId),
        getSalesHistory(companyId),
        getCustomerOrders(companyId),
        getFinancialStats(companyId),
        getCompanyExpenses(companyId).catch(() => {
          return {
            expenses: {
              employee_expenses: 0,
              electricity_expenses: 0,
              purchase_costs: 0
            }
          };
        }),
        // ✅ НОВОЕ: Загружаем историю платежей для учета прибыли из касы
        fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8081/api'}/company-payments?company_id=${companyId}`
        )
          .then(res => res.json())
          .catch(() => ({ success: false, payments: [] }))
      ]);

      console.log('\n' + '='.repeat(80));
      console.log('📦 [Analytics Panel] ЗАГРУЖЕННЫЕ ДАННЫЕ:');
      console.log('='.repeat(80));
      console.log('📦 Товаров на складе:', productsData.length);
      console.log('📊 Продаж в истории:', salesData.length);
      console.log('📋 Заказов покупателей:', ordersData.length);
      console.log('💰 Финансовая статистика:', financialStatsData);
      console.log('💸 Данные расходов:', expensesData);
      console.log('💳 История платежей:', paymentsData.success ? paymentsData.payments.length : 0, 'платежей');

      // ✅ НОВОЕ: Рассчитываем общую ВЫРУЧКУ из истории платежей (для панели "Прибыль")
      const paymentsTotalRevenue = paymentsData.success && paymentsData.payments
        ? paymentsData.payments.filter((p: any) => p.status === 'paid').reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0)
        : 0;
      console.log('💰 Выручка "Оплачено" из истории платежей:', paymentsTotalRevenue.toLocaleString(), 'сум');

      if (salesData.length > 0) {
        console.log('\n🔍 [Analytics Panel] ДЕТАЛЬНЫЙ АНАЛИЗ ПРОДАЖ (онлайн режимы):');
        salesData.forEach((sale, index) => {
          console.log(`\n  📦 Продажа ${index + 1}:`, sale);
        });
      } else {
        console.log('\nℹ️ [Analytics Panel] sales_history пустая (это нормально для режима "Чеки/Коды")');
        console.log('   📊 Используются данные из customer_orders вместо sales_history');
      }

      console.log('\n' + '='.repeat(80));
      console.log('💰 [Analytics Panel] ФИНАНСОВЫЕ ПОКАЗАТЕЛИ ИЗ customer_orders:');
      console.log('='.repeat(80));
      console.log('💰 Общая выручка (вся сумма с наценкой):', financialStatsData.totalRevenue, 'сум');
      console.log('💵 Прибыль от наценок:', financialStatsData.totalMarkupProfit, 'сум');
      console.log('📊 Количество продаж:', financialStatsData.salesCount);

      // 🔍 ДЕТАЛЬНАЯ ПРОВЕРКА КАЖДОГО ЗАКАЗА
      if (financialStatsData.orders && financialStatsData.orders.length > 0) {
        console.log('\n🔍 [Analytics Panel] ПРОВЕРКА КАЖДОГО ЗАКАЗА:');
        financialStatsData.orders.forEach((order: any, idx: number) => {
          const totalAmount = parseFloat(order.total_amount) || 0;
          const markupProfit = parseFloat(order.markup_profit) || 0;

          console.log(`\n  ${idx + 1}. Заказ #${order.order_code}:`);
          console.log(`     - total_amount: ${totalAmount.toLocaleString()} сум`);
          console.log(`     - markup_profit: ${markupProfit.toLocaleString()} сум`);
          console.log(`     - status: ${order.status}`);

          if (order.items && Array.isArray(order.items)) {
            let calculatedTotal = 0;
            console.log(`     📦 Товары (${order.items.length} шт):`);

            order.items.forEach((item: any) => {
              const basePrice = item.price || 0;
              const priceWithMarkup = item.price_with_markup || 0;
              const markupAmount = item.markup_amount || 0;
              const quantity = item.quantity || 0;

              // Вычисляем selling_price
              const sellingPrice = priceWithMarkup > 0 ? priceWithMarkup : (basePrice + markupAmount);
              const itemTotal = sellingPrice * quantity;
              calculatedTotal += itemTotal;

              console.log(`        - ${item.name}: base=${basePrice}, selling=${sellingPrice.toFixed(0)}, qty=${quantity}, total=${itemTotal.toFixed(0)}`);
            });

            console.log(`     ✅ Пересчитанный total: ${calculatedTotal.toLocaleString()} сум`);
            console.log(`     ${calculatedTotal === totalAmount ? '✅ СОВПАДАЕТ' : '❌ НЕ СОВПАДАЕТ!'} с сохраненным: ${totalAmount.toLocaleString()} сум`);

            if (Math.abs(calculatedTotal - totalAmount) > 1) {
              console.error(`     ⚠️⚠️⚠️ ПРОБЛЕМА! Разница: ${(totalAmount - calculatedTotal).toLocaleString()} сум`);
              console.error(`     📋 Этот заказ был создан до исправлений. Откройте /FIX_INSTRUCTIONS.md`);
            }
          }
        });
      }

      console.log('='.repeat(80) + '\n');

      setProducts(productsData);
      setSalesHistory(salesData);
      setCustomerOrders(ordersData);
      setOrdersWithItems(financialStatsData.orders || []); // 🆕 Заказы с items для аналитики
      setTotalRevenue(financialStatsData.totalRevenue);
      setCompanyEarnings(financialStatsData.totalMarkupProfit);
      setSalesCount(financialStatsData.salesCount);
      setEmployeeExpenses(expensesData.expenses?.employee_expenses || 0);
      setElectricityExpenses(expensesData.expenses?.electricity_expenses || 0);
      setPurchaseCosts(expensesData.expenses?.purchase_costs || 0);
      setCustomExpenses(expensesData.expenses?.custom_expenses || 0); // 💰 НОВОЕ: Пользовательские затраты
      setAllCustomExpenses(expensesData.expenses?.all_custom_expenses || []); // 💰 НОВОЕ: Все пользовательские затраты с датами
      setPaymentHistoryProfit(paymentsTotalRevenue); // ✅ НОВОЕ: Выручка "Оплачено" из истории платежей

      console.log('✅ [Analytics Panel] Данные успешно загружены и установлены в state');
      console.log('🔍 [Analytics Panel] ordersWithItems установлено:', financialStatsData.orders?.length || 0, 'заказов');
      console.log('🔍 [Analytics Panel] Первый заказ:', financialStatsData.orders?.[0]);
      console.log('💰 [Analytics Panel] Затраты установлены:');
      console.log('   👥 Зарплата:', expensesData.expenses?.employee_expenses || 0);
      console.log('   ⚡ Электричество:', expensesData.expenses?.electricity_expenses || 0);
      console.log('   🛒 Закупки:', expensesData.expenses?.purchase_costs || 0);
      console.log('   🛍️ Пользовательские затраты (всего):', expensesData.expenses?.custom_expenses || 0);
      console.log('   📊 Пользовательских затрат с датами:', expensesData.expenses?.all_custom_expenses?.length || 0);
    } catch (error) {
      console.error('❌❌❌ [Analytics Panel] КРИТИЧЕСКАЯ ОШИБКА:', error);
      alert('Ошибка загрузки данных анлитики');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' сум';
  };

  // 🔢 Короткий формат чисел (для великих сум)
  const formatShortPrice = (price: number) => {
    if (price >= 1_000_000_000) {
      return `${(price / 1_000_000_000).toFixed(1)} млрд`;
    } else if (price >= 1_000_000) {
      return `${(price / 1_000_000).toFixed(1)} млн`;
    } else if (price >= 1_000) {
      return `${(price / 1_000).toFixed(1)} тыс`;
    }
    return price.toString();
  };

  // 🆕 ФИЛЬТРАЦИЯ ЗАКАЗОВ ПО ПЕРИОДУ (с параметром периода)
  const getFilteredOrders = (period: PeriodType = 'all') => {
    console.log('\n🔍 [getFilteredOrders] НАЧАЛО ФИЛЬТРАЦИИ:');
    console.log('   📅 Период:', period);
    console.log('   📦 Всего заказов:', ordersWithItems.length);

    // 🔍 ДИАГНОСТИКА: Показать структуру первого заказа
    if (ordersWithItems.length > 0) {
      console.log('   🔬 СТРУКТУРА ПЕРВОГО ЗАКАЗА:', ordersWithItems[0]);
      console.log('   🔬 Все ключи заказа:', Object.keys(ordersWithItems[0]));
    }

    if (period === 'all') {
      console.log('   ✅ Возвращаем все заказы (период: all)');
      return ordersWithItems;
    }

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (period === 'day') {
      // Сегодня с 00:00:00
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'yesterday') {
      // Вчера с 00:00:00 до 23:59:59
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(now.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    console.log('   📅 Диапазон дат:');
    console.log('      От:', startDate.toLocaleString('ru-RU'));
    console.log('      До:', endDate.toLocaleString('ru-RU'));

    const filtered = ordersWithItems.filter(order => {
      // 🔍 Используем ПРАВИЛЬНОЕ поле даты:
      // - confirmed_date - для чековых заказов (когда компания подтвердила)
      // - Для виртуальных заказов это тоже confirmed_date (когда система подтвердила оплату)
      const dateStr = order.confirmed_date || order.order_date || order.created_at || order.createdAt;

      if (!dateStr) {
        console.log('      ⚠️ Заказ #' + order.order_code + ' - НЕТ ДАТЫ!');
        return false;
      }

      console.log('      🔬 Заказ #' + order.order_code + ' dateStr:', dateStr);

      const orderDate = new Date(dateStr);

      // Проверка на Invalid Date
      if (isNaN(orderDate.getTime())) {
        console.log('      ⚠️ Заказ #' + order.order_code + ' - НЕКОРРЕКТНАЯ ДАТА:', dateStr);
        return false;
      }

      const isInRange = orderDate >= startDate && orderDate <= endDate;

      if (!isInRange) {
        console.log('      ❌ Заказ #' + order.order_code + ' (' + orderDate.toLocaleString('ru-RU') + ') - вне периода');
      } else {
        console.log('      ✅ Заказ #' + order.order_code + ' (' + orderDate.toLocaleString('ru-RU') + ') - в периоде');
      }

      return isInRange;
    });

    console.log('   📊 Результат фильтрации:', filtered.length, 'заказов');

    return filtered;
  };

  // 🆕 НОВОЕ: Получить заказы за ПРЕДЫДУЩИЙ период для сравнения
  const getPreviousPeriodOrders = (period: PeriodType = 'all') => {
    console.log('\n🔍 [getPreviousPeriodOrders] ФИЛЬТРАЦИЯ ПРЕДЫДУЩЕГО ПЕРИОДА:');
    console.log('   📅 Период:', period);

    if (period === 'all') {
      console.log('   ⚠️ Для "Все время" нет предыдущего периода');
      return [];
    }

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (period === 'day') {
      // Предыдущий период = ВЧЕРА
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(now.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'yesterday') {
      // Предыдущий период = ПОЗАВЧЕРА
      startDate.setDate(now.getDate() - 2);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(now.getDate() - 2);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      // Предыдущий период = 2 недели назад до недели назад
      startDate.setDate(now.getDate() - 14);
      endDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      // Предыдущий период = 2 месяца назад до месяца назад
      startDate.setMonth(now.getMonth() - 2);
      endDate.setMonth(now.getMonth() - 1);
    } else if (period === 'year') {
      // Предыдущий период = 2 года назад до года назад
      startDate.setFullYear(now.getFullYear() - 2);
      endDate.setFullYear(now.getFullYear() - 1);
    }

    console.log('   📅 Предыдущий период:');
    console.log('      От:', startDate.toLocaleString('ru-RU'));
    console.log('      До:', endDate.toLocaleString('ru-RU'));

    const filtered = ordersWithItems.filter(order => {
      const dateStr = order.confirmed_date || order.order_date || order.created_at || order.createdAt;

      if (!dateStr) {
        return false;
      }

      const orderDate = new Date(dateStr);

      if (isNaN(orderDate.getTime())) {
        return false;
      }

      return orderDate >= startDate && orderDate <= endDate;
    });

    console.log('   📊 Заказов в предыдущем периоде:', filtered.length);

    return filtered;
  };

  // 💰 Ра��чет общего баланса компании
  // ФОРМУЛА: Выручка от продаж (это просто выручка)
  const getTotalBalance = (period: PeriodType = 'all') => {
    // ✅ ИСПРАВЛЕНО: Используем ОТФИЛЬТРОВАННЫЕ заказы для расчета выручки
    const filteredOrders = getFilteredOrders(period);

    // Рассчитываем выручку из отфильтрованных заказов
    const filteredRevenue = filteredOrders.reduce((sum, order) => {
      return sum + (parseFloat(order.total_amount) || 0);
    }, 0);

    console.log('💰 [Total Balance]:');
    console.log('   📅 Период:', financialTimePeriod);
    console.log('   📦 Отфильтровано заказов:', filteredOrders.length);
    console.log('   💰 Выручка за период:', filteredRevenue.toLocaleString(), 'сум');

    return filteredRevenue; // ✅ Возвращаем выручку за ВЫБРАННЫЙ период
  };

  // 💸 НОВОЕ: Расчет ЗАТРАТ компании (показывается как МИНУС) с фильтрацией по периоду
  const getTotalCompanyExpenses = () => {
    // Стоимость всех товаров на складе (замороженные деньги) - ВСЕГДА показывается
    const inventoryCost = products.reduce((sum, product) => {
      return sum + (product.price * product.quantity);
    }, 0);

    // 💰 ПРОПОРЦИОНАЛЬНЫЙ РАСЧЕТ ЗАТРАТ ПО ПЕРИОДУ
    let periodMultiplier = 1; // Коэффициент для пропорционального расчета

    if (financialTimePeriod === 'day' || financialTimePeriod === 'yesterday') {
      // За день = 1/30 от месячной суммы
      periodMultiplier = 1 / 30;
    } else if (financialTimePeriod === 'week') {
      // За неделю = 7/30 от месячной суммы
      periodMultiplier = 7 / 30;
    } else if (financialTimePeriod === 'month') {
      // З мсяц = полная сумма
      periodMultiplier = 1;
    } else if (financialTimePeriod === 'year') {
      // За год = 12 месяцев
      periodMultiplier = 12;
    } else if (financialTimePeriod === 'custom') {
      // Для кастомного периода рассчитываем количество дней
      if (financialStartDate && financialEndDate) {
        const start = new Date(financialStartDate);
        const end = new Date(financialEndDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        periodMultiplier = days / 30; // Пропорция от месяца
      }
    } else if (financialTimePeriod === 'all') {
      // Для "Все время" - показываем полные суммы без умножения
      periodMultiplier = 1;
    }

    // Применяем коэффициент к фиксированным затратам
    const proportionalEmployeeExpenses = employeeExpenses * periodMultiplier;
    const proportionalElectricityExpenses = electricityExpenses * periodMultiplier;
    const proportionalPurchaseCosts = purchaseCosts * periodMultiplier;

    // 💰 ФИЛЬТРАЦИЯ ПОЛЬЗОВАТЕЛЬСКИХ ЗАТРАТ ПО ПЕРИОДУ
    let filteredCustomExpenses = 0;

    if (financialTimePeriod === 'all') {
      // Если выбран "Все время", берем все затраты
      filteredCustomExpenses = customExpenses;
    } else {
      // Фильтруем по периоду
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();

      if (financialTimePeriod === 'day') {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (financialTimePeriod === 'yesterday') {
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(now.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
      } else if (financialTimePeriod === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (financialTimePeriod === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (financialTimePeriod === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
      } else if (financialTimePeriod === 'custom') {
        if (financialStartDate && financialEndDate) {
          startDate = new Date(financialStartDate);
          endDate = new Date(financialEndDate);
          endDate.setHours(23, 59, 59, 999);
        }
      }

      // Фильтруем затраты по дате
      filteredCustomExpenses = allCustomExpenses
        .filter(expense => {
          const expenseDate = new Date(expense.expense_date);
          return expenseDate >= startDate && expenseDate <= endDate;
        })
        .reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);

      console.log('💸 [Filtered Custom Expenses]:');
      console.log('   📅 Период:', financialTimePeriod);
      console.log('   💰 Отфильтровано затрат:', filteredCustomExpenses);
      console.log('   📊 Всего затрат:', customExpenses);
    }

    // ✅ ИСПРАВЛЕНО: Все расходы БЕЗ товаров на складе (только реальные затраты)
    const totalExpenses = inventoryCost + proportionalEmployeeExpenses + proportionalElectricityExpenses + proportionalPurchaseCosts + filteredCustomExpenses;

    console.log('💸 [Company Expenses]:');
    console.log('   📅 Период:', financialTimePeriod);
    console.log('   📊 Коэффициент периода:', periodMultiplier);
    console.log('   📦 Товары на складе (price × quantity):', inventoryCost);
    console.log('   👥 Зарплата работникам (пропорционально):', proportionalEmployeeExpenses, `(${employeeExpenses} × ${periodMultiplier})`);
    console.log('   ⚡ Электричество (пропорционально):', proportionalElectricityExpenses, `(${electricityExpenses} × ${periodMultiplier})`);
    console.log('   🛒 Закупки (пропорционально):', proportionalPurchaseCosts, `(${purchaseCosts} × ${periodMultiplier})`);
    console.log('   🛍️ Пользовательские затраты (отфильтровано):', filteredCustomExpenses);
    console.log('   💸 ВСЕГО ЗАТРАТ:', totalExpenses);

    return totalExpenses;
  };

  // 💸 НОВОЕ: Расчет ТОЛЬКО РЕАЛЬНЫХ ЗАТРАТ (БЕЗ товаров на складе) для круговой диаграммы
  const getRealExpensesOnly = () => {
    // 💰 ПРОПОРЦИОНАЛЬНЫЙ РАСЧЕТ ЗАТРАТ ПО ПЕРИОДУ
    let periodMultiplier = 1;

    if (financialTimePeriod === 'day' || financialTimePeriod === 'yesterday') {
      periodMultiplier = 1 / 30;
    } else if (financialTimePeriod === 'week') {
      periodMultiplier = 7 / 30;
    } else if (financialTimePeriod === 'month') {
      periodMultiplier = 1;
    } else if (financialTimePeriod === 'year') {
      periodMultiplier = 12;
    } else if (financialTimePeriod === 'custom') {
      if (financialStartDate && financialEndDate) {
        const start = new Date(financialStartDate);
        const end = new Date(financialEndDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        periodMultiplier = days / 30;
      }
    } else if (financialTimePeriod === 'all') {
      periodMultiplier = 1;
    }

    const proportionalEmployeeExpenses = employeeExpenses * periodMultiplier;
    const proportionalElectricityExpenses = electricityExpenses * periodMultiplier;
    const proportionalPurchaseCosts = purchaseCosts * periodMultiplier;
    const filteredCustom = getFilteredCustomExpenses();

    // БЕЗ товаров на складе - только реальные расходы
    return proportionalEmployeeExpenses + proportionalElectricityExpenses + proportionalPurchaseCosts + filteredCustom;
  };

  // 💎 НОВОЕ: Итоговый баланс компании
  const getFinalBalance = (period: PeriodType = 'all') => {
    const balance = getTotalBalance(period);
    const expenses = getTotalCompanyExpenses(period);
    const final = balance - expenses;

    console.log('💎 [Final Balance]:');
    console.log('   📅 Период:', period);
    console.log('   💰 Общий баланс (выручка):', balance);
    console.log('   💸 Затраты компании:', expenses);
    console.log('   💎 ИТОГОВЫЙ БАЛАНС:', final);
    console.log('   📐 Формула:', `${balance} - ${expenses} = ${final}`);

    return final;
  };

  // 💳 НОВОЕ: Разбивка виртуальных платежей по методам (demo/real)
  const getVirtualPaymentsByMethod = () => {
    const filteredOrders = getFilteredOrders(financialTimePeriod);

    let demoPayments = 0;
    let realPayments = 0;

    filteredOrders.forEach(order => {
      const amount = parseFloat(order.total_amount) || 0;
      const method = order.payment_method || 'checks_codes';

      if (method === 'demo_online') {
        demoPayments += amount;
      } else if (method === 'real_online') {
        realPayments += amount;
      }
    });

    console.log('💳 [Virtual Payments]:');
    console.log('   💳 Демо оплата:', demoPayments);
    console.log('   💳 Реальная оплата:', realPayments);

    return { demoPayments, realPayments };
  };

  // 💰 НОВОЕ: Получить пропорциональные затраты для диаграмм
  const getProportionalExpenses = () => {
    // 💰 ПРОПОРЦИОНАЛЬНЫЙ РАСЧЕТ ЗАТРАТ ПО ПЕРИОДУ
    let periodMultiplier = 1;

    if (financialTimePeriod === 'day' || financialTimePeriod === 'yesterday') {
      periodMultiplier = 1 / 30;
    } else if (financialTimePeriod === 'week') {
      periodMultiplier = 7 / 30;
    } else if (financialTimePeriod === 'month') {
      periodMultiplier = 1;
    } else if (financialTimePeriod === 'year') {
      periodMultiplier = 12;
    } else if (financialTimePeriod === 'custom') {
      if (financialStartDate && financialEndDate) {
        const start = new Date(financialStartDate);
        const end = new Date(financialEndDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        periodMultiplier = days / 30;
      }
    } else if (financialTimePeriod === 'all') {
      periodMultiplier = 1;
    }

    return {
      employeeExpenses: employeeExpenses * periodMultiplier,
      electricityExpenses: electricityExpenses * periodMultiplier,
      purchaseCosts: purchaseCosts * periodMultiplier,
    };
  };

  // 💰 НОВОЕ: Получить отфильтрованные пользовательские затраты
  const getFilteredCustomExpenses = () => {
    if (financialTimePeriod === 'all') {
      return customExpenses;
    }

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (financialTimePeriod === 'day') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (financialTimePeriod === 'yesterday') {
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(now.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (financialTimePeriod === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (financialTimePeriod === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (financialTimePeriod === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else if (financialTimePeriod === 'custom') {
      if (financialStartDate && financialEndDate) {
        startDate = new Date(financialStartDate);
        endDate = new Date(financialEndDate);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    return allCustomExpenses
      .filter(expense => {
        const expenseDate = new Date(expense.expense_date);
        return expenseDate >= startDate && expenseDate <= endDate;
      })
      .reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
  };

  // 🆕 НОВОЕ: Получить РЕАЛЬНЫЕ данные для линейной диаграммы (БЕЗ случайности)
  const getRealLineChartData = () => {
    const currentOrders = getFilteredOrders(financialTimePeriod);
    const previousOrders = getPreviousPeriodOrders(financialTimePeriod);

    // Функция группировки заказов по временным интервалам
    const groupOrdersByTime = (orders: any[], intervalType: string, intervalsCount: number) => {
      const grouped: number[] = new Array(intervalsCount).fill(0);

      orders.forEach(order => {
        const dateStr = order.confirmed_date || order.order_date || order.created_at || order.createdAt;
        if (!dateStr) return;

        const orderDate = new Date(dateStr);
        if (isNaN(orderDate.getTime())) return;

        const amount = parseFloat(order.total_amount) || 0;

        if (intervalType === 'hour') {
          const hour = orderDate.getHours();
          grouped[hour] += amount;
        } else if (intervalType === 'day') {
          const day = orderDate.getDay(); // 0-6 (Воскресенье-Суббота)
          const dayIndex = day === 0 ? 6 : day - 1; // Конвертируем в Пн=0, Вс=6
          if (dayIndex >= 0 && dayIndex < intervalsCount) {
            grouped[dayIndex] += amount;
          }
        } else if (intervalType === 'week') {
          // Для недель - определяем номер недели в месяце
          const dayOfMonth = orderDate.getDate();
          const weekIndex = Math.min(Math.floor((dayOfMonth - 1) / 7), intervalsCount - 1);
          grouped[weekIndex] += amount;
        } else if (intervalType === 'month') {
          const month = orderDate.getMonth(); // 0-11
          if (month >= 0 && month < intervalsCount) {
            grouped[month] += amount;
          }
        } else if (intervalType === 'dayNumber') {
          // Для пользовательского периода - по дням
          if (financialStartDate) {
            const startDate = new Date(financialStartDate);
            const daysDiff = Math.floor((orderDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff >= 0 && daysDiff < intervalsCount) {
              grouped[daysDiff] += amount;
            }
          }
        } else if (intervalType === 'weekNumber') {
          // Для пользовательского периода - по неделям
          if (financialStartDate) {
            const startDate = new Date(financialStartDate);
            const daysDiff = Math.floor((orderDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const weekIndex = Math.min(Math.floor(daysDiff / 7), intervalsCount - 1);
            if (weekIndex >= 0) {
              grouped[weekIndex] += amount;
            }
          }
        } else if (intervalType === 'monthNumber') {
          // Для пользовательского периода - по месяцам
          if (financialStartDate) {
            const startDate = new Date(financialStartDate);
            const daysDiff = Math.floor((orderDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const monthIndex = Math.min(Math.floor(daysDiff / 30), intervalsCount - 1);
            if (monthIndex >= 0) {
              grouped[monthIndex] += amount;
            }
          }
        }
      });

      return grouped;
    };

    let dataPoints: any[] = [];

    if (financialTimePeriod === 'day' || financialTimePeriod === 'yesterday') {
      // ⏰ ДЕНЬ = 24 ЧАСА (РЕАЛЬНЫЕ ДАННЫЕ)
      const currentData = groupOrdersByTime(currentOrders, 'hour', 24);
      const previousData = groupOrdersByTime(previousOrders, 'hour', 24);

      for (let hour = 0; hour < 24; hour++) {
        dataPoints.push({
          period: `${hour}:00`,
          current: currentData[hour],
          previous: previousData[hour],
        });
      }
    } else if (financialTimePeriod === 'week') {
      // 📅 НЕДЕЛЯ = 7 ДНЕЙ (РЕАЛЬНЫЕ ДАННЫЕ)
      const currentData = groupOrdersByTime(currentOrders, 'day', 7);
      const previousData = groupOrdersByTime(previousOrders, 'day', 7);
      const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

      for (let day = 0; day < 7; day++) {
        dataPoints.push({
          period: days[day],
          current: currentData[day],
          previous: previousData[day],
        });
      }
    } else if (financialTimePeriod === 'month') {
      // 📆 МЕСЯЦ = 4 НЕДЕЛИ (РЕАЛЬНЫЕ ДАННЫЕ)
      const currentData = groupOrdersByTime(currentOrders, 'week', 4);
      const previousData = groupOrdersByTime(previousOrders, 'week', 4);

      for (let week = 1; week <= 4; week++) {
        dataPoints.push({
          period: `Нед ${week}`,
          current: currentData[week - 1],
          previous: previousData[week - 1],
        });
      }
    } else if (financialTimePeriod === 'year') {
      // 📅 ГОД = 12 МЕСЯЦЕВ (РЕАЛЬНЫЕ ДАННЫЕ)
      const currentData = groupOrdersByTime(currentOrders, 'month', 12);
      const previousData = groupOrdersByTime(previousOrders, 'month', 12);
      const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

      for (let month = 0; month < 12; month++) {
        dataPoints.push({
          period: months[month],
          current: currentData[month],
          previous: previousData[month],
        });
      }
    } else if (financialTimePeriod === 'custom') {
      // 🎯 СВОЙ ПЕРИОД (РЕАЛЬНЫЕ ДАННЫЕ)
      if (financialStartDate && financialEndDate) {
        const start = new Date(financialStartDate);
        const end = new Date(financialEndDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (days <= 1) {
          // 1 день = 24 часа
          const currentData = groupOrdersByTime(currentOrders, 'hour', 24);
          const previousData = groupOrdersByTime(previousOrders, 'hour', 24);

          for (let hour = 0; hour < 24; hour++) {
            dataPoints.push({
              period: `${hour}:00`,
              current: currentData[hour],
              previous: previousData[hour],
            });
          }
        } else if (days <= 7) {
          // До 7 дней = по дням
          const currentData = groupOrdersByTime(currentOrders, 'dayNumber', days);
          const previousData = groupOrdersByTime(previousOrders, 'dayNumber', days);

          for (let day = 1; day <= days; day++) {
            dataPoints.push({
              period: `День ${day}`,
              current: currentData[day - 1],
              previous: previousData[day - 1],
            });
          }
        } else if (days <= 31) {
          // До 31 дня = по неделям
          const weeks = Math.ceil(days / 7);
          const currentData = groupOrdersByTime(currentOrders, 'weekNumber', weeks);
          const previousData = groupOrdersByTime(previousOrders, 'weekNumber', weeks);

          for (let week = 1; week <= weeks; week++) {
            dataPoints.push({
              period: `Нед ${week}`,
              current: currentData[week - 1],
              previous: previousData[week - 1],
            });
          }
        } else {
          // Больше 31 дня = по месяцам
          const months = Math.ceil(days / 30);
          const currentData = groupOrdersByTime(currentOrders, 'monthNumber', months);
          const previousData = groupOrdersByTime(previousOrders, 'monthNumber', months);

          for (let month = 1; month <= months; month++) {
            dataPoints.push({
              period: `Мес ${month}`,
              current: currentData[month - 1],
              previous: previousData[month - 1],
            });
          }
        }
      }
    }

    console.log('📊 [Real Line Chart Data]:');
    console.log('   📅 Период:', financialTimePeriod);
    console.log('   📈 Точек данных:', dataPoints.length);
    console.log('   ✅ РЕАЛЬНЫЕ ДАННЫЕ (без случайности)');

    return dataPoints;
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка аналитики...</div>;
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
      {/* 📑 Вкладки */}
      <div className="bg-white rounded-lg shadow-sm mb-6 p-2 flex gap-2">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition ${activeTab === 'analytics'
            ? 'bg-blue-600 text-white shadow'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span>Финансы и аналитика</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition ${activeTab === 'payments'
            ? 'bg-blue-600 text-white shadow'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          <CreditCard className="w-5 h-5" />
          <span>История платежей</span>
        </button>
      </div>

      {/* 💳 ВКЛАДКА: История плтежей */}
      {activeTab === 'payments' && (
        <PaymentHistoryForCompany />
      )}

      {/* 📊 ВКЛАДКА: Аналитика */}
      {activeTab === 'analytics' && (
        <>
          {/* Expenses Manager */}
          <ExpensesManager
            companyId={companyId}
            employeeExpenses={employeeExpenses}
            electricityExpenses={electricityExpenses}
            purchaseCosts={purchaseCosts}
            onUpdate={(expenses) => {
              setEmployeeExpenses(expenses.employee_expenses);
              setElectricityExpenses(expenses.electricity_expenses);
              setPurchaseCosts(expenses.purchase_costs);
            }}
            onCustomExpensesUpdate={(totalCustomExpenses) => {
              setCustomExpenses(totalCustomExpenses);
            }}
          />


          {/* 🆕 СЕЛЕКТОР ПЕРИОДА ДЛЯ ВСЕЙ АНАЛИТИКИ */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6 max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-1">📅 Период анализа</h4>
                <p className="text-sm text-gray-600">Выберите период для отображения данных аналитики</p>
              </div>
              <CompactPeriodSelector
                value={financialTimePeriod}
                onChange={setFinancialTimePeriod}
              />
            </div>
          </div>

          {/* ========== 3 ПАНЕЛИ ========== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-7xl mx-auto mb-6">
            {/* 1️⃣ Общий баланс (Выручка) */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-5 text-white">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-6 h-6" />
                <div className="text-green-100 text-base">Прибыль</div>
              </div>
              <div className="text-3xl font-bold mb-1">
                {formatPrice(getTotalBalance(financialTimePeriod))}
              </div>
              <div className="text-green-100 text-xs">
                Выручка от продаж
              </div>
            </div>

            {/* 2️⃣ Затраты компании (МИНУС) */}
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-5 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-6 h-6" />
                <div className="text-red-100 text-base">Затраты компании</div>
              </div>
              <div className="text-3xl font-bold">
                -{formatPrice(getTotalCompanyExpenses(financialTimePeriod))}
              </div>
            </div>

            {/* 3️⃣ Итоговый баланс */}
            <div className={`bg-gradient-to-br ${getFinalBalance(financialTimePeriod) >= 0
              ? 'from-cyan-500 to-cyan-600'
              : 'from-rose-500 to-rose-600'
              } rounded-lg shadow-lg p-5 text-white`}>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-6 h-6" />
                <div className={`${getFinalBalance(financialTimePeriod) >= 0
                  ? 'text-cyan-100'
                  : 'text-rose-100'
                  } text-base`}>Итоговый баланс</div>
              </div>
              <div className="text-3xl font-bold mb-1">
                {formatPrice(getFinalBalance(financialTimePeriod))}
              </div>
              <div className={`${getFinalBalance(financialTimePeriod) >= 0
                ? 'text-cyan-100'
                : 'text-rose-100'
                } text-xs`}>
                {formatPrice(getTotalBalance(financialTimePeriod))} + (-{formatPrice(getTotalCompanyExpenses(financialTimePeriod))})
              </div>
            </div>
          </div>

          {/* 📊 ДИАГРАММЫ ПРИБЫЛИ И ЗАТРАТ */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6" key={`profit-expenses-${financialTimePeriod}`}>
            <h3 className="text-xl font-bold text-gray-800 mb-6">Диаграммы</h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 1️⃣ Круговая диаграмма - ТОЛЬКО ЗАТРАТЫ КОМПАНИИ */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">💸 Затраты компании</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={(() => {
                        const proportional = getProportionalExpenses();
                        const filteredCustom = getFilteredCustomExpenses();

                        // ✅ ТОЛЬКО РЕАЛЬНЫЕ ЗАТРАТЫ (БЕЗ товаров на складе)
                        const expenseCategories = [
                          { name: '👥 Зарплата', value: proportional.employeeExpenses, color: '#8b5cf6' },
                          { name: '⚡ Электричество', value: proportional.electricityExpenses, color: '#eab308' },
                          { name: '🛒 Закупки', value: proportional.purchaseCosts, color: '#06b6d4' },
                          { name: '🛍️ Другие затраты', value: filteredCustom, color: '#ec4899' },
                        ];

                        // Фильтруем категории со значением > 0
                        return expenseCategories.filter(cat => cat.value > 0);
                      })()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(() => {
                        const proportional = getProportionalExpenses();
                        const filteredCustom = getFilteredCustomExpenses();

                        const expenseCategories = [
                          { name: '👥 Зарплата', value: proportional.employeeExpenses, color: '#8b5cf6' },
                          { name: '⚡ Электричество', value: proportional.electricityExpenses, color: '#eab308' },
                          { name: '🛒 Закупки', value: proportional.purchaseCosts, color: '#06b6d4' },
                          { name: '🛍️ Другие затраты', value: filteredCustom, color: '#ec4899' },
                        ];

                        return expenseCategories.filter(cat => cat.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ));
                      })()}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatPrice(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 2️⃣ Столбчатая диаграмма - Прибыль, Затраты, Итоговый баланс */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">📊 Сравнение</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={(() => {
                      const data = [
                        {
                          category: 'Прибыль',
                          value: getTotalBalance(financialTimePeriod),
                          fill: '#10b981' // Зеленый
                        },
                        {
                          category: 'Затраты',
                          value: getTotalCompanyExpenses(financialTimePeriod),
                          fill: '#ef4444' // Красный
                        },
                        {
                          category: 'Итог',
                          value: Math.abs(getFinalBalance(financialTimePeriod)), // Берем модуль для корректного отображения
                          fill: getFinalBalance(financialTimePeriod) >= 0 ? '#06b6d4' : '#f97316' // Голубой если плюс, оранжевый если минус
                        },
                      ];

                      return data;
                    })()}
                    margin={{ top: 7, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis
                      tickFormatter={(value) => formatShortPrice(value)}
                      width={80}
                      tick={{ fontSize: 20 }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => {
                        // Для "Итог" показываем знак
                        if (props.payload.category === 'Итог') {
                          return getFinalBalance(financialTimePeriod) >= 0
                            ? `+${formatPrice(value)}`
                            : `-${formatPrice(value)}`;
                        }
                        return formatPrice(value);
                      }}
                    />
                    <Bar dataKey="value">
                      {(() => {
                        const data = [
                          { fill: '#10b981' },
                          { fill: '#ef4444' },
                          { fill: getFinalBalance(financialTimePeriod) >= 0 ? '#06b6d4' : '#f97316' },
                        ];
                        return data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ));
                      })()}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 3️⃣ Линейная диаграмма - Детальная динамика за период */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-700">
                      📈 Динамика роста
                    </h4>
                    {financialTimePeriod !== 'all' && (
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Используйте кнопки +/− для масштабирования, скролл для навигации
                      </p>
                    )}
                  </div>
                  {/* 🔍 ZOOM кнопки */}
                  {financialTimePeriod !== 'all' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setChartZoom(Math.max(50, chartZoom - 10))}
                        className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium"
                        title="Уменьшить"
                      >
                        −
                      </button>
                      <span className="text-sm text-gray-600 min-w-[50px] text-center">
                        {chartZoom}%
                      </span>
                      <button
                        onClick={() => setChartZoom(Math.min(300, chartZoom + 10))}
                        className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium"
                        title="Увеличить"
                      >
                        +
                      </button>
                      <button
                        onClick={() => setChartZoom(100)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium ml-2"
                        title="Сбросить"
                      >
                        100%
                      </button>
                    </div>
                  )}
                </div>
                {financialTimePeriod === 'all' ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    Выберите конкретный период для аналитики
                  </div>
                ) : (
                  <div
                    className="overflow-auto"
                    style={{
                      maxHeight: '400px',
                      cursor: 'grab',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  >
                    {/* 🎯 Збільшуємо розмір графіка БЕЗ scale - тільки width/height */}
                    <ResponsiveContainer
                      width={Math.max(600, 600 * (chartZoom / 100))}
                      height={300}
                    >
                      <LineChart
                        data={getRealLineChartData()}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 12 }}
                          angle={financialTimePeriod === 'day' || financialTimePeriod === 'yesterday' ? -45 : 0}
                          textAnchor={financialTimePeriod === 'day' || financialTimePeriod === 'yesterday' ? 'end' : 'middle'}
                          height={financialTimePeriod === 'day' || financialTimePeriod === 'yesterday' ? 80 : 30}
                        />
                        <YAxis tickFormatter={(value) => formatShortPrice(value)} />
                        <Tooltip formatter={(value: number) => formatPrice(value)} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="current"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ fill: '#10b981', r: 4 }}
                          name={
                            financialTimePeriod === 'day' ? 'Сегодня' :
                              financialTimePeriod === 'yesterday' ? 'Вчера' :
                                financialTimePeriod === 'week' ? 'Эта неделя' :
                                  financialTimePeriod === 'month' ? 'Этот месяц' :
                                    financialTimePeriod === 'year' ? 'Этот год' :
                                      'Текущий период'
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="previous"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', r: 4 }}
                          name={
                            financialTimePeriod === 'day' ? 'Вчера' :
                              financialTimePeriod === 'yesterday' ? 'Позавчера' :
                                financialTimePeriod === 'week' ? 'Неделя назад' :
                                  financialTimePeriod === 'month' ? 'Месяц назад' :
                                    financialTimePeriod === 'year' ? 'Год назад' :
                                      'Предыдущий период'
                          }
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>



          <AdvancedInsightsPanel
            products={products}
            customerOrders={getFilteredOrders(financialTimePeriod)} // 🆕 Заказы с items для аналитики (отфильтрованные)
          />
        </>
      )}
    </div>
  );
}