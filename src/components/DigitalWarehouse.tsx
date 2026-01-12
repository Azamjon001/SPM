import { useQueryClient } from '@tanstack/react-query';
import { Check, Download, Edit2, Image as ImageIcon, Layers, Package, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { addProduct, bulkImportProducts, deleteAllProducts, deleteProduct, toggleProductCustomerAvailability, updateProduct } from '../utils/api';
import { useCompanyProducts } from '../utils/cache';
import { invalidateCache } from '../utils/productsCache';
import ExcelColumnMapper, { ColumnMapping } from './ExcelColumnMapper';
import ImageUploader from './ImageUploader';

// 📋 СИСТЕМА УПРАВЛЕНИЯ КАТЕГОРИЯМИ:
// ✅ Категории могут создаваться независимо от товаров
// ✅ Для хранения пустых категорий используются скрытые товары-маркеры: "__CATEGORY_MARKER__[название_категории]"
// ✅ Маркеры автоматически удаляются при добавлении первого реального товара в категорию
// ✅ Маркеры автоматически создаются при удалении последнего товара из категории
// ✅ Маркеры скрыты от пользователей (available_to_customers: false)
// ✅ Маркеры фильтруются во всех списках, статистике, экспорте и импорте

// Локальный кэш для продуктов (упрощенная версия)
const localCache = {
  data: null as any,
  timestamp: 0,
  ttl: 3000, // 3 секунды
  get() {
    if (Date.now() - this.timestamp > this.ttl) return null;
    return this.data;
  },
  set(data: any) {
    this.data = data;
    this.timestamp = Date.now();
  },
  clear() {
    this.data = null;
    this.timestamp = 0;
  }
};

interface DigitalWarehouseProps {
  companyId: number;
}

export const DigitalWarehouse: React.FC<DigitalWarehouseProps> = ({ companyId }) => {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading, error, refetch } = useCompanyProducts(companyId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', quantity: 0, price: 0, markup_percent: 0, barcode: '', category: '', barid: '' });
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', quantity: 0, price: 0, markup_percent: 0, barcode: '', category: '', barid: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showImageUploader, setShowImageUploader] = useState<string | null>(null); // ID товара для которого показываем загрузчик фото

  // 🆕 Состояние для гибкого импорта Excel с выбором колонок
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [excelPreviewData, setExcelPreviewData] = useState<{ columns: string[], sampleData: string[][], fullData: any[][] } | null>(null);

  // 🆕 НОВОЕ: Управление категориями
  const [newCategoryName, setNewCategoryName] = useState('');

  // 🆕 НОВОЕ: Вкладки в модальном окне
  const [modalTab, setModalTab] = useState<'add' | 'categories'>('add');

  // 🆕 НОВОЕ: Редактирование категории
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // 🆕 НОВОЕ: Создание новой категории в панели категорий
  const [creatingNewCategory, setCreatingNewCategory] = useState(false);
  const [newCategoryInPanel, setNewCategoryInPanel] = useState('');

  // Получаем уникальные категории из товаров
  const categories = useMemo(() => {
    const cats = new Set(products.map((p: any) => p.category || 'Без категории'));
    return Array.from(cats).sort();
  }, [products]);

  // Фильтрация товаров
  const filteredProducts = useMemo(() => {
    return products.filter((product: any) => {
      // 🚫 Скрываем товары-маркеры категорий из списка
      if (product.name && product.name.startsWith('__CATEGORY_MARKER__')) {
        return false;
      }

      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode && String(product.barcode).includes(searchTerm)) ||
        (product.barid && String(product.barid).includes(searchTerm));
      const matchesCategory = selectedCategory === 'all' ||
        (product.category || 'Без категории') === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Статистика склада
  const warehouseStats = useMemo(() => {
    // 🚫 Исключаем товары-маркеры категорий из статистики
    const realProducts = products.filter((p: any) => !p.name || !p.name.startsWith('__CATEGORY_MARKER__'));

    return {
      totalProducts: realProducts.length,
      totalQuantity: realProducts.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0),
      totalValue: realProducts.reduce((sum: number, p: any) => sum + ((p.price || 0) * (p.quantity || 0)), 0),
      categories: categories.length
    };
  }, [products, categories]);

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      quantity: product.quantity,
      price: product.price,
      markup_percent: product.markup_percent || 0,
      barcode: product.barcode || '',
      category: product.category || '',
      barid: product.barid || ''
    });
  };

  const handleSave = async (id: string) => {
    try {
      // ✅ Валидация markup_percent перед отправкой
      const validatedForm = {
        ...editForm,
        markup_percent: Math.min(Math.max(0, editForm.markup_percent), 999.99)
      };

      if (validatedForm.markup_percent > 999.99) {
        alert(`⚠️ Процент наценки слишком большой (${editForm.markup_percent}%). Максимум: 999.99%. Будет установлено максимальное значение.`);
      }

      // 🎯 Проверяем изменение категории
      const originalProduct = products.find((p: any) => p.id === id);
      const oldCategory = originalProduct?.category;
      const newCategory = validatedForm.category;

      // 🎯 Если товар переносится в новую категорию, удаляем маркер новой категории
      if (newCategory && newCategory !== oldCategory) {
        const newCategoryMarker = products.find((p: any) =>
          p.name === `__CATEGORY_MARKER__${newCategory}` && p.category === newCategory
        );
        if (newCategoryMarker) {
          await deleteProduct(companyId, newCategoryMarker.id);
        }
      }

      await updateProduct(id, validatedForm); // 🔥 ИСПРАВЛЕНО: было (companyId, id, validatedForm)

      // 🎯 Если это был последний реальный товар в старой категории, создаем маркер
      if (oldCategory && oldCategory !== newCategory) {
        const oldCategoryProducts = products.filter((p: any) =>
          p.category === oldCategory && !p.name?.startsWith('__CATEGORY_MARKER__')
        );

        if (oldCategoryProducts.length === 1 && oldCategoryProducts[0].id === id) {
          await addProduct({
            company_id: companyId,
            name: `__CATEGORY_MARKER__${oldCategory}`,
            quantity: 0,
            price: 0,
            markup_percent: 0,
            barcode: '',
            category: oldCategory,
            available_to_customers: false
          });
        }
      }

      setEditingId(null);
      localCache.clear();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      invalidateCache(); // Очищаем супер-кэш
      await refetch();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Ошибка при обновлении товара');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот товар?')) return;
    try {
      // 🎯 Проверяем, был ли это последний реальный товар в категории
      const productToDelete = products.find((p: any) => p.id === id);
      const productCategory = productToDelete?.category;

      // 🐛 ИСПРАВЛЕНИЕ: deleteProduct принимает только id, не companyId
      await deleteProduct(Number(id));

      // 🎯 Если это был последний реальный товар в категории, создаем маркер
      if (productCategory) {
        const categoryProducts = products.filter((p: any) =>
          p.category === productCategory && !p.name?.startsWith('__CATEGORY_MARKER__')
        );

        // Если удаляемый товар был последним реальным товаром в категории
        if (categoryProducts.length === 1 && categoryProducts[0].id === id) {
          // Создаем товар-маркер для сохранения категории
          await addProduct({
            company_id: companyId,
            name: `__CATEGORY_MARKER__${productCategory}`,
            quantity: 0,
            price: 0,
            markup_percent: 0,
            barcode: '',
            category: productCategory,
            available_to_customers: false
          });
        }
      }

      localCache.clear();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      invalidateCache(); // Очищаем супер-кэш
      await refetch();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Ошибка при удалении товара');
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || newProduct.price <= 0) {
      alert('Заполните название и цену товара');
      return;
    }

    // 🆕 Обработка новой категории
    let finalCategory = newProduct.category;
    if (newProduct.category === '__new__') {
      if (!newCategoryName.trim()) {
        alert('Введите название новой категории');
        return;
      }
      finalCategory = newCategoryName.trim();
    }

    // ✅ Валидация markup_percent перед отправкой
    const validatedProduct = {
      ...newProduct,
      category: finalCategory,
      markup_percent: Math.min(Math.max(0, newProduct.markup_percent), 999.99)
    };

    if (newProduct.markup_percent > 999.99) {
      alert(`⚠️ Процент наценки слишком большой (${newProduct.markup_percent}%). Максимум: 999.99%. Будет установлено максимальное значение.`);
    }

    try {
      // 🎯 Если добавляем товар в категорию, удаляем товар-маркер этой категории
      if (finalCategory) {
        const categoryMarker = products.find((p: any) =>
          p.name === `__CATEGORY_MARKER__${finalCategory}` && p.category === finalCategory
        );
        if (categoryMarker) {
          await deleteProduct(companyId, categoryMarker.id);
        }
      }

      await addProduct({
        company_id: companyId,
        ...validatedProduct
      });
      setNewProduct({ name: '', quantity: 0, price: 0, markup_percent: 0, barcode: '', category: '', barid: '' });
      setNewCategoryName('');
      setShowAddForm(false);
      localCache.clear();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      invalidateCache(); // Очищаем супер-кэш
      await refetch();
    } catch (error: any) {
      console.error('Error adding product:', error);
      // Показываем понятное сообщение об ошибке
      const errorMessage = error?.message || 'Ошибка при добавлении товара';
      alert(`❌ ${errorMessage}`);
    }
  };

  // 🗑️ Массовое удаление ВСЕХ товаров
  const handleDeleteAllProducts = async () => {
    // 🚫 Считаем только реальные товары
    const realProducts = products.filter((p: any) => !p.name || !p.name.startsWith('__CATEGORY_MARKER__'));
    const confirmMessage = `⚠️ ВНИМАНИЕ! Вы собираетесь удалить ВСЕ ${realProducts.length} товаров!\n\nЭто действие НЕЛЬЗЯ отменить!\n\nВведите "УДАЛИТЬ" для подтверждения:`;
    const userInput = prompt(confirmMessage);

    if (userInput !== 'УДАЛИТЬ') {
      alert('Удаление отменено');
      return;
    }

    try {
      console.log('🗑️ Starting mass deletion of all products...');
      await deleteAllProducts();

      localCache.clear();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      invalidateCache();
      await refetch();

      alert(`✅ Успешно удалено ${realProducts.length} товаров!`);
    } catch (error) {
      console.error('Error deleting all products:', error);
      alert('Ошибка при массовом удалении товаров');
    }
  };

  // 📸 Обработчик обновления фотографий
  const handleImagesChange = async () => {
    // Очищаем все кэши для обновления данных
    localCache.clear();
    queryClient.invalidateQueries({ queryKey: ['products'] });
    invalidateCache();
    await refetch(); // Обновляем список товаров после загрузки/удаления фото
  };

  // 🔄 Переключение доступности товара для покупателей
  const handleToggleAvailability = async (productId: number) => {
    try {
      console.log('🔄 Toggling availability for product:', productId);
      await toggleProductCustomerAvailability(productId);

      localCache.clear();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      invalidateCache();
      await refetch();
    } catch (error) {
      console.error('Error toggling product availability:', error);
      alert('Ошибка при изменении доступности товара');
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

    if (isExcel) {
      // 📊 Шаг 1: Парсим Excel и показываем маппер колонок
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);

          // ⚡ ВАЖНО: Ограничиваем размер файла (максимум 5MB)
          if (data.byteLength > 5 * 1024 * 1024) {
            alert('❌ Файл слишком большой (максимум 5MB).\n\nДля больших файлов используйте CSV/TXT формат.');
            e.target.value = '';
            return;
          }

          // ⚡ Оптимизация: используем минимальные настройки для XLSX
          const workbook = XLSX.read(data, {
            type: 'array',
            cellDates: false,
            cellNF: false,
            cellStyles: false,
            sheetStubs: false
          });

          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
            header: 1,
            defval: '',
            blankrows: false
          }) as any[][];

          // ⚡ ВАЖНО: Очищаем workbook из памяти
          (workbook as any).Sheets = null;
          (workbook as any).SheetNames = null;

          // ⚡ Ограничиваем количество строк (максимум 10000)
          if (jsonData.length > 10000) {
            alert(`❌ Слишком много строк (${jsonData.length}).\n\nМаксимум: 10000 строк.\nРазбейте файл на несколько частей.`);
            e.target.value = '';
            return;
          }

          if (jsonData.length === 0) {
            alert('❌ Файл пустой!');
            e.target.value = '';
            return;
          }

          // 📋 Извлекаем заголовки (первая строка) и данные для preview
          const firstRow = jsonData[0];
          const hasHeader = firstRow && firstRow.some((cell: any) =>
            typeof cell === 'string' && isNaN(parseFloat(cell))
          );

          const columns = hasHeader
            ? firstRow.map((cell: any, idx: number) => String(cell || `Колонка ${idx + 1}`))
            : firstRow.map((_: any, idx: number) => `Колонка ${idx + 1}`);

          const dataStartRow = hasHeader ? 1 : 0;
          const sampleData = jsonData.slice(dataStartRow, dataStartRow + 5); // Первые 5 строк данных

          // 🎯 Показываем маппер колонок
          setExcelPreviewData({
            columns,
            sampleData,
            fullData: jsonData
          });
          setShowColumnMapper(true);

        } catch (error) {
          console.error('Error parsing Excel:', error);
          alert('Ошибка при чтении Excel файла: ' + (error instanceof Error ? error.message : String(error)));
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Handle CSV/TXT files - пока оставляем старую логику
      reader.onload = async (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());

          const importedProducts: any[] = [];
          const startLine = lines[0] && lines[0].toLowerCase().includes('название') ? 1 : 0;

          for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            const parts = line.split(/[,;\t|]/).map(p => p.trim());

            if (parts.length >= 2) {
              const name = parts[0];
              const price = parseFloat(parts[1]);
              const quantity = parts[2] ? parseInt(parts[2]) : 0;
              let markupPercent = parts[3] && !isNaN(parseFloat(parts[3])) ? parseFloat(parts[3]) : undefined;
              const barcode = parts[4] || undefined;

              // ✅ Валидация markup_percent
              if (markupPercent !== undefined) {
                if (markupPercent > 999.99) {
                  console.warn(`⚠️ Строка ${i + 1}: markup_percent ограничен до 999.99%`);
                  markupPercent = 999.99;
                }
                if (markupPercent < 0) {
                  console.warn(`⚠️ Строка ${i + 1}: markup_percent установлен в 0%`);
                  markupPercent = 0;
                }
              }

              if (name && !isNaN(price) && price >= 0) {
                // 🚫 Игнорируем попытки импорта товаров-маркеров
                if (name.startsWith('__CATEGORY_MARKER__')) {
                  console.warn(`⚠️ Строка ${i + 1} пропущена (служебное название): ${name}`);
                  continue;
                }

                const product: any = { name, quantity, price };
                if (markupPercent !== undefined && !isNaN(markupPercent) && markupPercent >= 0) {
                  product.markup_percent = markupPercent;
                }
                if (barcode) product.barcode = barcode;
                importedProducts.push(product);
              }
            }
          }

          if (importedProducts.length > 0) {
            setImporting(true);
            setImportProgress(`Импорт ${importedProducts.length} товаров из CSV/TXT...`);
            try {
              const startTime = Date.now();
              await bulkImportProducts(companyId, importedProducts);

              const duration = ((Date.now() - startTime) / 1000).toFixed(2);

              setImportProgress('Обновление данных...');
              localCache.clear();
              queryClient.invalidateQueries({ queryKey: ['products'] });
              invalidateCache();

              await refetch();

              // 🎯 Удаляем товары-маркеры для категорий, в которые были добавлены реальные товары
              const importedCategories = new Set(importedProducts.map(p => p.category).filter(Boolean));
              for (const category of importedCategories) {
                const categoryMarker = products.find((p: any) =>
                  p.name === `__CATEGORY_MARKER__${category}` && p.category === category
                );
                if (categoryMarker) {
                  try {
                    await deleteProduct(companyId, categoryMarker.id);
                  } catch (error) {
                    console.warn(`⚠️ Не удалось удалить маркер категории "${category}":`, error);
                  }
                }
              }

              // Финальное обновление после удаления маркеров
              if (importedCategories.size > 0) {
                localCache.clear();
                queryClient.invalidateQueries({ queryKey: ['products'] });
                invalidateCache();
                await refetch();
              }

              alert(`✅ Успешно импортировано за ${duration} секунд!\n\nВсего товаров: ${importedProducts.length}`);
            } finally {
              setImporting(false);
              setImportProgress('');
            }
          } else {
            alert('❌ Не удалось импортировать товары!\n\nПроверьте формат файла.');
          }
        } catch (error) {
          console.error('Error importing text file:', error);
          alert('Ошибка при импорте файла: ' + (error instanceof Error ? error.message : String(error)));
          setImporting(false);
          setImportProgress('');
        }
      };
      reader.readAsText(file);
    }

    e.target.value = '';
  };

  const exportToExcel = () => {
    // 🚫 Исключаем товары-маркеры из экспорта
    const realProducts = products.filter((p: any) => !p.name || !p.name.startsWith('__CATEGORY_MARKER__'));

    const exportData = realProducts.map((p: any) => ({
      'Название': p.name,
      'Количество': p.quantity,
      'Цена': p.price,
      'Процент наценки': p.markup_percent || 0,
      'Штрих-код': p.barcode || '',
      'Barid': p.barid || '',
      'Категория': p.category || 'Без категории'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Товары');
    XLSX.writeFile(workbook, `warehouse_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 🎯 Обработчик подтверждения маппинга колонок
  const handleColumnMappingConfirm = async (mapping: ColumnMapping) => {
    if (!excelPreviewData) return;

    setShowColumnMapper(false);
    setImporting(true);
    setImportProgress('Обработка данных из Excel...');

    try {
      const { fullData } = excelPreviewData;
      const importedProducts: any[] = [];

      // Определяем с какой строки начинаются данные (пропускаем заголовок если есть)
      const firstRow = fullData[0];
      const hasHeader = firstRow && firstRow.some((cell: any) =>
        typeof cell === 'string' && isNaN(parseFloat(cell))
      );
      const startRow = hasHeader ? 1 : 0;

      // 📋 Обрабатываем данные с выбранным маппингом
      for (let i = startRow; i < fullData.length; i++) {
        const row = fullData[i];
        if (!row || row.length === 0) continue;

        // Извлекаем данные согласно маппингу
        const name = mapping.name !== null ? String(row[mapping.name] || '').trim() : '';
        const price = mapping.price !== null ? parseFloat(String(row[mapping.price] || '0')) : 0;
        const quantity = mapping.quantity !== null && row[mapping.quantity] !== undefined
          ? parseInt(String(row[mapping.quantity] || '0'))
          : 0;
        let markupPercent = mapping.markup_percent !== null && row[mapping.markup_percent] !== undefined
          ? parseFloat(String(row[mapping.markup_percent] || '0'))
          : undefined;
        const barcode = mapping.barcode !== null && row[mapping.barcode] !== undefined
          ? String(row[mapping.barcode]).trim()
          : undefined;
        const barid = mapping.barid !== null && row[mapping.barid] !== undefined
          ? String(row[mapping.barid]).replace(/\D/g, '').slice(0, 6) // Только цифры, макс 6
          : undefined;

        // ✅ Валидация markup_percent - ограничиваем до 999.99%
        if (markupPercent !== undefined && !isNaN(markupPercent)) {
          if (markupPercent > 999.99) {
            console.warn(`⚠️ Строка ${i + 1}: markup_percent слишком большой (${markupPercent}%), ограничен до 999.99%`);
            markupPercent = 999.99;
          }
          if (markupPercent < 0) {
            console.warn(`⚠️ Строка ${i + 1}: markup_percent отрицательный (${markupPercent}%), установлен в 0%`);
            markupPercent = 0;
          }
        }

        console.log(`📦 Строка ${i + 1}:`, { name, quantity, price, markupPercent, barcode, barid });

        // ✅ Проверяем обязательные поля: только название и цена
        if (name && !isNaN(price) && price >= 0) {
          // 🚫 Игнорируем попытки импорта товаров-маркеров
          if (name.startsWith('__CATEGORY_MARKER__')) {
            console.warn(`⚠️ Строка ${i + 1} пропущена (служебное название): ${name}`);
            continue;
          }

          const product: any = { name, quantity, price };
          if (markupPercent !== undefined && !isNaN(markupPercent) && markupPercent >= 0) {
            product.markup_percent = markupPercent;
          }
          if (barcode) product.barcode = barcode;
          if (barid) product.barid = barid;
          importedProducts.push(product);
          console.log(`✅ Товар ${importedProducts.length} добавлен:`, product);
        } else {
          console.warn(`⚠️ Строка ${i + 1} пропущена (невалидные данные):`, { name, price, isValidName: !!name, isValidPrice: !isNaN(price) && price >= 0 });
        }
      }

      console.log(`📊 Итого распарсено товаров: ${importedProducts.length} из ${fullData.length - startRow} строк`);

      if (importedProducts.length > 0) {
        setImportProgress(`Импорт ${importedProducts.length} товаров в базу данных...`);
        const startTime = Date.now();
        await bulkImportProducts(companyId, importedProducts);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        // ⚡ ВАЖНО: Очищаем ВСЕ кэши после импорта!
        setImportProgress('Обновление данных...');
        localCache.clear();
        queryClient.invalidateQueries({ queryKey: ['products'] });
        invalidateCache();

        await refetch();

        // 🎯 Удаляем товары-маркеры для категорий, в которые были добавлены реальные товары
        const importedCategories = new Set(importedProducts.map(p => p.category).filter(Boolean));
        for (const category of importedCategories) {
          const categoryMarker = products.find((p: any) =>
            p.name === `__CATEGORY_MARKER__${category}` && p.category === category
          );
          if (categoryMarker) {
            try {
              await deleteProduct(companyId, categoryMarker.id);
            } catch (error) {
              console.warn(`⚠️ Не удалось удалить маркер категории "${category}":`, error);
            }
          }
        }

        // Финальное обновление после удаления маркеров
        if (importedCategories.size > 0) {
          localCache.clear();
          queryClient.invalidateQueries({ queryKey: ['products'] });
          invalidateCache();
          await refetch();
        }

        alert(`✅ Успешно импортировано за ${duration} секунд!\n\nВсего строк в файле: ${fullData.length - startRow}\nУспешно импортировано: ${importedProducts.length} товаров`);
      } else {
        alert('❌ Не удалось импортировать товары!\n\nПроверьте:\n• Правильно ли выбраны колонки для Названия и Цены\n• Есть ли валидные данные в этих колонках\n\nОткройте консоль (F12) для деталей.');
      }
    } catch (error) {
      console.error('Error importing with mapping:', error);
      alert('Ошибка при импорте: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setImporting(false);
      setImportProgress('');
      setExcelPreviewData(null);
    }
  };

  // 🚫 Обработчик отмены маппинга
  const handleColumnMappingCancel = () => {
    setShowColumnMapper(false);
    setExcelPreviewData(null);
  };

  if (isLoading) return <div className="p-8 text-center">Загрузка склада...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Ошибка загрузки: {(error as Error).message}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl mb-3 sm:mb-4 text-gray-800 flex items-center gap-2 sm:gap-3">
            <Package className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-purple-600" />
            Цифровой склад
          </h1>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
              <div className="text-gray-600 text-xs sm:text-sm">Товаров</div>
              <div className="text-lg sm:text-xl lg:text-2xl text-purple-600">{warehouseStats.totalProducts}</div>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
              <div className="text-gray-600 text-xs sm:text-sm">Всего на складе</div>
              <div className="text-lg sm:text-xl lg:text-2xl text-blue-600">{warehouseStats.totalQuantity.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
              <div className="text-gray-600 text-xs sm:text-sm">Стоимость</div>
              <div className="text-lg sm:text-xl lg:text-2xl text-green-600">{warehouseStats.totalValue.toLocaleString()} сум</div>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
              <div className="text-gray-600 text-xs sm:text-sm">Категорий</div>
              <div className="text-lg sm:text-xl lg:text-2xl text-orange-600">{warehouseStats.categories}</div>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по названию, штрих-коду или barid..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 outline-none"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 outline-none"
            >
              <option value="all">Все категории</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-green-600 text-white rounded-lg sm:rounded-xl hover:bg-green-700 transition-colors shadow-lg text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Добавить товар</span>
              <span className="sm:hidden">Добавить</span>
            </button>

            <label className="flex items-center gap-2 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-purple-600 text-white rounded-lg sm:rounded-xl hover:bg-purple-700 transition-colors cursor-pointer shadow-lg text-sm sm:text-base">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden lg:inline">{importing ? importProgress : 'Импорт из Excel/CSV'}</span>
              <span className="lg:hidden">{importing ? 'Импорт...' : 'Импорт'}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={handleFileImport}
                disabled={importing}
                className="hidden"
              />
            </label>

            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 transition-colors shadow-lg text-sm sm:text-base"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Экспорт в Excel</span>
              <span className="sm:hidden">Экспорт</span>
            </button>

            <button
              onClick={handleDeleteAllProducts}
              className="flex items-center gap-2 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-red-600 text-white rounded-lg sm:rounded-xl hover:bg-red-700 transition-colors shadow-lg text-sm sm:text-base"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Удалить все товары</span>
              <span className="sm:hidden">Удалить все</span>
            </button>
          </div>
        </div>

        {/* 🎯 Модальное окно управления товарами и категориями */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddForm(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header с вкладками */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">Управление товарами</h3>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setModalTab('add');
                      setNewProduct({ name: '', quantity: 0, price: 0, markup_percent: 0, barcode: '', category: '', barid: '' });
                      setNewCategoryName('');
                    }}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Вкладки */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setModalTab('add')}
                    className={`flex-1 py-3 px-4 rounded-lg transition-all ${modalTab === 'add'
                        ? 'bg-white text-purple-600 shadow-lg'
                        : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                  >
                    <Plus className="w-5 h-5 inline mr-2" />
                    Добавить товар
                  </button>
                  <button
                    onClick={() => setModalTab('categories')}
                    className={`flex-1 py-3 px-4 rounded-lg transition-all ${modalTab === 'categories'
                        ? 'bg-white text-purple-600 shadow-lg'
                        : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                  >
                    <Layers className="w-5 h-5 inline mr-2" />
                    Категории ({categories.length})
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {/* Вкладка: Добавить товар */}
                {modalTab === 'add' && (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <input
                        type="text"
                        placeholder="Название товара *"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none transition-colors"
                      />
                      <select
                        value={newProduct.category}
                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                        className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none transition-colors"
                      >
                        <option value="">Выберите категорию</option>
                        {categories.filter(c => c !== 'Без категории').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="__new__">+ Создать новую категорию</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Количество"
                        value={newProduct.quantity || ''}
                        onChange={(e) => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) || 0 })}
                        className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="Цена (сум) *"
                        value={newProduct.price || ''}
                        onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                        className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none transition-colors"
                      />
                      <input
                        type="number"
                        placeholder="Процент наценки (%)"
                        value={newProduct.markup_percent || ''}
                        onChange={(e) => setNewProduct({ ...newProduct, markup_percent: parseFloat(e.target.value) || 0 })}
                        className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="Штрих-код (опционально)"
                        value={newProduct.barcode}
                        onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                        className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="Barid (5-6 цифр, опционально)"
                        value={newProduct.barid}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, ''); // Только цифры
                          setNewProduct({ ...newProduct, barid: value });
                        }}
                        maxLength={6}
                        className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none transition-colors"
                      />
                    </div>

                    {/* НОВОЕ: Поле для создания новой категории */}
                    {newProduct.category === '__new__' && (
                      <div className="mb-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                        <label className="block text-sm font-medium text-purple-800 mb-2">
                          Новая категория
                        </label>
                        <input
                          type="text"
                          placeholder="Введите название новой категории"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none"
                          autoFocus
                        />
                      </div>
                    )}

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={handleAddProduct}
                        className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium"
                      >
                        <Check className="w-5 h-5" />
                        Добавить товар
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setNewProduct({ name: '', quantity: 0, price: 0, markup_percent: 0, barcode: '', category: '', barid: '' });
                          setNewCategoryName('');
                        }}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}

                {/* Вкладка: Управление категориями */}
                {modalTab === 'categories' && (
                  <div>
                    <p className="text-gray-600 mb-4">
                      Управляйте категориями товаров: создавайте новые, переименовывайте или удаляйте существующие.
                    </p>

                    {/* Список категорий */}
                    <div className="space-y-2">
                      {categories.filter(c => c !== 'Без категории').map((category) => {
                        const categoryProducts = products.filter((p: any) => p.category === category);
                        // 🚫 Исключаем товары-маркеры из подсчета
                        const realCategoryProducts = categoryProducts.filter((p: any) =>
                          !p.name || !p.name.startsWith('__CATEGORY_MARKER__')
                        );
                        const isEditing = editingCategory === category;

                        return (
                          <div
                            key={category}
                            className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editCategoryName}
                                    onChange={(e) => setEditCategoryName(e.target.value)}
                                    className="px-3 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none w-full"
                                    autoFocus
                                  />
                                ) : (
                                  <div>
                                    <h4 className="text-lg font-medium text-gray-800">{category}</h4>
                                    <p className="text-sm text-gray-500">
                                      {realCategoryProducts.length} {realCategoryProducts.length === 1 ? 'товар' : 'товаров'}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2 ml-4">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={async () => {
                                        if (!editCategoryName.trim()) {
                                          alert('Введите название категории');
                                          return;
                                        }

                                        // Обновляем категорию для всех товаров
                                        try {
                                          for (const product of categoryProducts) {
                                            await updateProduct(product.id, {
                                              category: editCategoryName.trim()
                                            });
                                          }
                                          setEditingCategory(null);
                                          setEditCategoryName('');
                                          localCache.clear();
                                          queryClient.invalidateQueries({ queryKey: ['products'] });
                                          invalidateCache();
                                          await refetch();
                                        } catch (error) {
                                          console.error('Error renaming category:', error);
                                          alert('Ошибка при переименовании категории');
                                        }
                                      }}
                                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                      <Check className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingCategory(null);
                                        setEditCategoryName('');
                                      }}
                                      className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                                    >
                                      <X className="w-5 h-5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingCategory(category);
                                        setEditCategoryName(category);
                                      }}
                                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                      title="Переименовать"
                                    >
                                      <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={async () => {
                                        // Фильтруем реальные товары (без маркеров)
                                        const realProducts = categoryProducts.filter((p: any) =>
                                          !p.name || !p.name.startsWith('__CATEGORY_MARKER__')
                                        );
                                        const categoryMarker = categoryProducts.find((p: any) =>
                                          p.name && p.name.startsWith('__CATEGORY_MARKER__')
                                        );

                                        if (!confirm(`Удалить категорию "${category}"?\n\n${realProducts.length} товаров станут без категории.`)) {
                                          return;
                                        }

                                        // Удаляем категорию у всех товаров и маркер
                                        try {
                                          // Удаляем категорию у реальных товаров
                                          for (const product of realProducts) {
                                            await updateProduct(product.id, {
                                              category: ''
                                            });
                                          }

                                          // Удаляем товар-маркер категории
                                          if (categoryMarker) {
                                            await deleteProduct(companyId, categoryMarker.id);
                                          }

                                          localCache.clear();
                                          queryClient.invalidateQueries({ queryKey: ['products'] });
                                          invalidateCache();
                                          await refetch();
                                        } catch (error) {
                                          console.error('Error deleting category:', error);
                                          alert('Ошибка при удалении категории');
                                        }
                                      }}
                                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                      title="Удалить"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {categories.filter(c => c !== 'Без категории').length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Layers className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p>Категорий пока нет</p>
                          <p className="text-sm mt-2">Создайте первую категорию при добавлении товара</p>
                        </div>
                      )}

                      {/* НОВОЕ: Поле для создания новой категории в панели категорий */}
                      {creatingNewCategory ? (
                        <div className="bg-purple-50 rounded-lg border-2 border-purple-200 p-4">
                          <label className="block text-sm font-medium text-purple-800 mb-2">
                            Новая категория
                          </label>
                          <p className="text-sm text-gray-600 mb-3">
                            Создайте новую категорию. Вы сможете добавить товары позже.
                          </p>
                          <input
                            type="text"
                            placeholder="Введите название новой категории"
                            value={newCategoryInPanel}
                            onChange={(e) => setNewCategoryInPanel(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none"
                            autoFocus
                          />
                          <div className="flex gap-3 mt-3">
                            <button
                              onClick={async () => {
                                if (!newCategoryInPanel.trim()) {
                                  alert('Введите название категории');
                                  return;
                                }

                                // Проверяем, существует ли категория
                                const newCategory = newCategoryInPanel.trim();
                                if (categories.some(c => c.toLowerCase() === newCategory.toLowerCase())) {
                                  alert(`Категория "${newCategory}" уже существует.`);
                                  return;
                                }

                                // Создаем пустой товар-маркер категории (будет скрыт)
                                // Это позволит категории существовать в системе
                                try {
                                  await addProduct({
                                    company_id: companyId,
                                    name: `__CATEGORY_MARKER__${newCategory}`,
                                    quantity: 0,
                                    price: 0,
                                    markup_percent: 0,
                                    barcode: '',
                                    category: newCategory,
                                    available_to_customers: false // Скрываем от покупателей
                                  });

                                  setCreatingNewCategory(false);
                                  setNewCategoryInPanel('');
                                  localCache.clear();
                                  queryClient.invalidateQueries({ queryKey: ['products'] });
                                  invalidateCache();
                                  await refetch();

                                  alert(`✅ Категория "${newCategory}" успешно создана!\n\nТеперь вы можете добавить в неё товары.`);
                                } catch (error) {
                                  console.error('Error creating category:', error);
                                  alert('Ошибка при создании категории');
                                }
                              }}
                              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                              <Check className="w-5 h-5" />
                              Создать категорию
                            </button>
                            <button
                              onClick={() => {
                                setCreatingNewCategory(false);
                                setNewCategoryInPanel('');
                              }}
                              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCreatingNewCategory(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                        >
                          <Plus className="w-5 h-5" />
                          Создать новую категорию
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Название</th>
                  <th className="px-6 py-4 text-left">Категория</th>
                  <th className="px-6 py-4 text-left">Количество</th>
                  <th className="px-6 py-4 text-left">Базовая цена</th>
                  <th className="px-6 py-4 text-left">Наценка %</th>
                  <th className="px-6 py-4 text-left">Цена продажи</th>
                  <th className="px-6 py-4 text-left">Штрих-код</th>
                  <th className="px-6 py-4 text-left">Barid</th>
                  <th className="px-6 py-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm || selectedCategory !== 'all'
                        ? 'Товары не найдены'
                        : 'Нет товаров на складе. Добавьте товары или импортируйте из Excel'}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product: any) => (
                    <React.Fragment key={product.id}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          {editingId === product.id ? (
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none"
                            />
                          ) : (
                            <span className="text-gray-800">{product.name}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingId === product.id ? (
                            <select
                              value={editForm.category}
                              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none"
                            >
                              <option value="">Без категории</option>
                              {categories.filter(c => c !== 'Без категории').map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-sm text-gray-600 bg-purple-50 px-2 py-1 rounded">
                              {product.category || 'Без категории'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingId === product.id ? (
                            <input
                              type="number"
                              value={editForm.quantity}
                              onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) })}
                              className="w-24 px-3 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none"
                            />
                          ) : (
                            <span className="text-gray-700">{product.quantity}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingId === product.id ? (
                            <input
                              type="number"
                              value={editForm.price}
                              onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                              className="w-32 px-3 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none"
                            />
                          ) : (
                            <span className="text-gray-700">{product.price.toLocaleString()} сум</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingId === product.id ? (
                            <input
                              type="number"
                              value={editForm.markup_percent}
                              onChange={(e) => setEditForm({ ...editForm, markup_percent: parseFloat(e.target.value) })}
                              className="w-20 px-3 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none"
                            />
                          ) : (
                            <span className="text-gray-700">{product.markup_percent || 0}%</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-green-700">{(product.selling_price || product.price).toLocaleString()} сум</span>
                        </td>
                        <td className="px-6 py-4">
                          {editingId === product.id ? (
                            <input
                              type="text"
                              value={editForm.barcode}
                              onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                              className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none"
                            />
                          ) : (
                            <span className="text-gray-600 text-sm">{product.barcode || '—'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingId === product.id ? (
                            <input
                              type="text"
                              value={editForm.barid}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, ''); // Только цифры
                                setEditForm({ ...editForm, barid: value });
                              }}
                              maxLength={6}
                              placeholder="5-6 цифр"
                              className="w-24 px-3 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none"
                            />
                          ) : (
                            <span className="text-purple-600 font-medium text-sm">{product.barid || '—'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            {editingId === product.id ? (
                              <>
                                <button
                                  onClick={() => handleSave(product.id)}
                                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setShowImageUploader(showImageUploader === product.id ? null : product.id)}
                                  className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                  title="Добавить фото"
                                >
                                  <ImageIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEdit(product)}
                                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(product.id)}
                                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* 📸 Image Uploader Row */}
                      {showImageUploader === product.id && (
                        <tr>
                          <td colSpan={9} className="px-6 py-4 bg-purple-50">
                            <div className="max-w-2xl">
                              <h4 className="text-lg mb-3 text-purple-800 flex items-center gap-2">
                                <ImageIcon className="w-5 h-5" />
                                Фотографии товара: {product.name}
                              </h4>
                              <ImageUploader
                                productId={product.id}
                                images={product.images || []}
                                onImagesChange={handleImagesChange}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Help text */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <p className="mb-2">
            <strong>Пример:</strong><br />
            <code className="bg-white px-2 py-1 rounded">iPhone 14 | 5000000 | 10 | 15 | 1234567890 | 12345</code>
          </p>
          <p className="text-gray-600">
            ✅ Если количество не указано, будет 0<br />
            ✅ Если наценка не указана, товар продается по базовой цене<br />
            ✅ Barid - только цифры, максимум 6 символов<br />
            ✅ Откройте консоль (F12) для просмотра деталей импорта
          </p>
        </div>
      </div>

      {/* 🎯 Модальное окно для выбора соответствия колонок Excel */}
      {showColumnMapper && excelPreviewData && (
        <ExcelColumnMapper
          columns={excelPreviewData.columns}
          sampleData={excelPreviewData.sampleData}
          onConfirm={handleColumnMappingConfirm}
          onCancel={handleColumnMappingCancel}
        />
      )}
    </div>
  );
};