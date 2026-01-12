import React, { useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

/**
 * 🔍 ПАНЕЛЬ ОТЛАДКИ ЦЕН
 * 
 * Этот компонент помогает понять почему markup_amount и selling_price не сохраняются
 */
export function PriceDebugPanel({ companyId }: { companyId: string }) {
  const [log, setLog] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const addLog = (message: string) => {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
    console.log(message);
  };

  const testPriceCalculation = async () => {
    setLog([]);
    setTesting(true);
    addLog('🔍 НАЧАЛО ТЕСТА РАСЧЕТА ЦЕН');

    try {
      // ТЕСТ 1: Локальный расчет
      addLog('');
      addLog('📊 ТЕСТ 1: Локальный расчет цен');
      const price = 100000;
      const markup_percent = 20;
      const markup_amount = Math.round((price * markup_percent / 100) * 100) / 100;
      const selling_price = Math.round((price + markup_amount) * 100) / 100;
      
      addLog(`   Закупочная цена: ${price} сум`);
      addLog(`   Наценка: ${markup_percent}%`);
      addLog(`   → Сумма наценки: ${markup_amount} сум`);
      addLog(`   → Цена продажи: ${selling_price} сум`);
      addLog(`   ✅ Локальный расчет работает!`);

      // ТЕСТ 2: Попытка добавить товар через сервер
      addLog('');
      addLog('📤 ТЕСТ 2: Добавление товара через сервер');
      addLog(`   Отправка данных на сервер...`);
      
      const testProductName = `DEBUG_TEST_${Date.now()}`;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2907f15a/products/add`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            company_id: companyId,
            name: testProductName,
            quantity: 1,
            price: price,
            markup_percent: markup_percent
          })
        }
      );

      const result = await response.json();
      
      if (!result.success) {
        addLog(`   ❌ Ошибка от сервера: ${result.error}`);
        throw new Error(result.error);
      }

      addLog(`   ✅ Товар добавлен! ID: ${result.product_id}`);
      addLog(`   📋 Проверяем что сохранилось в базе данных...`);

      // ТЕСТ 3: Получить товар из базы
      addLog('');
      addLog('📥 ТЕСТ 3: Получение товара из базы');
      
      const fetchResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2907f15a/products?company_id=${companyId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const productsResponse = await fetchResponse.json();
      
      // Проверяем формат ответа
      let productsList;
      if (productsResponse.success && Array.isArray(productsResponse.products)) {
        productsList = productsResponse.products;
        addLog(`   ✅ Получено ${productsList.length} товаров от сервера`);
      } else if (Array.isArray(productsResponse)) {
        productsList = productsResponse;
        addLog(`   ✅ Получено ${productsList.length} товаров от сервера`);
      } else {
        addLog(`   ❌ Неожиданный формат ответа от сервера`);
        addLog(`   📋 Ответ: ${JSON.stringify(productsResponse).substring(0, 200)}`);
        throw new Error('Неправильный формат ответа от сервера');
      }
      
      const testProduct = productsList.find((p: any) => p.name === testProductName);

      if (!testProduct) {
        addLog(`   ❌ Товар не найден в базе!`);
        throw new Error('Товар не найден после создания');
      }

      addLog(`   📦 Товар найден: ${testProduct.name}`);
      addLog('');
      addLog('   🔍 ПРОВЕРКА ЗНАЧЕНИЙ В БАЗЕ ДАННЫХ:');
      addLog(`      price = ${testProduct.price} (ожидается: ${price})`);
      addLog(`      markup_percent = ${testProduct.markup_percent} (ожидается: ${markup_percent})`);
      addLog(`      markup_amount = ${testProduct.markup_amount} (ожидается: ${markup_amount})`);
      addLog(`      selling_price = ${testProduct.selling_price} (ожидается: ${selling_price})`);
      addLog('');

      // Анализ результатов
      const priceOk = testProduct.price === price;
      const markupPercentOk = testProduct.markup_percent === markup_percent;
      const markupAmountOk = testProduct.markup_amount === markup_amount;
      const sellingPriceOk = testProduct.selling_price === selling_price;

      if (priceOk && markupPercentOk && markupAmountOk && sellingPriceOk) {
        addLog('   🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Система работает правильно!');
      } else {
        addLog('   ⚠️ ОБНАРУЖЕНЫ ПРОБЛЕМЫ:');
        if (!priceOk) addLog(`      ❌ price не совпадает`);
        if (!markupPercentOk) addLog(`      ❌ markup_percent не совпадает`);
        if (!markupAmountOk) addLog(`      ❌ markup_amount = ${testProduct.markup_amount === null ? 'NULL' : testProduct.markup_amount} (ОШИБКА!)`);
        if (!sellingPriceOk) addLog(`      ❌ selling_price = ${testProduct.selling_price === null ? 'NULL' : testProduct.selling_price} (ОШИБКА!)`);
        addLog('');
        addLog('   📋 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
        addLog('      1. Колонки не созданы в Supabase');
        addLog('      2. RLS политики блокируют запись');
        addLog('      3. Триггеры перезаписывают значения');
        addLog('      4. Колонки имеют неправильный тип данных');
        addLog('');
        addLog('   💡 РЕШЕНИЕ:');
        addLog('      → Откройте /DEBUG_INSTRUCTIONS.md');
        addLog('      → Выполните все тесты из инструкции');
        addLog('      → Отправьте логи разработчику');
      }

    } catch (error: any) {
      addLog('');
      addLog(`❌ ТЕСТ ЗАВЕРШИЛСЯ С ОШИБКОЙ: ${error.message}`);
      addLog('');
      addLog('📋 Проверьте:');
      addLog('   1. Консоль браузера (F12) для деталей');
      addLog('   2. Логи Edge Function в Supabase Dashboard');
      addLog('   3. Файл /DEBUG_INSTRUCTIONS.md для подробных инструкций');
    } finally {
      setTesting(false);
      addLog('');
      addLog('🏁 ТЕСТ ЗАВЕРШЕН');
    }
  };

  return null;
}