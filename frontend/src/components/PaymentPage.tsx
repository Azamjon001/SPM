import { ArrowLeft, CheckCircle, Loader, XCircle } from 'lucide-react';
import { useState } from 'react';

// ⚠️ API configuration - Go backend
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

interface PaymentPageProps {
  cart: CartItem[];
  totalPrice: number;
  userPhone?: string;
  userName?: string;
  userId?: string;
  onBack: () => void;
  onSuccess: () => void;
}

interface CartItem {
  id: number;
  name: string;
  price: number; // ⚡ ЭТО УЖЕ SELLING_PRICE (цена с наценкой)!
  quantity: number;
  selectedColor?: string;
  image?: string;
  markup_percent?: number; // 💰 НОВОЕ: Процент наценки
  markup_amount?: number; // 💰 НОВОЕ: Сумма наценки в деньгах
  base_price?: number; // 💰 НОВОЕ: Базовая цена без наценки
}

type PaymentMethod = 'payme' | 'click' | 'uzum' | null;
type PaymentStatus = 'selecting' | 'processing' | 'checking' | 'success' | 'failed';

export default function PaymentPage({
  cart,
  totalPrice,
  userPhone,
  userName,
  userId,
  onBack,
  onSuccess
}: PaymentPageProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('selecting');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDemoMode, setIsDemoMode] = useState(false);

  const paymentMethods = [
    {
      id: 'payme' as const,
      name: 'Payme',
      icon: '💰',
      description: 'UzCard, Humo, Visa, MasterCard',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'click' as const,
      name: 'Click',
      icon: '🔵',
      description: 'UzCard, Humo, все карты',
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      id: 'uzum' as const,
      name: 'Uzum',
      icon: '🟠',
      description: 'Uzum карты и кошелёк',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  // Создание заказа
  const createOrder = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/customer-orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: userId || 'guest',
            user_name: userName,
            user_phone: userPhone,
            items: cart.map(item => ({
              product_id: item.id,
              name: item.name,
              price: item.base_price || item.price,
              price_with_markup: item.price,
              markup_percent: item.markup_percent || 0,
              markup_amount: item.markup_amount || 0,
              quantity: item.quantity,
              color: item.selectedColor,
              image: item.image
            })),
            total_amount: totalPrice
          })
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create order');
      }

      return data.order_id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  // Создание платежа
  const createPayment = async (method: PaymentMethod) => {
    if (!method) return;

    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      // Создаём заказ
      const newOrderId = await createOrder();
      setOrderId(newOrderId);

      // Создаём платёж через Go API
      const response = await fetch(
        `${API_BASE}/payments/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            order_id: newOrderId,
            method
          })
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create payment');
      }

      setIsDemoMode(data.payment?.demo || false);

      if (data.payment?.demo) {
        // Демо режим - имитируем успешную оплату
        setPaymentStatus('checking');
        setTimeout(() => {
          checkPaymentStatus(newOrderId);
        }, 2000);
      } else {
        // Реальный платёж - редирект
        if (data.payment?.checkoutUrl) {
          window.location.href = data.payment.checkoutUrl;
        } else {
          throw new Error('No checkout URL provided');
        }
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Ошибка при создании платежа');
      setPaymentStatus('failed');
    }
  };

  // Проверка статуса платежа
  const checkPaymentStatus = async (checkOrderId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/payments/${checkOrderId}/status`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to check payment');
      }

      if (data.order.status === 'paid') {
        setTransactionId(data.order.transactionId);
        setPaymentStatus('success');

        // Через 3 секунды вызываем onSuccess
        setTimeout(() => {
          onSuccess();
        }, 3000);
      } else if (data.order.status === 'failed') {
        setPaymentStatus('failed');
        setErrorMessage('Платёж отклонён');
      } else {
        // Всё ещё pending - проверяем снова через 2 секунды
        setTimeout(() => {
          checkPaymentStatus(checkOrderId);
        }, 2000);
      }
    } catch (error) {
      console.error('Error checking payment:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Ошибка при проверке статуса');
      setPaymentStatus('failed');
    }
  };

  // Обработка нажатия на способ оплаты
  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
  };

  // Обработка подтверждения оплаты
  const handleConfirmPayment = () => {
    if (selectedMethod) {
      createPayment(selectedMethod);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {paymentStatus === 'selecting' && (
              <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition">
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            <h1>Оплата заказа</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Сумма заказа */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="text-center">
            <div className="text-gray-500 mb-2">Сумма к оплате</div>
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {totalPrice.toLocaleString()} сум
            </div>
            <div className="text-sm text-gray-500">
              Товаров: {cart.reduce((sum, item) => sum + item.quantity, 0)} шт.
            </div>
          </div>
        </div>

        {/* Статусы */}
        {paymentStatus === 'selecting' && (
          <>
            {/* Выбор способа оплаты */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <h2 className="text-xl mb-4">Выберите способ оплаты</h2>

              <div className="space-y-3">
                {paymentMethods.map(method => (
                  <button
                    key={method.id}
                    onClick={() => handleMethodSelect(method.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all ${selectedMethod === method.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`text-4xl bg-gradient-to-br ${method.color} w-16 h-16 rounded-xl flex items-center justify-center shadow-lg`}>
                        <span className="text-2xl">{method.icon}</span>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-lg font-medium">{method.name}</div>
                        <div className="text-sm text-gray-500">{method.description}</div>
                      </div>
                      {selectedMethod === method.id && (
                        <CheckCircle className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Информация о безопасности */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-6 mb-6">
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Безопасная оплата
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Шифрование данных карты</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Защита покупателя</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Возврат средств при необходимости</span>
                </li>
              </ul>
            </div>

            {/* Поддерживаемые карты */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <h3 className="text-sm text-gray-500 mb-3">Поддерживаемые карты:</h3>
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium">
                  💳 UzCard
                </div>
                <div className="px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg text-sm font-medium">
                  💳 Humo
                </div>
                <div className="px-4 py-2 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg text-sm font-medium">
                  💳 Visa
                </div>
                <div className="px-4 py-2 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg text-sm font-medium">
                  💳 MasterCard
                </div>
              </div>
            </div>

            {/* Кнопка оплаты */}
            <button
              onClick={handleConfirmPayment}
              disabled={!selectedMethod}
              className={`w-full py-4 rounded-xl font-medium text-white transition-all ${selectedMethod
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg'
                  : 'bg-gray-300 cursor-not-allowed'
                }`}
            >
              {selectedMethod ? `Оплатить ${totalPrice.toLocaleString()} сум` : 'Выберите способ оплаты'}
            </button>
          </>
        )}

        {/* Processing */}
        {paymentStatus === 'processing' && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Loader className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-medium mb-2">Создание платежа...</h2>
            <p className="text-gray-500">Пожалуйста, подождите</p>
          </div>
        )}

        {/* Checking */}
        {paymentStatus === 'checking' && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Loader className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-medium mb-2">Проверка оплаты...</h2>
            <p className="text-gray-500">Ожидаем подтверждение</p>
            {isDemoMode && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  🎬 Демо режим - имитация успешной оплаты
                </p>
              </div>
            )}
          </div>
        )}

        {/* Success */}
        {paymentStatus === 'success' && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-medium mb-2">Оплата успешна!</h2>
            <p className="text-gray-500 mb-4">Спасибо за покупку!</p>

            {orderId && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-500 mb-1">Номер заказа</div>
                <div className="font-mono text-lg">{orderId.slice(-12)}</div>
              </div>
            )}

            {transactionId && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-500 mb-1">ID транзакции</div>
                <div className="font-mono text-sm">{transactionId}</div>
              </div>
            )}

            {isDemoMode && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  🎬 Демо режим - реальные платежи пока не настроены
                </p>
              </div>
            )}

            <p className="text-sm text-gray-500 mt-4">
              Перенаправление на главную страницу...
            </p>
          </div>
        )}

        {/* Failed */}
        {paymentStatus === 'failed' && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-medium mb-2">Ошибка оплаты</h2>
            <p className="text-gray-500 mb-6">{errorMessage || 'Произошла ошибка при обработке платежа'}</p>

            <button
              onClick={() => {
                setPaymentStatus('selecting');
                setSelectedMethod(null);
                setErrorMessage('');
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
            >
              Попробовать снова
            </button>
          </div>
        )}
      </div>
    </div>
  );
}