import React, { useState } from 'react';
import { supabase } from '../utils/supabase/client';

/**
 * 🔧 ПРЯМОЕ ОБНОВЛЕНИЕ ЦЕН
 * 
 * Этот компонент обновляет цены НАПРЯМУЮ через Supabase Client,
 * минуя Edge Function, чтобы проверить работает ли запись в колонки
 */
export function DirectPriceUpdate({ companyId }: { companyId: string }) {
  const [log, setLog] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  const addLog = (message: string) => {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
    console.log(message);
  };

  const updateAllPrices = async () => {
    setLog([]);
    setUpdating(true);
    addLog('🔧 НАЧАЛО ПРЯМОГО ОБНОВЛЕНИЯ ЦЕН');
    addLog('');

    try {
      // Шаг 1: Получить все товары компании
      addLog('📥 ШАГ 1: Получение товаров из базы...');
      
      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', parseInt(companyId));

      if (fetchError) {
        addLog(`   ❌ Ошибка получения товаров: ${fetchError.message}`);
        throw fetchError;
      }

      addLog(`   ✅ Получено ${products?.length || 0} товаров`);

      if (!products || products.length === 0) {
        addLog('   ⚠️ Нет товаров для обновления');
        return;
      }

      // Шаг 2: Проверить текущее состояние
      addLog('');
      addLog('📊 ШАГ 2: Анализ текущего состояния...');
      
      let needsUpdate = 0;
      let alreadyOk = 0;

      products.forEach(product => {
        const hasNullPrices = product.markup_amount === null || product.selling_price === null;
        if (hasNullPrices) {
          needsUpdate++;
          addLog(`   ⚠️ ${product.name}: markup_amount=${product.markup_amount}, selling_price=${product.selling_price}`);
        } else {
          alreadyOk++;
        }
      });

      addLog(`   ✅ Товаров с правильными ценами: ${alreadyOk}`);
      addLog(`   ⚠️ Товаров требующих обновления: ${needsUpdate}`);

      if (needsUpdate === 0) {
        addLog('');
        addLog('🎉 ВСЕ ТОВАРЫ УЖЕ ИМЕЮТ ПРАВИЛЬНЫЕ ЦЕНЫ!');
        return;
      }

      // Шаг 3: Обновить каждый товар
      addLog('');
      addLog('🔄 ШАГ 3: Обновление товаров...');

      let successCount = 0;
      let errorCount = 0;

      for (const product of products) {
        const hasNullPrices = product.markup_amount === null || product.selling_price === null;
        
        if (hasNullPrices) {
          const price = product.price || 0;
          const markup_percent = product.markup_percent || 0;
          const markup_amount = Math.round((price * markup_percent / 100) * 100) / 100;
          const selling_price = Math.round((price + markup_amount) * 100) / 100;

          addLog(`   🔄 Обновление: ${product.name}`);
          addLog(`      price=${price}, markup=${markup_percent}%`);
          addLog(`      → markup_amount=${markup_amount}, selling_price=${selling_price}`);

          const { data: updated, error: updateError } = await supabase
            .from('products')
            .update({
              markup_amount: markup_amount,
              selling_price: selling_price
            })
            .eq('id', product.id)
            .select()
            .single();

          if (updateError) {
            addLog(`      ❌ ОШИБКА: ${updateError.message}`);
            errorCount++;
          } else if (updated) {
            // Проверяем что действительно сохранилось
            if (updated.markup_amount === markup_amount && updated.selling_price === selling_price) {
              addLog(`      ✅ УСПЕШНО сохранено!`);
              successCount++;
            } else {
              addLog(`      ⚠️ СТРАННО: Обновление прошло, но значения не совпадают!`);
              addLog(`         Ожидалось: markup=${markup_amount}, selling=${selling_price}`);
              addLog(`         Получено: markup=${updated.markup_amount}, selling=${updated.selling_price}`);
              errorCount++;
            }
          }
        }
      }

      // Итоги
      addLog('');
      addLog('📊 ИТОГИ:');
      addLog(`   ✅ Успешно обновлено: ${successCount} товаров`);
      addLog(`   ❌ Ошибок: ${errorCount}`);

      if (successCount > 0 && errorCount === 0) {
        addLog('');
        addLog('🎉 ВСЕ ТОВАРЫ УСПЕШНО ОБНОВЛЕНЫ!');
        addLog('   Обновите страницу и проверьте цены в таблице');
      } else if (errorCount > 0) {
        addLog('');
        addLog('⚠️ ЕСТЬ ПРОБЛЕМЫ!');
        addLog('   Возможные причины:');
        addLog('   1. RLS политики блокируют запись');
        addLog('   2. Триггеры перезаписывают значения');
        addLog('   3. Колонки имеют неправильный тип данных');
        addLog('');
        addLog('   💡 Попробуйте обновить через SQL (см. /CHECK_PRODUCT_1703.sql)');
      }

    } catch (error: any) {
      addLog('');
      addLog(`❌ КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`);
      addLog('');
      addLog('📋 Что делать:');
      addLog('   1. Откройте консоль браузера (F12)');
      addLog('   2. Выполните SQL запрос из /CHECK_PRODUCT_1703.sql');
      addLog('   3. Проверьте RLS политики');
    } finally {
      setUpdating(false);
      addLog('');
      addLog('🏁 ОБНОВЛЕНИЕ ЗАВЕРШЕНО');
    }
  };

  return null;
}