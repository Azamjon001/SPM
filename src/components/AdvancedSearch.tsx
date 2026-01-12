import React, { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, Clock } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
  category?: string;
  image?: string;
}

interface AdvancedSearchProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
  placeholder?: string;
}

export default function AdvancedSearch({ products, onProductSelect, placeholder }: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Загружаем недавние поиски из localStorage
    const saved = localStorage.getItem('recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading recent searches:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Фильтруем продукты по запросу
    if (query.trim().length > 0) {
      const filtered = products
        .filter(p => 
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.category && p.category.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 8);
      setSuggestions(filtered);
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
    setSelectedIndex(-1);
  }, [query, products]);

  useEffect(() => {
    // Закрываем при клике вне компонента
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveRecentSearch = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recent-searches', JSON.stringify(updated));
  };

  const handleProductSelect = (product: Product) => {
    saveRecentSearch(product.name);
    setQuery('');
    setIsOpen(false);
    onProductSelect(product);
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    setIsOpen(true);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recent-searches');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleProductSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Поле поиска */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(query.length > 0 || recentSearches.length > 0)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Поиск товаров..."}
          className="w-full pl-12 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Выпадающий список */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Результаты поиска */}
          {suggestions.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 px-2">
                  Найдено: {suggestions.length}
                </p>
              </div>
              {suggestions.map((product, index) => (
                <button
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedIndex === index ? 'bg-gray-50 dark:bg-gray-700' : ''
                  }`}
                >
                  {/* Изображение товара */}
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <Search className="w-6 h-6 text-gray-400" />
                    </div>
                  )}

                  {/* Информация о товаре */}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {product.category && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {product.category}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {product.price.toLocaleString()} ₸
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length > 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Ничего не найдено</p>
            </div>
          ) : null}

          {/* Недавние поиски */}
          {!query && recentSearches.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Недавние поиски</p>
                </div>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Очистить
                </button>
              </div>
              <div className="p-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(search)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                  >
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{search}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
