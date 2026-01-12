import React, { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface AdvancedFiltersProps {
  categories: string[];
  minPrice?: number;
  maxPrice?: number;
  onFilterChange: (filters: FilterState) => void;
  availableColors?: string[];
}

export interface FilterState {
  categories: string[];
  priceRange: [number, number];
  colors: string[];
  sortBy: 'name' | 'price-asc' | 'price-desc' | 'newest';
  inStockOnly: boolean;
}

export default function AdvancedFilters({
  categories,
  minPrice = 0,
  maxPrice = 1000000,
  onFilterChange,
  availableColors = []
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    priceRange: [minPrice, maxPrice],
    colors: [],
    sortBy: 'name',
    inStockOnly: false
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);

    // Подсчёт активных фильтров
    let count = 0;
    if (updated.categories.length > 0) count++;
    if (updated.priceRange[0] !== minPrice || updated.priceRange[1] !== maxPrice) count++;
    if (updated.colors.length > 0) count++;
    if (updated.inStockOnly) count++;
    setActiveFiltersCount(count);
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    updateFilters({ categories: newCategories });
  };

  const toggleColor = (color: string) => {
    const newColors = filters.colors.includes(color)
      ? filters.colors.filter(c => c !== color)
      : [...filters.colors, color];
    updateFilters({ colors: newColors });
  };

  const resetFilters = () => {
    const reset = {
      categories: [],
      priceRange: [minPrice, maxPrice] as [number, number],
      colors: [],
      sortBy: 'name' as const,
      inStockOnly: false
    };
    setFilters(reset);
    onFilterChange(reset);
    setActiveFiltersCount(0);
  };

  const colorMap: { [key: string]: string } = {
    'Красный': 'bg-red-500',
    'Синий': 'bg-blue-500',
    'Зелёный': 'bg-green-500',
    'Жёлтый': 'bg-yellow-500',
    'Чёрный': 'bg-black',
    'Белый': 'bg-white border border-gray-300',
    'Серый': 'bg-gray-500',
    'Розовый': 'bg-pink-500',
    'Фиолетовый': 'bg-purple-500',
    'Оранжевый': 'bg-orange-500'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      {/* Кнопка открытия фильтров */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-gray-900 dark:text-white">Фильтры</span>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Панель фильтров */}
      {isOpen && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-6">
          {/* Сортировка */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Сортировка
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilters({ sortBy: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="name">По названию</option>
              <option value="price-asc">Цена: по возрастанию</option>
              <option value="price-desc">Цена: по убыванию</option>
              <option value="newest">Сначала новые</option>
            </select>
          </div>

          {/* Категории */}
          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Категории
              </label>
              <div className="space-y-2">
                {categories.map(category => (
                  <label
                    key={category}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category)}
                      onChange={() => toggleCategory(category)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Диапазон цен */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Диапазон цен
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={filters.priceRange[0]}
                  onChange={(e) => updateFilters({
                    priceRange: [parseInt(e.target.value) || 0, filters.priceRange[1]]
                  })}
                  placeholder="От"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <span className="text-gray-500 dark:text-gray-400">—</span>
                <input
                  type="number"
                  value={filters.priceRange[1]}
                  onChange={(e) => updateFilters({
                    priceRange: [filters.priceRange[0], parseInt(e.target.value) || maxPrice]
                  })}
                  placeholder="До"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {filters.priceRange[0].toLocaleString()} ₸ — {filters.priceRange[1].toLocaleString()} ₸
              </div>
            </div>
          </div>

          {/* Цвета */}
          {availableColors.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Цвета
              </label>
              <div className="flex flex-wrap gap-2">
                {availableColors.map(color => (
                  <button
                    key={color}
                    onClick={() => toggleColor(color)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                      filters.colors.includes(color)
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${colorMap[color] || 'bg-gray-400'}`} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{color}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Только в наличии */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={filters.inStockOnly}
                onChange={(e) => updateFilters({ inStockOnly: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Только в наличии</span>
            </label>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={resetFilters}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Сбросить
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Применить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
