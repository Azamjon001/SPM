import { useState, useEffect } from 'react';
import { Users, Zap, Receipt, Edit2, Save, X, TrendingDown, Plus, Trash2, Minus, DollarSign } from 'lucide-react';
import { updateCompanyExpenses } from '../utils/api';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CustomExpense {
  id: number;
  company_id: number;
  expense_name: string;
  amount: number;
  description: string | null;
  expense_date: string;
  created_at: string;
}

interface ExpensesManagerProps {
  companyId: number;
  employeeExpenses: number;
  electricityExpenses: number;
  purchaseCosts: number;
  onUpdate: (expenses: {
    employee_expenses: number;
    electricity_expenses: number;
    purchase_costs: number;
  }) => void;
  onCustomExpensesUpdate?: (totalCustomExpenses: number) => void;
}

export default function ExpensesManager({
  companyId,
  employeeExpenses,
  electricityExpenses,
  purchaseCosts,
  onUpdate,
  onCustomExpensesUpdate
}: ExpensesManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Custom expenses state
  const [customExpenses, setCustomExpenses] = useState<CustomExpense[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpenseForm, setNewExpenseForm] = useState({
    expense_name: '',
    amount: '',
    description: ''
  });
  
  // Operation types for each expense (including custom ones)
  const [operationType, setOperationType] = useState<{
    employee: 'add' | 'subtract';
    electricity: 'add' | 'subtract';
    [key: string]: 'add' | 'subtract'; // For custom expenses
  }>({
    employee: 'add',
    electricity: 'add'
  });
  
  // Form data for each expense
  const [formData, setFormData] = useState<{
    employee: string;
    electricity: string;
    [key: string]: string; // For custom expenses
  }>({
    employee: '',
    electricity: ''
  });

  useEffect(() => {
    loadCustomExpenses();
  }, [companyId]);

  useEffect(() => {
    // Обновляем родительский компонент когда меняются пользовательские затраты
    if (onCustomExpensesUpdate) {
      const total = customExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      onCustomExpensesUpdate(total);
    }
  }, [customExpenses, onCustomExpensesUpdate]);

  const loadCustomExpenses = async () => {
    try {
      setLoadingCustom(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6a74b22c/custom-expenses/${companyId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCustomExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки пользовательских затрат:', error);
    } finally {
      setLoadingCustom(false);
    }
  };

  const handleAddCustomExpense = async () => {
    try {
      if (!newExpenseForm.expense_name.trim() || !newExpenseForm.amount) {
        alert('Заполните название и сумму затраты');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6a74b22c/custom-expenses`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            company_id: companyId,
            expense_name: newExpenseForm.expense_name,
            amount: parseFloat(newExpenseForm.amount),
            description: newExpenseForm.description || null
          })
        }
      );

      if (response.ok) {
        setNewExpenseForm({ expense_name: '', amount: '', description: '' });
        setShowAddForm(false);
        await loadCustomExpenses();
        alert('Затр��та успешно добавлена!');
      } else {
        alert('Ошибка при добавлении затраты');
      }
    } catch (error) {
      console.error('Ошибка добавления затраты:', error);
      alert('Ошибка при добавлении затраты');
    }
  };

  const handleDeleteCustomExpense = async (id: number) => {
    if (!confirm('Удалить эту затрату?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6a74b22c/custom-expenses/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        await loadCustomExpenses();
        alert('Затрата удалена!');
      } else {
        alert('Ошибка при удалении затраты');
      }
    } catch (error) {
      console.error('Ошибка удаления затраты:', error);
      alert('Ошибка при удалении затраты');
    }
  };

  const handleUpdateCustomExpense = async (expenseId: number) => {
    try {
      const customKey = `custom_${expenseId}`;
      const changeAmount = parseInt(formData[customKey]) || 0;
      if (changeAmount === 0) return;

      const currentExpense = customExpenses.find(e => e.id === expenseId);
      if (!currentExpense) return;

      const newAmount = operationType[customKey] === 'add' 
        ? currentExpense.amount + changeAmount 
        : currentExpense.amount - changeAmount;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6a74b22c/custom-expenses/${expenseId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: newAmount
          })
        }
      );

      if (response.ok) {
        await loadCustomExpenses();
      } else {
        throw new Error('Failed to update custom expense');
      }
    } catch (error) {
      console.error('Error updating custom expense:', error);
      throw error;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' сум';
  };

  const handleEdit = () => {
    // Reset form data
    const newFormData: any = {
      employee: '',
      electricity: ''
    };
    customExpenses.forEach(exp => {
      newFormData[`custom_${exp.id}`] = '';
    });
    setFormData(newFormData);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    const newFormData: any = {
      employee: '',
      electricity: ''
    };
    customExpenses.forEach(exp => {
      newFormData[`custom_${exp.id}`] = '';
    });
    setFormData(newFormData);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update employee and electricity expenses
      const employeeAdd = parseInt(formData.employee) || 0;
      const electricityAdd = parseInt(formData.electricity) || 0;

      const newEmployeeExpenses = operationType.employee === 'add' ? employeeExpenses + employeeAdd : employeeExpenses - employeeAdd;
      const newElectricityExpenses = operationType.electricity === 'add' ? electricityExpenses + electricityAdd : electricityExpenses - electricityAdd;

      await updateCompanyExpenses(companyId, {
        employee_expenses: newEmployeeExpenses,
        electricity_expenses: newElectricityExpenses,
        purchase_costs: purchaseCosts
      });

      onUpdate({
        employee_expenses: newEmployeeExpenses,
        electricity_expenses: newElectricityExpenses,
        purchase_costs: purchaseCosts
      });

      // Update all custom expenses
      for (const expense of customExpenses) {
        await handleUpdateCustomExpense(expense.id);
      }

      setIsEditing(false);
      alert('Затраты успешно обновлены!');
    } catch (error) {
      console.error('❌ Error updating expenses:', error);
      alert('Ошибка обновления затрат: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const totalCustomExpenses = customExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalExpenses = employeeExpenses + electricityExpenses + totalCustomExpenses;

  // Generate colors for custom expense cards
  const cardColors = [
    { from: 'from-blue-50', via: 'via-blue-100', to: 'to-blue-50', border: 'border-blue-200', hoverBorder: 'hover:border-blue-300', bg: 'from-blue-600', bgEnd: 'to-blue-700', text: 'text-blue-900', textLight: 'text-blue-700', borderColor: 'border-blue-200', hoverBg: 'hover:bg-blue-50', hoverBorderColor: 'hover:border-blue-300', ring: 'focus:ring-blue-500/20', focusBorder: 'focus:border-blue-500' },
    { from: 'from-green-50', via: 'via-green-100', to: 'to-green-50', border: 'border-green-200', hoverBorder: 'hover:border-green-300', bg: 'from-green-600', bgEnd: 'to-green-700', text: 'text-green-900', textLight: 'text-green-700', borderColor: 'border-green-200', hoverBg: 'hover:bg-green-50', hoverBorderColor: 'hover:border-green-300', ring: 'focus:ring-green-500/20', focusBorder: 'focus:border-green-500' },
    { from: 'from-orange-50', via: 'via-orange-100', to: 'to-orange-50', border: 'border-orange-200', hoverBorder: 'hover:border-orange-300', bg: 'from-orange-600', bgEnd: 'to-orange-700', text: 'text-orange-900', textLight: 'text-orange-700', borderColor: 'border-orange-200', hoverBg: 'hover:bg-orange-50', hoverBorderColor: 'hover:border-orange-300', ring: 'focus:ring-orange-500/20', focusBorder: 'focus:border-orange-500' },
    { from: 'from-pink-50', via: 'via-pink-100', to: 'to-pink-50', border: 'border-pink-200', hoverBorder: 'hover:border-pink-300', bg: 'from-pink-600', bgEnd: 'to-pink-700', text: 'text-pink-900', textLight: 'text-pink-700', borderColor: 'border-pink-200', hoverBg: 'hover:bg-pink-50', hoverBorderColor: 'hover:border-pink-300', ring: 'focus:ring-pink-500/20', focusBorder: 'focus:border-pink-500' },
    { from: 'from-indigo-50', via: 'via-indigo-100', to: 'to-indigo-50', border: 'border-indigo-200', hoverBorder: 'hover:border-indigo-300', bg: 'from-indigo-600', bgEnd: 'to-indigo-700', text: 'text-indigo-900', textLight: 'text-indigo-700', borderColor: 'border-indigo-200', hoverBg: 'hover:bg-indigo-50', hoverBorderColor: 'hover:border-indigo-300', ring: 'focus:ring-indigo-500/20', focusBorder: 'focus:border-indigo-500' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingDown className="w-6 h-6 text-red-600" />
          <div>
            <h2 className="text-xl font-bold">Затраты компании</h2>
            <p className="text-sm text-gray-600">
              Общие затраты: <strong className="text-red-600">{formatPrice(totalExpenses)}</strong>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить затрату
              </button>
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Редактировать
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Отмена
              </button>
            </>
          )}
        </div>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="mb-6 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" />
            Новая затрата
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Название затраты</label>
              <input
                type="text"
                value={newExpenseForm.expense_name}
                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, expense_name: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                placeholder="Например: Аренда офиса"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Сумма (сум)</label>
              <input
                type="number"
                value={newExpenseForm.amount}
                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание (опционально)</label>
              <input
                type="text"
                value={newExpenseForm.description}
                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                placeholder="Дополнительная информация"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddCustomExpense}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              Сохранить затрату
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewExpenseForm({ expense_name: '', amount: '', description: '' });
              }}
              className="flex items-center gap-2 bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              <X className="w-4 h-4" />
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Expense Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Зарплаты работников */}
        <div className="group bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50 border-2 border-purple-200 rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-purple-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-3 rounded-xl shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-lg font-semibold text-purple-900">Зарплаты работников</div>
          </div>
          
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setOperationType({ ...operationType, employee: 'add' })}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    operationType.employee === 'add'
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg scale-105'
                      : 'bg-white text-gray-700 border-2 border-purple-200 hover:bg-purple-50 hover:border-purple-300 hover:scale-105'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-semibold">Затрата</span>
                </button>
                <button
                  onClick={() => setOperationType({ ...operationType, employee: 'subtract' })}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    operationType.employee === 'subtract'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg scale-105'
                      : 'bg-white text-gray-700 border-2 border-purple-200 hover:bg-purple-50 hover:border-purple-300 hover:scale-105'
                  }`}
                >
                  <Minus className="w-4 h-4" />
                  <span className="text-sm font-semibold">Возврат</span>
                </button>
              </div>
              
              <input
                type="number"
                value={formData.employee}
                onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl text-lg font-semibold bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                placeholder="Введите сумму"
              />
              
              <div className={`text-sm font-medium px-3 py-2 rounded-lg ${
                operationType.employee === 'add' ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'
              }`}>
                {operationType.employee === 'add' 
                  ? `➕ Добавится: ${formatPrice(employeeExpenses)} → ${formatPrice(employeeExpenses + (parseInt(formData.employee) || 0))}`
                  : `➖ Уменьшится: ${formatPrice(employeeExpenses)} → ${formatPrice(employeeExpenses - (parseInt(formData.employee) || 0))}`
                }
              </div>
            </div>
          ) : (
            <div className="text-3xl font-bold text-purple-900 mb-1">{formatPrice(employeeExpenses)}</div>
          )}
          <div className="text-sm font-medium text-purple-700 mt-3">Всего выплачено сотрудникам</div>
        </div>

        {/* 2. Электричество */}
        <div className="group bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-yellow-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 p-3 rounded-xl shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="text-lg font-semibold text-yellow-900">Электричество</div>
          </div>
          
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setOperationType({ ...operationType, electricity: 'add' })}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    operationType.electricity === 'add'
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg scale-105'
                      : 'bg-white text-gray-700 border-2 border-yellow-200 hover:bg-yellow-50 hover:border-yellow-300 hover:scale-105'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-semibold">Затрата</span>
                </button>
                <button
                  onClick={() => setOperationType({ ...operationType, electricity: 'subtract' })}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    operationType.electricity === 'subtract'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg scale-105'
                      : 'bg-white text-gray-700 border-2 border-yellow-200 hover:bg-yellow-50 hover:border-yellow-300 hover:scale-105'
                  }`}
                >
                  <Minus className="w-4 h-4" />
                  <span className="text-sm font-semibold">Возврат</span>
                </button>
              </div>
              
              <input
                type="number"
                value={formData.electricity}
                onChange={(e) => setFormData({ ...formData, electricity: e.target.value })}
                className="w-full px-4 py-3 border-2 border-yellow-300 rounded-xl text-lg font-semibold bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
                placeholder="Введите сумму"
              />
              
              <div className={`text-sm font-medium px-3 py-2 rounded-lg ${
                operationType.electricity === 'add' ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'
              }`}>
                {operationType.electricity === 'add' 
                  ? `➕ Добавится: ${formatPrice(electricityExpenses)} → ${formatPrice(electricityExpenses + (parseInt(formData.electricity) || 0))}`
                  : `➖ Уменьшится: ${formatPrice(electricityExpenses)} → ${formatPrice(electricityExpenses - (parseInt(formData.electricity) || 0))}`
                }
              </div>
            </div>
          ) : (
            <div className="text-3xl font-bold text-yellow-900 mb-1">{formatPrice(electricityExpenses)}</div>
          )}
          <div className="text-sm font-medium text-yellow-700 mt-3">Оплата за электроэнергию</div>
        </div>

        {/* 3. Custom Expenses - каждая как отдельная панель */}
        {loadingCustom ? (
          <div className="flex items-center justify-center p-12 bg-gray-50 rounded-2xl border-2 border-gray-200">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          customExpenses.map((expense, index) => {
            const colors = cardColors[index % cardColors.length];
            const customKey = `custom_${expense.id}`;
            
            return (
              <div key={expense.id} className={`group bg-gradient-to-br ${colors.from} ${colors.via} ${colors.to} border-2 ${colors.border} rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 ${colors.hoverBorder} relative`}>
                {/* Delete button in top-right corner */}
                {!isEditing && (
                  <button
                    onClick={() => handleDeleteCustomExpense(expense.id)}
                    className="absolute top-3 right-3 p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors opacity-0 group-hover:opacity-100"
                    title="Удалить затрату"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                
                <div className="flex items-center gap-3 mb-4">
                  <div className={`bg-gradient-to-br ${colors.bg} ${colors.bgEnd} p-3 rounded-xl shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300`}>
                    <Receipt className="w-6 h-6 text-white" />
                  </div>
                  <div className={`text-lg font-semibold ${colors.text} flex-1 truncate`} title={expense.expense_name}>
                    {expense.expense_name}
                  </div>
                </div>
                
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOperationType({ ...operationType, [customKey]: 'add' })}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                          operationType[customKey] === 'add'
                            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg scale-105'
                            : `bg-white text-gray-700 border-2 ${colors.borderColor} ${colors.hoverBg} ${colors.hoverBorderColor} hover:scale-105`
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-semibold">Затрата</span>
                      </button>
                      <button
                        onClick={() => setOperationType({ ...operationType, [customKey]: 'subtract' })}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                          operationType[customKey] === 'subtract'
                            ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg scale-105'
                            : `bg-white text-gray-700 border-2 ${colors.borderColor} ${colors.hoverBg} ${colors.hoverBorderColor} hover:scale-105`
                        }`}
                      >
                        <Minus className="w-4 h-4" />
                        <span className="text-sm font-semibold">Возврат</span>
                      </button>
                    </div>
                    
                    <input
                      type="number"
                      value={formData[customKey] || ''}
                      onChange={(e) => setFormData({ ...formData, [customKey]: e.target.value })}
                      className={`w-full px-4 py-3 border-2 ${colors.borderColor} rounded-xl text-lg font-semibold bg-white shadow-sm focus:outline-none focus:ring-4 ${colors.ring} ${colors.focusBorder} transition-all`}
                      placeholder="Введите сумму"
                    />
                    
                    <div className={`text-sm font-medium px-3 py-2 rounded-lg ${
                      operationType[customKey] === 'add' ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'
                    }`}>
                      {operationType[customKey] === 'add' 
                        ? `➕ Добавится: ${formatPrice(expense.amount)} → ${formatPrice(expense.amount + (parseInt(formData[customKey]) || 0))}`
                        : `➖ Уменьшится: ${formatPrice(expense.amount)} → ${formatPrice(expense.amount - (parseInt(formData[customKey]) || 0))}`
                      }
                    </div>
                  </div>
                ) : (
                  <div className={`text-3xl font-bold ${colors.text} mb-1`}>{formatPrice(expense.amount)}</div>
                )}
                
                <div className={`text-sm font-medium ${colors.textLight} mt-3 truncate`} title={expense.description || 'Дополнительная затрата компании'}>
                  {expense.description || 'Дополнительная затрата компании'}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
