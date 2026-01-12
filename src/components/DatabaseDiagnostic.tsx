import React, { useState } from 'react';
import { supabase } from '../utils/supabase/client';

/**
 * 🔍 ДИАГНОСТИКА БАЗЫ ДАННЫХ
 * 
 * Проверяет структуру таблицы и находит проблемы
 */
export function DatabaseDiagnostic() {
  const [log, setLog] = useState<string[]>([]);
  const [diagnosing, setDiagnosing] = useState(false);

  const addLog = (message: string) => {
    setLog(prev => [...prev, `${message}`]);
    console.log(message);
  };

  const diagnose = async () => {
    setLog([]);
    setDiagnosing(true);
    addLog('🔍 НАЧАЛО ДИАГНОСТИКИ БАЗЫ ДАННЫХ');
    addLog('');

    try {
      // ШАГ 1: Получить структуру таблицы через информационную схему
      addLog('📋 ШАГ 1: Проверка структуры таблицы products...');
      
      const { data: columns, error: columnsError } = await supabase
        .rpc('get_table_columns', { table_name: 'products' })
        .then(result => {
          // Если RPC не существует, пробуем прямой запрос
          if (result.error?.code === '42883') {
            return supabase
              .from('information_schema.columns')
              .select('column_name, data_type, is_nullable')
              .eq('table_name', 'products');
          }
          return result;
        });

      if (columnsError) {
        addLog('   ⚠️ Не удалось получить схему через API');
        addLog('   💡 Проверяем другим способом...');
      } else if (columns) {
        addLog(`   ✅ Получена структура таблицы (${columns.length} колонок)`);
        const hasMarkupAmount = columns.some((c: any) => c.column_name === 'markup_amount');
        const hasSellingPrice = columns.some((c: any) => c.column_name === 'selling_price');
        
        if (hasMarkupAmount && hasSellingPrice) {
          addLog('   ✅ Колонки markup_amount и selling_price СУЩЕСТВУЮТ');
        } else {
          addLog('   ❌ НАЙДЕНА ПРОБЛЕМА: Колонки НЕ существуют!');
          if (!hasMarkupAmount) addLog('      - markup_amount отсутствует');
          if (!hasSellingPrice) addLog('      - selling_price отсутствует');
        }
      }

      // ШАГ 2: Попытка прямого теста
      addLog('');
      addLog('🧪 ШАГ 2: Тестовая запись в базу...');
      
      const testData = {
        company_id: 3,
        name: `ДИАГНОСТИКА_${Date.now()}`,
        quantity: 1,
        price: 100000,
        markup_percent: 20,
        markup_amount: 20000,
        selling_price: 120000,
        added_date: new Date().toISOString()
      };

      addLog('   📤 Попытка записи тестового товара...');
      const { data: inserted, error: insertError } = await supabase
        .from('products')
        .insert(testData)
        .select()
        .single();

      if (insertError) {
        addLog(`   ❌ ОШИБКА ВСТАВКИ: ${insertError.message}`);
        addLog(`   📋 Код ошибки: ${insertError.code}`);
        
        // Анализ ошибки
        if (insertError.code === '42703') {
          addLog('');
          addLog('   🎯 ДИАГНОЗ: Колонки markup_amount или selling_price НЕ СУЩЕСТВУЮТ!');
          addLog('');
          addLog('   💊 ЛЕЧЕНИЕ:');
          addLog('      1. Откройте Supabase SQL Editor');
          addLog('      2. Выполните запросы из файла /DIAGNOSE_AND_FIX.sql');
          addLog('      3. ШАГ 2 создаст недостающие колонки');
          addLog('      4. ШАГ 3 заполнит существующие товары');
        } else if (insertError.code === '42501') {
          addLog('');
          addLog('   🎯 ДИАГНОЗ: RLS политики блокируют запись!');
          addLog('');
          addLog('   💊 ЛЕЧЕНИЕ:');
          addLog('      1. Откройте Supabase Table Editor');
          addLog('      2. Таблица products → Настройки → RLS');
          addLog('      3. Проверьте политики INSERT и UPDATE');
          addLog('      4. Разрешите запись в новые колонки');
        } else {
          addLog('');
          addLog('   ⚠️ Неизвестная ошибка, смотрите детали в консоли');
        }
      } else if (inserted) {
        addLog('   ✅ Товар успешно добавлен!');
        addLog(`      ID: ${inserted.id}`);
        
        // Проверяем что сохранилось
        addLog('');
        addLog('   🔍 Проверка что сохранилось:');
        addLog(`      price = ${inserted.price} ${inserted.price === 100000 ? '✅' : '❌'}`);
        addLog(`      markup_percent = ${inserted.markup_percent} ${inserted.markup_percent === 20 ? '✅' : '❌'}`);
        addLog(`      markup_amount = ${inserted.markup_amount} ${inserted.markup_amount === 20000 ? '✅' : '❌'}`);
        addLog(`      selling_price = ${inserted.selling_price} ${inserted.selling_price === 120000 ? '✅' : '❌'}`);
        
        if (inserted.markup_amount === null || inserted.selling_price === null) {
          addLog('');
          addLog('   ❌ ПРОБЛЕМА: Значения сохранились как NULL!');
          addLog('');
          addLog('   🎯 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
          addLog('      1. Триггер перезаписывает значения → Проверьте ШАГ 5 в SQL файле');
          addLog('      2. Значение по умолчанию NULL → Проверьте ШАГ 1 в SQL файле');
          addLog('      3. RLS политика with_check блокирует → Проверьте ШАГ 4 в SQL файле');
        } else if (inserted.markup_amount === 20000 && inserted.selling_price === 120000) {
          addLog('');
          addLog('   🎉 УСПЕХ! Все работает правильно!');
          addLog('');
          addLog('   ✅ Колонки существуют');
          addLog('   ✅ RLS политики разрешают запись');
          addLog('   ✅ Данные сохраняются корректно');
          addLog('');
          addLog('   💡 Проблема была в том что Edge Function не обновилась!');
          addLog('      Выполните Deploy функции в Supabase Dashboard');
        }

        // Удаляем тестовый товар
        await supabase.from('products').delete().eq('id', inserted.id);
        addLog(`   🗑️ Тестовый товар удален`);
      }

      // ШАГ 3: Проверка реальных товаров
      addLog('');
      addLog('📊 ШАГ 3: Анализ существующих товаров...');
      
      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('id, name, price, markup_percent, markup_amount, selling_price')
        .eq('company_id', 3)
        .limit(5);

      if (fetchError) {
        addLog(`   ❌ Ошибка получения товаров: ${fetchError.message}`);
      } else if (products && products.length > 0) {
        addLog(`   ✅ Найдено ${products.length} товаров компании 3`);
        addLog('');
        
        let withPrices = 0;
        let withoutPrices = 0;
        
        products.forEach((p: any) => {
          const hasPrice = p.markup_amount !== null && p.selling_price !== null;
          if (hasPrice) {
            withPrices++;
          } else {
            withoutPrices++;
            addLog(`   ⚠️ ${p.name}: цены не заполнены`);
          }
        });
        
        addLog('');
        addLog(`   📊 Статистика:`);
        addLog(`      ✅ С ценами: ${withPrices} товаров`);
        addLog(`      ❌ Без цен: ${withoutPrices} товаров`);
        
        if (withoutPrices > 0) {
          addLog('');
          addLog('   💡 Используйте "Прямое обновление цен" чтобы заполнить');
        }
      } else {
        addLog('   ℹ️ Нет товаров для проверки');
      }

    } catch (error: any) {
      addLog('');
      addLog(`❌ КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`);
      console.error('Diagnostic error:', error);
    } finally {
      setDiagnosing(false);
      addLog('');
      addLog('🏁 ДИАГНОСТИКА ЗАВЕРШЕНА');
      addLog('');
      addLog('📄 Детальные инструкции: /DIAGNOSE_AND_FIX.sql');
    }
  };

  return null;
}