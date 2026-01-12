import { Receipt, Package, Clock, Calendar } from 'lucide-react';
import { formatUzbekistanDateTime } from '../utils/uzbekTime';

interface SaleItem {
  product_id: number;
  name: string;
  quantity: number;
  price: number;
  markup_percent?: number;
  image_url?: string | null;
}

interface Sale {
  id: number;
  company_id: number;
  items: SaleItem[];
  total_amount: number;
  sale_date: string;
  created_date?: string; // 🎯 ПРАВИЛЬНОЕ ИМЯ ПОЛЯ из базы данных!
  created_at?: string; // Старое имя для совместимости
}

interface SalesReceiptProps {
  sale: Sale;
}

export default function SalesReceipt({ sale }: SalesReceiptProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' сум';
  };

  const getPriceWithMarkup = (price: number, markupPercent: number = 0) => {
    return price * (1 + markupPercent / 100);
  };

  const getTotalQuantity = () => {
    return sale.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  // 🕒 Форматирование даты и времени
  // 🎯 ИСПРАВЛЕНО: используем created_date (правильное имя поля в БД)
  const dateSource = sale.created_date || sale.created_at || sale.sale_date;
  
  // 🐛 Детальное логирование
  console.log(`🧾 [Receipt #${sale.id}] ========== НАЧАЛО ==========`);
  console.log(`🧾 [Receipt #${sale.id}] Full sale object:`, sale);
  console.log(`🧾 [Receipt #${sale.id}] created_date:`, sale.created_date); // 🎯 ПРАВИЛЬНОЕ ПОЛЕ!
  console.log(`🧾 [Receipt #${sale.id}] created_at:`, sale.created_at);
  console.log(`🧾 [Receipt #${sale.id}] sale_date:`, sale.sale_date);
  console.log(`🧾 [Receipt #${sale.id}] Date source:`, dateSource);
  
  const dateTime = formatUzbekistanDateTime(dateSource);
  
  console.log(`🧾 [Receipt #${sale.id}] Formatted dateTime:`, dateTime);
  console.log(`🧾 [Receipt #${sale.id}] dateTime.date:`, dateTime?.date);
  console.log(`🧾 [Receipt #${sale.id}] dateTime.time:`, dateTime?.time);
  console.log(`🧾 [Receipt #${sale.id}] ========== КОНЕЦ ==========`);

  return (
    <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 hover:border-blue-300 transition-all hover:shadow-lg">
      {/* 📋 Заголовок чека */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6" />
            <div>
              <div className="text-2xl font-bold">Чек #{sale.id}</div>
              <div className="text-sm text-blue-100">{getTotalQuantity()} {getTotalQuantity() === 1 ? 'товар' : 'товаров'}</div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm text-blue-100">
              <Calendar className="w-4 h-4" />
              {dateTime.date}
            </div>
            <div className="flex items-center gap-2 text-blue-100 mt-1">
              <Clock className="w-5 h-5" />
              {dateTime.time}
            </div>
          </div>
        </div>
      </div>

      {/* 🛒 Список товаров */}
      <div className="p-6">
        <div className="space-y-4">
          {sale.items.map((item, index) => {
            const priceWithMarkup = getPriceWithMarkup(item.price, item.markup_percent);
            const totalItemPrice = priceWithMarkup * item.quantity;

            return (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                <div className="flex gap-4">
                  {/* 🖼️ Изображение товара */}
                  <div className="w-20 h-20 flex-shrink-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                        <Package className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* 📝 Информация о товаре */}
                  <div className="flex-1">
                    <div className="text-gray-900 font-medium mb-1">{item.name}</div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-gray-600">
                        Количество: <span className="font-medium text-gray-900">{item.quantity} шт.</span>
                      </div>
                      
                      {item.markup_percent && item.markup_percent > 0 ? (
                        <div className="text-green-600">
                          Наценка: <span className="font-medium">+{item.markup_percent}%</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      <div className="text-sm text-gray-600">
                        Цена: <span className="font-medium text-gray-900">{formatPrice(priceWithMarkup)}</span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        Сумма: <span className="font-medium text-green-600">{formatPrice(totalItemPrice)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 💰 Итоговая сумма */}
        <div className="mt-6 pt-6 border-t-2 border-gray-300">
          <div className="flex items-center justify-between">
            <div className="text-xl font-medium text-gray-800">Итого:</div>
            <div className="text-3xl font-bold text-green-600">
              {formatPrice(sale.total_amount)}
            </div>
          </div>
          <div className="text-right text-sm text-gray-600 mt-1">
            {getTotalQuantity()} {getTotalQuantity() === 1 ? 'товар' : getTotalQuantity() < 5 ? 'товара' : 'товаров'}
          </div>
        </div>
      </div>
    </div>
  );
}