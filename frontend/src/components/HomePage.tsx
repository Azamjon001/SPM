import { Check, Clock, Minus, Plus, Receipt, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { addCustomerOrder, cancelOrder, getOrdersByPhone, getProductsPaginated, getUserCart, saveUserCart, saveUserLikes } from '../utils/api';
import ApprovedAdsBanner from './ApprovedAdsBanner'; // 📢 Баннер утвержденных реклам
import BottomNavigation from './BottomNavigation';
import CompanyProfile from './CompanyProfile'; // 🏢 НОВОЕ: Профиль компании
import { ImageWithFallback } from './figma/ImageWithFallback';
import LoadingAnimation from './LoadingAnimation'; // 🎨 Анимация загрузки
import ProductCard from './ProductCard'; // 🖼️ НОВОЕ: Карточка товара с автоматическим листанием фото

import {
  getCachedProducts,
  isRAMUploadCompleted,
  setCachedProducts,
  shouldRefreshProducts,
  uploadAllDataToRAM
} from '../utils/localStorageCache'; // 🚀 НОВЫЙ ЛОКАЛЬНЫЙ КЭШ БРАУЗЕРА!
import { formatUzbekistanFullDateTime, getUzbekistanISOString } from '../utils/uzbekTime';
import DemoPaymentPage from './DemoPaymentPage';
import PaymentPage from './PaymentPage';
import type { DisplayMode, WeatherType } from './SettingsPage';

interface Product {
  id: number;
  name: string;
  quantity: number;
  price: number;
  markup_percent?: number;
  markup_amount?: number; // 💰 НОВОЕ: Сумма наценки в деньгах
  selling_price?: number; // 💰 НОВОЕ: Цена продажи с наценкой
  available_for_customers?: boolean;
  images?: Array<{ url: string; filepath: string; uploaded_at: string }>; // 📸 Изображения товара
  category?: string; // 📂 Категория товара
  barcode?: string; // 📊 Штрих-код товара
  company_id?: number; // 🏢 НОВОЕ: ID компании
  company_name?: string; // 🏢 НОВОЕ: Название компании
}

interface HomePageProps {
  onLogout: () => void;
  userName?: string;
  userPhone?: string;
  userCompanyId?: string; // 🔒 НОВОЕ: ID компании покупателя (приватный режим)
  onOpenSettings: () => void;
  onNavigateTo?: (page: 'likes') => void;
  onLikesChange?: (likedProductIds: number[]) => void;
  likedProductIds?: number[];
  setLikedProductIds?: (ids: number[] | ((prev: number[]) => number[])) => void;
  cart?: { [key: number]: number };
  setCart?: (cart: { [key: number]: number } | ((prev: { [key: number]: number }) => { [key: number]: number })) => void;
  selectedColors?: { [key: number]: string }; // 🎨 Выбранные цвета для товаров
  setSelectedColors?: (colors: { [key: number]: string } | ((prev: { [key: number]: string }) => { [key: number]: string })) => void;
}

export default function HomePage({ onLogout, userName, userPhone, userCompanyId, onOpenSettings, onNavigateTo, onLikesChange, likedProductIds = [], setLikedProductIds, cart: externalCart, setCart: externalSetCart, selectedColors: externalSelectedColors, setSelectedColors: externalSetSelectedColors }: HomePageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [internalCart, setInternalCart] = useState<{ [key: number]: number }>({});
  const [internalSelectedColors, setInternalSelectedColors] = useState<{ [key: number]: string }>({}); // 🎨 Цвета для товаров (внутреннее состояние)

  // Use external cart if provided, otherwise use internal state
  const cart = externalCart !== undefined ? externalCart : internalCart;
  const selectedColors = externalSelectedColors !== undefined ? externalSelectedColors : internalSelectedColors;
  const setSelectedColors = externalSetSelectedColors !== undefined ? externalSetSelectedColors : setInternalSelectedColors;
  const setCart = externalSetCart !== undefined ? externalSetCart : setInternalCart;
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);

  // 💳 Payment system states
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'manual_check' | 'demo_online' | 'real_online'>('manual_check');

  const [isUploadingRAM, setIsUploadingRAM] = useState(false); // 🚀 Предзагрузка данных в RAM
  const [uploadProgress, setUploadProgress] = useState({ step: '', progress: 0 }); // 📊 Прогресс предзагрузки
  const [loadingMore, setLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // 🔄 Ручное обновление данных
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const PRODUCTS_PER_PAGE = 50;

  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<{
    code: string;
    total: number;
    itemsCount: number;
    items?: Array<{ name: string; quantity: number; price: number; total: number; color?: string }>;
  } | null>(null);
  const [myOrders, setMyOrders] = useState<Array<{
    code: string;
    total: number;
    itemsCount: number;
    date: string;
    items: Array<{ name: string; quantity: number; price: number; total: number; color?: string }>;
    status?: string; // ⚡ НОВОЕ: статус заказа (pending, paid, cancelled)
    orderId?: number; // ⚡ НОВОЕ: ID заказа для отмены
  }>>(() => {
    // 🎨 Загружаем заказы из localStorage при инициализации
    const saved = localStorage.getItem('myOrders');
    return saved ? JSON.parse(saved) : [];
  });

  // 🗑️ НОВОЕ: Состояние для скрытых чеков (удалённых пользователем из своего списка)
  const [hiddenReceiptCodes, setHiddenReceiptCodes] = useState<string[]>(() => {
    const saved = localStorage.getItem(`hiddenReceipts_${userPhone}`);
    return saved ? JSON.parse(saved) : [];
  });

  // 🆕 НОВОЕ: Вкладка для чеков (pending или history)
  const [receiptsTab, setReceiptsTab] = useState<'pending' | 'history'>(() => {
    return (localStorage.getItem('receiptsTab') as 'pending' | 'history') || 'pending';
  });

  const [viewingImage, setViewingImage] = useState<{ url: string; name: string } | null>(null);
  const [viewingImageIndex, setViewingImageIndex] = useState(0); // 🆕 Индекс текущего изображения в карусели

  // 🏢 НОВОЕ: Состояние для просмотра профиля компании
  const [viewingCompanyId, setViewingCompanyId] = useState<number | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<number | null>(null); // 🆕 Подсвеченный товар для прокрутки

  // State for like animation
  const [likeAnimation, setLikeAnimation] = useState<{ productId: number; isLiked: boolean } | null>(null);

  // State to prevent multiple quick toggles
  const [isTogglingLike, setIsTogglingLike] = useState(false);

  // ⚡ НОВОЕ: Защита от множественных нажатий при оформлении заказа
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    return (localStorage.getItem('displayMode') as DisplayMode) || 'day';
  });

  const [weather, setWeather] = useState<WeatherType>(() => {
    const weathers: WeatherType[] = ['sunny', 'rain', 'snow', 'storm'];
    return weathers[Math.floor(Math.random() * weathers.length)];
  });

  const [weatherEnabled, setWeatherEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('weatherEnabled');
    return saved === null ? true : saved === 'true';
  });

  const [colorAnimationEnabled, setColorAnimationEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('colorAnimationEnabled');
    return saved === null ? true : saved === 'true';
  });

  // State for floating search button
  const [floatingSearchExpanded, setFloatingSearchExpanded] = useState(false);
  const [floatingSearchQuery, setFloatingSearchQuery] = useState('');

  // Ref for debounced search
  const searchTimeoutRef = useRef<number | null>(null);

  // Sync cart to Go API whenever it changes (NO localStorage)
  useEffect(() => {
    if (userPhone && Object.keys(cart).length >= 0) {
      console.log('💾 [Cart Sync] Syncing cart to Go API for:', userPhone);
      saveUserCart(userPhone, cart).catch(error => {
        console.error('❌ [Cart Sync] Failed to sync cart to Go API:', error);
      });
    }
  }, [cart, userPhone]);

  // 🎨 Save myOrders to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('myOrders', JSON.stringify(myOrders));
  }, [myOrders]);

  // Save likes to Go API (with debounce)
  useEffect(() => {
    // Notify parent component about likes change
    if (onLikesChange) {
      onLikesChange(likedProductIds);
    }

    // Sync likes to Go API if user is logged in (with debounce)
    if (userPhone) {
      const timeoutId = setTimeout(() => {
        console.log('💾 [Likes Sync] Saving likes to Go API...');
        saveUserLikes(userPhone, likedProductIds).catch(error => {
          console.error('❌ [Likes Sync] Failed to sync likes to Go API:', error);
        });
      }, 500); // Wait 500ms before saving to avoid too many requests

      return () => clearTimeout(timeoutId);
    }
  }, [likedProductIds, userPhone, onLikesChange]);

  // 🛒 POLLING: Автоматическое обновление заказов каждые 10 секунд
  const [ordersRefreshTrigger, setOrdersRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!userPhone) return;

    const pollOrders = setInterval(() => {
      setOrdersRefreshTrigger(prev => prev + 1);
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollOrders);
  }, [userPhone]);

  // Load cart and receipts from Go API on mount
  useEffect(() => {
    const loadUserData = async () => {
      if (userPhone) {
        try {
          // Load cart from Go API
          console.log('🔄 [Cart Sync] Loading cart from Go API for:', userPhone);
          const savedCart = await getUserCart(userPhone);
          if (savedCart && Object.keys(savedCart).length > 0) {
            console.log('✅ [Cart Sync] Cart loaded from Go API:', Object.keys(savedCart).length, 'items');
            setCart(savedCart);
          }

          // Load orders from Go API (from customer_orders table, not user_order_receipts!)
          console.log('🔄 [Orders Sync] Loading orders from customer_orders table for:', userPhone);
          const savedOrders = await getOrdersByPhone(userPhone);
          if (savedOrders && savedOrders.length > 0) {
            console.log('✅ [Orders Sync] Orders loaded from Go API:', savedOrders.length, 'orders');
            // Convert orders from API format to local format
            const formattedOrders = savedOrders.map((order: any) => ({
              code: order.order_code,
              total: order.total_amount,
              itemsCount: order.items?.length || 0,
              date: order.order_date,
              items: order.items || [], // 🎨 Items уже содержат color из customer_orders!
              status: order.status || 'pending', // 🎨 Добавляем статус
              orderId: order.id // 🎨 Добавляем ID заказа для отмены
            }));

            // 🗑️ НОВОЕ: Фильтруем скрытые чеки (удалённые пользователем)
            const hiddenCodes = JSON.parse(localStorage.getItem(`hiddenReceipts_${userPhone}`) || '[]');
            const visibleOrders = formattedOrders.filter((order: any) => !hiddenCodes.includes(order.code));

            console.log(`🗑️ [Orders Filter] Total: ${formattedOrders.length}, Hidden: ${hiddenCodes.length}, Visible: ${visibleOrders.length}`);

            setMyOrders(visibleOrders);
          }
        } catch (error) {
          console.error('❌ [Sync] Failed to load user data from Go API:', error);
        }
      }
    };

    loadUserData();
  }, [userPhone, ordersRefreshTrigger]); // 🛒 Автоматически обновляется при Realtime событиях!

  // ⚠️ REMOVED: Auto-clear cart on paid orders
  // Корзина теперь очищается СРАЗУ после оформления заказа!
  // useEffect(() => { ... }, [userPhone, cart]);

  // 🚀 ПРЕДЗАГРУЗКА ВСЕХ ДАННЫХ В RAM ПРИ ПЕРВОМ ВХОДЕ
  useEffect(() => {
    const initRAM = async () => {
      // Проверяем была ли уже предзагрузка
      if (!isRAMUploadCompleted()) {
        console.log('🚀 [HomePage] Первый вход! Начинаем предзагрузку данных в RAM...');
        setIsUploadingRAM(true);

        try {
          await uploadAllDataToRAM((step, progress) => {
            setUploadProgress({ step, progress });
          });
          console.log('✅ [HomePage] Предзагрузка завершена!');
        } catch (error) {
          console.error('❌ [HomePage] Ошибка предзагрузки:', error);
        } finally {
          setIsUploadingRAM(false);
        }
      } else {
        console.log('✅ [HomePage] Данные уже в RAM, предзагрузка не требуется');
      }
    };

    initRAM();
  }, []); // Выполняется только один раз при монтировании

  useEffect(() => {
    console.log('🔄 [HomePage] useEffect triggered with userCompanyId:', userCompanyId);
    loadProducts(true); // Force refresh when userCompanyId changes
    // 🔄 AUTO-REFRESH: Reload products every 5 MINUTES (оптимизация!)
    const interval = setInterval(() => {
      console.log('🔄 [HomePage] Auto-refresh products (every 5 min)');
      loadProducts(true); // Force refresh to get latest data
    }, 5 * 60 * 1000); // 5 минут вместо 30 секунд ✅

    // 🔔 СЛУШАЕМ СОБЫТИЕ ОБНОВЛЕНИЯ ТОВАРОВ!
    const handleProductsUpdate = () => {
      console.log('🔔 [HomePage] Получено уведомление об обновлении товаров!');
      loadProducts(); // Перезагружаем товары НЕМЕДЛЕННО!
    };
    window.addEventListener('productsUpdated', handleProductsUpdate);

    // 🔄 POLLING: Периодическое обновление данных вместо Realtime
    // Products polling уже выполняется через interval выше
    // SMM posts polling
    const smmPollInterval = setInterval(() => {
      console.log('📡 [Polling] Checking for SMM posts updates...');
      window.dispatchEvent(new Event('smmPostsUpdated'));
    }, 30000); // Poll every 30 seconds

    // Check if we should open cart after navigation from settings
    const shouldOpenCart = localStorage.getItem('openCartOnLoad');
    if (shouldOpenCart === 'true') {
      setShowCart(true);
      localStorage.removeItem('openCartOnLoad');
    }

    return () => {
      clearInterval(interval);
      clearInterval(smmPollInterval);
      window.removeEventListener('productsUpdated', handleProductsUpdate);
    };
  }, [userCompanyId]); // 🔒 ПРИВАТНОСТЬ: Перезагружаем товары при изменении company_id

  // 💳 Load payment configuration
  useEffect(() => {
    loadPaymentConfig();

    // Listen for payment mode changes
    const handlePaymentModeChange = (e: CustomEvent) => {
      setPaymentMode(e.detail);
    };
    window.addEventListener('paymentModeChanged', handlePaymentModeChange as EventListener);

    return () => {
      window.removeEventListener('paymentModeChanged', handlePaymentModeChange as EventListener);
    };
  }, []);

  useEffect(() => {
    // Auto change weather every 5 minutes
    const weatherInterval = setInterval(() => {
      const weathers: WeatherType[] = ['sunny', 'rain', 'snow', 'storm'];
      const newWeather = weathers[Math.floor(Math.random() * weathers.length)];
      setWeather(newWeather);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(weatherInterval);
  }, []);

  useEffect(() => {
    const handleDisplayModeChange = (e: CustomEvent) => {
      setDisplayMode(e.detail);
    };

    const handleOpenCart = () => {
      setShowCart(true);
    };

    const handleWeatherToggle = (e: CustomEvent) => {
      setWeatherEnabled(e.detail);
    };

    const handleColorAnimationToggle = (e: CustomEvent) => {
      setColorAnimationEnabled(e.detail);
    };

    window.addEventListener('displayModeChange', handleDisplayModeChange as EventListener);
    window.addEventListener('openCart', handleOpenCart as EventListener);
    window.addEventListener('weatherToggle', handleWeatherToggle as EventListener);
    window.addEventListener('colorAnimationToggle', handleColorAnimationToggle as EventListener);

    return () => {
      window.removeEventListener('displayModeChange', handleDisplayModeChange as EventListener);
      window.removeEventListener('openCart', handleOpenCart as EventListener);
      window.removeEventListener('weatherToggle', handleWeatherToggle as EventListener);
      window.removeEventListener('colorAnimationToggle', handleColorAnimationToggle as EventListener);
    };
  }, []);

  // 💳 Load payment configuration from backend
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

  const loadPaymentConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/payment-config`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setPaymentMode(data.config.mode || 'manual_check');
          console.log('💳 [Payment Config] Loaded:', data.config.mode);
        }
      }
    } catch (error) {
      console.error('Error loading payment config:', error);
      // Fallback to manual_check
      setPaymentMode('manual_check');
    }
  };

  const loadProducts = async (forceRefresh = false) => {
    try {
      console.log('🔒 [HomePage] Loading products with userCompanyId:', userCompanyId);

      // 🔒 ПРИВАТНОСТЬ: Для приватных покупателей НЕ используем кэш (всегда загружаем свежие данные)
      if (!userCompanyId) {
        // 🚀 ШАГ 1: Только для публичного режима - проверяем локальный кэш браузера
        const cached = getCachedProducts();
        if (cached && cached.length > 0 && !forceRefresh) {
          console.log(`⚡ [HomePage] МГНОВЕННАЯ загрузка из localStorage: ${cached.length} товаров`);

          // Filter products that are available for customers and have quantity > 0
          const filtered = cached.filter((p: Product) =>
            p.quantity > 0 && p.available_for_customers === true
          );
          setProducts(filtered);
          setLoading(false); // Убираем лоадер сразу!
        }
      }

      // 🚀 ШАГ 2: Проверяем нужно ли обновить кэш (по умолчанию каждые 5 минут)
      // Для приватных покупателей - всегда загружаем свежие данные
      if (shouldRefreshProducts(5) || forceRefresh || userCompanyId) {
        console.log('🔄 [HomePage] Загружаем свежие данные из Go API...');

        // 🔒 ПРИВАТНОСТЬ: Передаем companyId если это приватный покупатель
        const params: any = {
          availableOnly: true,
          limit: 1000 // Load all available products
        };

        if (userCompanyId) {
          // ✅ Преобразуем company_id (может быть строкой из БД) в число для API
          const companyIdNum = typeof userCompanyId === 'string' ? parseInt(userCompanyId) : userCompanyId;
          if (!isNaN(companyIdNum)) {
            params.companyId = companyIdNum;
            console.log('🔒 [HomePage] Приватный режим: загружаем товары компании ID =', params.companyId);
          } else {
            console.warn('⚠️ [HomePage] Невалидный company_id:', userCompanyId);
          }
        } else {
          console.log('🌍 [HomePage] Публичный режим: загружаем товары всех публичных компаний');
        }

        const data = await getProductsPaginated(params);
        console.log(`📦 [HomePage] Получено ${data.products.length} товаров из Go API`);

        // Filter products that are available for customers and have quantity > 0
        const filtered = data.products.filter((p: Product) =>
          p.quantity > 0 && p.available_for_customers === true
        );
        console.log(`✅ [HomePage] После фильтрации: ${filtered.length} товаров доступно для покупателей`);

        // 💾 Сохраняем в localStorage браузера ТОЛЬКО для публичного режима
        if (!userCompanyId) {
          setCachedProducts(data.products);
        }

        setProducts(filtered);
      } else {
        console.log('✅ [HomePage] Кэш свежий, пропускаем загрузку из Go API');
      }
    } catch (error) {
      console.error('❌ [HomePage] Ошибка загрузки товаров:', error);

      // Если ошибка API, используем кэш (только для публичного режима)
      if (!userCompanyId) {
        const cached = getCachedProducts();
        if (cached && cached.length > 0) {
          console.log(`🆘 [HomePage] Ошибка API, используем старый кэш из localStorage: ${cached.length} товаров`);
          const filtered = cached.filter((p: Product) =>
            p.quantity > 0 && p.available_for_customers === true
          );
          setProducts(filtered);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Ручное обновление данных (Pull-to-refresh или кнопка)
  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    console.log('🔄 [HomePage] Ручное обновление данных...');
    setIsRefreshing(true);
    try {
      await loadProducts(true); // Принудительная загрузка
      console.log('✅ [HomePage] Данные успешно обновлены!');
    } catch (error) {
      console.error('❌ [HomePage] Ошибка обновления:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500); // Небольшая задержка для UX
    }
  };

  const loadMoreProducts = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);

    try {
      // 🔒 ПРИВАТНОСТЬ: Передаем companyId если это приватный покупатель
      const params: any = {
        offset,
        limit: PRODUCTS_PER_PAGE,
        availableOnly: true
      };

      if (userCompanyId) {
        // ✅ Преобразуем company_id (может быть строкой из БД) в число для API
        const companyIdNum = typeof userCompanyId === 'string' ? parseInt(userCompanyId) : userCompanyId;
        if (!isNaN(companyIdNum)) {
          params.companyId = companyIdNum;
        }
      }

      const data = await getProductsPaginated(params);
      // Filter products that are available for customers and have quantity > 0
      const newProducts = data.products.filter((p: Product) =>
        p.quantity > 0 && p.available_for_customers === true
      );
      setProducts(prev => [...prev, ...newProducts]);
      setOffset(prev => prev + PRODUCTS_PER_PAGE);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, userCompanyId]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadProducts();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [debouncedSearchQuery]);

  // 🎨 Устанавливаем "Любой" цвет по умолчанию для всех товаров
  useEffect(() => {
    if (products.length > 0) {
      const newColors: { [key: number]: string } = { ...selectedColors };
      let hasChanges = false;

      products.forEach(product => {
        if (!newColors[product.id]) {
          newColors[product.id] = 'Любой';
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setSelectedColors(newColors);
      }
    }
  }, [products]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  const addToCart = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const currentInCart = cart[productId] || 0;
    if (currentInCart < product.quantity) {
      setCart(prev => ({
        ...prev,
        [productId]: currentInCart + 1
      }));

      // 🎨 Если цвет не выбран, устанавливаем "Любой" по умолчанию
      if (!selectedColors[productId]) {
        setSelectedColors(prev => ({
          ...prev,
          [productId]: 'Любой'
        }));
      }
    }
  };

  const removeFromCart = (productId: number) => {
    const currentInCart = cart[productId] || 0;
    if (currentInCart <= 1) {
      const newCart = { ...cart };
      delete newCart[productId];
      setCart(newCart);
    } else {
      setCart(prev => ({
        ...prev,
        [productId]: currentInCart - 1
      }));
    }
  };

  const updateCartQuantity = (productId: number, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const validQuantity = Math.max(0, Math.min(quantity, product.quantity));

    if (validQuantity === 0) {
      const newCart = { ...cart };
      delete newCart[productId];
      setCart(newCart);
    } else {
      setCart({ ...cart, [productId]: validQuantity });
    }
  };

  // 🆕 Обработчик клика на товар из профиля компании
  const handleProductClickFromProfile = (productId: number, companyId: number) => {
    console.log('🔍 [HomePage] ═══════════════════════════════════════');
    console.log('🔍 [HomePage] Поиск товара ID:', productId, 'компании ID:', companyId);
    console.log('🔍 [HomePage] ═══════════════════════════════════════');

    // Закрываем профиль компании
    setViewingCompanyId(null);

    // Подсвечиваем товар
    setHighlightedProductId(productId);
    console.log('✨ [HomePage] Товар подсвечен:', productId);

    // 🆕 ВСЕГДА убираем подсветку через 2 секунды
    setTimeout(() => {
      setHighlightedProductId(null);
      console.log('🔄 [HomePage] Подсветка товара убрана:', productId);
    }, 2000);

    // Ищем товар в списке и прокручиваем к нему
    setTimeout(() => {
      const productElement = document.getElementById(`product-${productId}`);
      if (productElement) {
        console.log('✅ [HomePage] Товар найден! Прокручиваем к элементу...');
        productElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        console.log('⚠️ [HomePage] Товар не найден на странице. ID:', `product-${productId}`);
        console.log('📋 [HomePage] Проверьте фильтры и убедитесь, что товар доступен');
      }
    }, 100);
  };

  const handleCheckout = async () => {
    if (isCheckingOut) return; // ⚡ Защита от множественных нажатий
    setIsCheckingOut(true);

    if (Object.keys(cart).length === 0) {
      alert('Корзина пуста!');
      setIsCheckingOut(false);
      return;
    }

    // 💳 Если режим онлайн оплаты (demo или real) - открываем страницу оплаты
    if (paymentMode === 'demo_online' || paymentMode === 'real_online') {
      console.log('💳 [Checkout] Opening payment page, mode:', paymentMode);
      setShowCart(false);
      setShowPayment(true);
      setIsCheckingOut(false);
      return;
    }

    // 💳 Режим manual_check - создаём чек как раньше

    // ⚡ ОПТИМИЗАЦИЯ: Используем УЖЕ загруженные products вместо повторного запроса!
    let totalAmount = 0;
    const purchasedItems: any[] = [];

    // Validate quantities
    for (const [productIdStr, purchasedQty] of Object.entries(cart)) {
      const productId = Number(productIdStr);
      const product = products.find((p: Product) => p.id === productId);

      if (!product) continue;

      // Check if enough quantity available
      if (product.quantity < purchasedQty) {
        alert(`Недостаточно товара "${product.name}". Доступно: ${product.quantity} шт.`);
        setIsCheckingOut(false);
        return;
      }

      // Calculate price with markup
      const priceWithMarkup = getPriceWithMarkup(product);
      const markupPercent = product.markup_percent || 0;
      const markupAmount = priceWithMarkup - product.price; // Amount of markup per item

      totalAmount += priceWithMarkup * purchasedQty;
      purchasedItems.push({
        id: product.id,
        name: product.name,
        quantity: purchasedQty,
        price: product.price, // Base price
        price_with_markup: priceWithMarkup, // Price with markup
        markup_percent: markupPercent, // Markup percentage
        markup_amount: markupAmount, // Markup amount per item
        total: priceWithMarkup * purchasedQty, // Total with markup
        color: product.has_color_options
          ? (selectedColors[productId] || 'Любой') // 🎨 Если у товара есть цвета и не выбран - "Любой"
          : null, // 🎨 Если у товара нет цветов - null
        image_url: product.images && product.images.length > 0 ? product.images[0].url : null // 🖼️ Первое изображение товара
      });

      // 🎨 Логирование цвета для дебага
      console.log(`🎨 [Checkout] Product ${product.name}:`, {
        has_color_options: product.has_color_options,
        selectedColor: selectedColors[productId],
        finalColor: product.has_color_options ? (selectedColors[productId] || 'Любой') : null
      });
    }

    if (purchasedItems.length === 0) {
      setIsCheckingOut(false);
      return;
    }

    try {
      // Create order with pending status (товары НЕ уменьшаются сразу!)
      const result = await addCustomerOrder({
        user_name: userName || 'Гость',
        user_phone: userPhone || '',
        items: purchasedItems,
        total_amount: totalAmount
      });

      const orderCode = result.order_code;
      const orderId = result.order_id; // ⚡ НОВОЕ: Получаем orderId

      // Add to my orders history
      const newOrder = {
        code: orderCode,
        total: totalAmount,
        itemsCount: purchasedItems.length,
        date: getUzbekistanISOString(),
        items: purchasedItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          color: item.color // 🎨 Сохраняем цвет
        })),
        status: 'pending', // ⚡ НОВОЕ: Статус по умолчанию
        orderId: orderId // ⚡ НОВОЕ: ID для отмены
      };

      // 🎨 Логирование заказа с цветами
      console.log('📝 [Order Created] New order items with colors:', newOrder.items);

      setMyOrders(prev => [newOrder, ...prev]);

      // ❌ УДАЛЕНО: Не сохраняем в user_order_receipts, так как данные уже в customer_orders!
      // Заказы загружаются из customer_orders через getOrdersByPhone()

      // ✅ ОЧИЩАЕМ КОРЗИНУ СРАЗУ ПОСЛЕ ОФОРМЛЕНИЯ ЗАКАЗА!
      setCart({});
      console.log('✅ [Cart] Заказ оформлен, корзина очищена!');
      console.log('🛒 [Cart] Корзина теперь пуста, можно оформить новый заказ');

      await loadProducts();
      setShowCart(false);

      // Show confirmation modal
      setConfirmedOrder({
        code: orderCode,
        total: totalAmount,
        itemsCount: purchasedItems.length,
        items: purchasedItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          color: item.color // 🎨 Передаем цвет в чек
        }))
      });
      setShowOrderConfirmation(true);
    } catch (error) {
      console.error('Error processing checkout:', error);
      alert('Ошибка при оформлении зааза');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' сум';
  };

  const getPriceWithMarkup = (product: Product) => {
    const markupPercent = product.markup_percent || 0;
    return product.price * (1 + markupPercent / 100);
  };

  const getTotalCart = () => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const product = products.find(p => p.id === Number(id));
      return sum + (product ? getPriceWithMarkup(product) * qty : 0);
    }, 0);
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  const toggleLike = (productId: number) => {
    if (isTogglingLike || !setLikedProductIds) return;
    setIsTogglingLike(true);

    setLikedProductIds(prev => {
      if (prev.includes(productId)) {
        // Remove from likes
        console.log('❤️ [Like] Removed product', productId, 'from likes');
        return prev.filter(id => id !== productId);
      } else {
        // Add to likes
        console.log('❤️ [Like] Added product', productId, 'to likes');
        return [...prev, productId];
      }
    });

    // Show like animation
    const wasLiked = likedProductIds.includes(productId);
    setLikeAnimation({ productId: productId, isLiked: !wasLiked });
    setTimeout(() => {
      setLikeAnimation(null);
      setIsTogglingLike(false);
    }, 1000);
  };

  // 🎨 Показываем новую анимацию загрузки при предзагрузке данных в RAM
  if (isUploadingRAM) {
    return <LoadingAnimation text={uploadProgress.step || 'Загрузка данных...'} />;
  }

  // 💳 Show payment page if needed
  if (showPayment) {
    // Convert cart to array format for payment pages
    const cartItems = Object.entries(cart).map(([productIdStr, quantity]) => {
      const productId = Number(productIdStr);
      const product = products.find(p => p.id === productId);
      if (!product) return null;

      const sellingPrice = getPriceWithMarkup(product);
      const basePrice = product.price;
      const markupPercent = product.markup_percent || 0;
      const markupAmount = sellingPrice - basePrice; // Наценка за 1 штуку

      return {
        id: product.id,
        name: product.name,
        price: sellingPrice, // ⚡ ЭТО УЖЕ SELLING_PRICE (цена с наценкой)!
        base_price: basePrice, // 💰 Базовая цена без наценки
        markup_percent: markupPercent, // 💰 Процент наценки
        markup_amount: markupAmount, // 💰 Сумма наценки за 1 штуку
        quantity,
        selectedColor: selectedColors[productId],
        image: product.images && product.images.length > 0 ? product.images[0].url : undefined
      };
    }).filter(Boolean) as any[];

    const totalPrice = getTotalCart();

    const handlePaymentSuccess = () => {
      // Clear cart
      setCart({});
      setShowPayment(false);

      // ⚡ ПРИНУДИТЕЛЬНО обновляем продукты после оплаты!
      loadProducts(true);

      alert('✅ Оплата успешна! Товары списаны со склада.');
    };

    if (paymentMode === 'demo_online') {
      return (
        <DemoPaymentPage
          cart={cartItems}
          totalPrice={totalPrice}
          userPhone={userPhone}
          userName={userName}
          onBack={() => {
            setShowPayment(false);
            setShowCart(true);
          }}
          onSuccess={handlePaymentSuccess}
        />
      );
    } else if (paymentMode === 'real_online') {
      return (
        <PaymentPage
          cart={cartItems}
          totalPrice={totalPrice}
          userPhone={userPhone}
          userName={userName}
          userId={userPhone}
          onBack={() => {
            setShowPayment(false);
            setShowCart(true);
          }}
          onSuccess={handlePaymentSuccess}
        />
      );
    }
  }

  return (
    <div className={`min-h-screen pb-20 relative transition-colors duration-500 ${displayMode === 'night' ? 'bg-gradient-to-b from-indigo-900 via-blue-900 to-slate-900' : 'bg-gradient-to-b from-blue-50 to-gray-50'
      }`}>
      {/* Header */}
      {!showCart && (
        <header className={`shadow-sm sticky top-0 z-20 transition-colors duration-500 ${displayMode === 'night' ? 'bg-indigo-800 text-white' : 'bg-white'
          }`}>
          <div className="container mx-auto px-4 py-4 relative">

          </div>
        </header>
      )}

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Shopping Cart Sidebar */}
        {showCart && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowCart(false)}>
            <div
              className={`absolute right-0 top-0 h-full w-full max-w-md shadow-xl transition-colors duration-500 ${displayMode === 'night' ? 'bg-slate-800' : 'bg-white'
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col h-full">
                {/* Cart Header */}

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* My Orders Section */}
                  {myOrders.length > 0 && (
                    <div className="mb-6 relative z-50">
                      <div className={`flex items-center gap-2 mb-4 transition-colors duration-500 ${displayMode === 'night' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        <Receipt className="w-5 h-5" />
                        <h3>Мои чеки ({myOrders.length})</h3>
                      </div>

                      {/* 🆕 Tabs for orders */}
                      <div className={`flex gap-2 mb-4 transition-colors duration-500 ${displayMode === 'night' ? 'bg-slate-700' : 'bg-gray-100'
                        } rounded-lg p-1`}>
                        <button
                          onClick={() => {
                            setReceiptsTab('pending');
                            localStorage.setItem('receiptsTab', 'pending');
                          }}
                          className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${receiptsTab === 'pending'
                              ? displayMode === 'night'
                                ? 'bg-orange-600 text-white'
                                : 'bg-orange-500 text-white'
                              : displayMode === 'night'
                                ? 'text-gray-300 hover:text-white'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                          Неподтверждённые ({myOrders.filter(o => o.status === 'pending').length})
                        </button>
                        <button
                          onClick={() => {
                            setReceiptsTab('history');
                            localStorage.setItem('receiptsTab', 'history');
                          }}
                          className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${receiptsTab === 'history'
                              ? displayMode === 'night'
                                ? 'bg-green-600 text-white'
                                : 'bg-green-500 text-white'
                              : displayMode === 'night'
                                ? 'text-gray-300 hover:text-white'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                          История ({myOrders.filter(o => o.status !== 'pending').length})
                        </button>
                      </div>

                      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                        {myOrders
                          .filter(order => {
                            return receiptsTab === 'pending'
                              ? order.status === 'pending'
                              : order.status !== 'pending';
                          })
                          .map((order, index) => (
                            <div key={index} className={`rounded-lg p-4 border-2 ${order.status === 'cancelled'
                                ? 'bg-red-50 border-red-300'
                                : order.status === 'paid'
                                  ? 'bg-green-50 border-green-300'
                                  : 'bg-orange-50 border-orange-300'
                              }`}>
                              {/* Order Status Badge */}
                              {order.status && (
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`px-3 py-1 rounded-full text-xs text-white ${order.status === 'cancelled'
                                      ? 'bg-red-600'
                                      : order.status === 'paid'
                                        ? 'bg-green-600'
                                        : 'bg-orange-600'
                                    }`}>
                                    {order.status === 'cancelled'
                                      ? 'ОТМЕНЁН'
                                      : order.status === 'paid'
                                        ? 'ОПЛАЧЕНО'
                                        : 'ОЖИДАЕТ ОПЛАТЫ'}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <div className="text-sm text-gray-600 mb-1">КОД ЗАКАЗА:</div>
                                  <div className={`text-2xl tracking-wider ${order.status === 'cancelled'
                                      ? 'text-red-600'
                                      : order.status === 'paid'
                                        ? 'text-green-600'
                                        : 'text-orange-600'
                                    }`}>{order.code}</div>
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatUzbekistanFullDateTime(order.date)}
                                </div>
                              </div>
                              <div className={`border-t pt-2 mb-2 ${order.status === 'cancelled'
                                  ? 'border-red-200'
                                  : order.status === 'paid'
                                    ? 'border-green-200'
                                    : 'border-orange-200'
                                }`}>
                                <div className="text-sm text-gray-700 space-y-1">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between">
                                      <span>
                                        {item.name} × {item.quantity}
                                        {item.color && (
                                          <span className="ml-1 text-xs text-purple-600">
                                            ({item.color})
                                          </span>
                                        )}
                                      </span>
                                      <span className="font-medium">{formatPrice(item.total)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className={`border-t pt-2 flex justify-between items-center ${order.status === 'cancelled'
                                  ? 'border-red-200'
                                  : order.status === 'paid'
                                    ? 'border-green-200'
                                    : 'border-orange-200'
                                }`}>
                                <span className="text-sm text-gray-600">Итого:</span>
                                <span className={`text-lg font-medium ${order.status === 'cancelled'
                                    ? 'text-red-600'
                                    : order.status === 'paid'
                                      ? 'text-green-600'
                                      : 'text-orange-600'
                                  }`}>{formatPrice(order.total)}</span>
                              </div>

                              {/* Cancel Button - Only for pending orders */}
                              {order.status === 'pending' && order.orderId && (
                                <div className="mt-3 pt-3 border-t border-orange-200">
                                  <button
                                    onClick={async () => {
                                      if (!confirm('Вы уверены, что хотите тменить этот за��аз?')) return;

                                      try {
                                        console.log(`🚫 [Cancel Order] Cancelling order ${order.orderId}...`);
                                        await cancelOrder(order.orderId!);

                                        // Update order status locally
                                        setMyOrders(prev => prev.map(o =>
                                          o.orderId === order.orderId
                                            ? { ...o, status: 'cancelled' }
                                            : o
                                        ));

                                        alert('✅ Заказ успешно отменён!');
                                      } catch (error) {
                                        console.error('❌ [Cancel Order] Error:', error);
                                        alert('Ошибка при отмене заказа');
                                      }
                                    }}
                                    className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                  >
                                    <X className="w-4 h-4" />
                                    Отменить заказ
                                  </button>
                                </div>
                              )}

                              {/* Delete Button - Only for paid orders (removes ONLY from user's cart view, NOT from database) */}
                              {order.status === 'paid' && (
                                <div className="mt-3 pt-3 border-t border-green-200">
                                  <button
                                    onClick={() => {
                                      if (!confirm('Удалить этот чек из корзины?\n\n⚠️ Чек останется в системе компании, удалится только из вашего списка.')) return;

                                      console.log(`🗑️ [Delete Receipt from Cart] Removing receipt ${order.code} from user view permanently...`);

                                      // 🗑️ ИСПРАВЛЕНО: Добавляем код чека в список скрытых и сохраняем в localStorage
                                      const newHiddenCodes = [...hiddenReceiptCodes, order.code];
                                      setHiddenReceiptCodes(newHiddenCodes);
                                      localStorage.setItem(`hiddenReceipts_${userPhone}`, JSON.stringify(newHiddenCodes));

                                      // Remove from visible orders
                                      setMyOrders(prev => prev.filter(o => o.code !== order.code));

                                      console.log(`✅ [Hidden Receipts] Added ${order.code} to hidden list. Total hidden: ${newHiddenCodes.length}`);
                                      alert('✅ Чек удалён из корзины!');
                                    }}
                                    className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Удалить из списка
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                      {/* Separator after receipts */}
                      <div className={`mt-6 border-t pt-6 transition-colors duration-500 ${displayMode === 'night' ? 'border-slate-700' : 'border-gray-200'
                        }`}></div>
                    </div>
                  )}

                  {Object.keys(cart).length === 0 && myOrders.length === 0 ? (
                    <div className={`text-center py-12 transition-colors duration-500 ${displayMode === 'night' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      <ShoppingCart className={`w-16 h-16 mx-auto mb-4 transition-colors duration-500 ${displayMode === 'night' ? 'text-gray-600' : 'text-gray-300'
                        }`} />
                      <p>Корзина пуста</p>
                    </div>
                  ) : Object.keys(cart).length > 0 && (
                    <div>
                      {/* Receipt Preview */}
                      <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-2 mb-3 text-orange-700">
                          <Receipt className="w-5 h-5" />
                          <span className="font-medium">Предпросмотр чека</span>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                            <div className="text-sm text-gray-600">
                              <div className="flex items-center gap-2 mb-1">
                                👤 {userName || 'Гость'}
                              </div>
                              {userPhone && (
                                <div className="text-xs text-gray-500">
                                  📱 {userPhone}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatUzbekistanFullDateTime(getUzbekistanISOString())}
                            </div>
                          </div>
                          <div className="space-y-2 mb-3">
                            {Object.entries(cart).map(([productId, quantity]) => {
                              const product = products.find(p => p.id === Number(productId));
                              if (!product) return null;
                              const priceWithMarkup = getPriceWithMarkup(product);
                              const selectedColor = selectedColors[Number(productId)];
                              return (
                                <div key={productId} className="flex justify-between text-sm">
                                  <span className="text-gray-700">
                                    {product.name} × {quantity}
                                    {selectedColor && (
                                      <span className="ml-1 text-xs text-purple-600">
                                        ({selectedColor})
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-gray-900 font-medium">
                                    {formatPrice(priceWithMarkup * quantity)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="border-t border-gray-200 pt-3 flex justify-between">
                            <span className="font-medium">Итого:</span>
                            <span className="text-lg font-medium text-orange-600">
                              {formatPrice(getTotalCart())}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cart Items Edit */}
                      <div className="space-y-4">
                        <div className={`text-sm mb-2 transition-colors duration-500 ${displayMode === 'night' ? 'text-gray-400' : 'text-gray-600'
                          }`}>Редактировать товары:</div>
                        {Object.entries(cart).map(([productId, quantity]) => {
                          const product = products.find(p => p.id === Number(productId));
                          if (!product) return null;

                          return (
                            <div key={productId} className={`rounded-lg p-4 transition-colors duration-500 ${displayMode === 'night' ? 'bg-slate-700' : 'bg-gray-50'
                              }`}>
                              <div className="flex justify-between mb-2">
                                <div>
                                  <h3 className={`text-sm transition-colors duration-500 ${displayMode === 'night' ? 'text-white' : ''
                                    }`}>{product.name}</h3>
                                  {selectedColors[Number(productId)] && (
                                    <div className="text-xs text-purple-600 mt-0.5">
                                      🎨 Цвет: {selectedColors[Number(productId)]}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    const newCart = { ...cart };
                                    delete newCart[Number(productId)];
                                    setCart(newCart);
                                    // 🎨 Очистим выбранный цвет при удалении из корзины
                                    setSelectedColors(prev => {
                                      const newColors = { ...prev };
                                      delete newColors[Number(productId)];
                                      return newColors;
                                    });
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className={`text-sm mb-2 transition-colors duration-500 ${displayMode === 'night' ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                {formatPrice(getPriceWithMarkup(product))} × {quantity} = {formatPrice(getPriceWithMarkup(product) * quantity)}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => removeFromCart(Number(productId))}
                                  className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${displayMode === 'night' ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-200 hover:bg-gray-300'
                                    }`}
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <input
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => updateCartQuantity(Number(productId), parseInt(e.target.value) || 0)}
                                  className={`w-16 text-center border rounded py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-500 ${displayMode === 'night' ? 'bg-slate-600 text-white border-slate-500' : 'border-gray-300'
                                    }`}
                                  min="0"
                                  max={product.quantity}
                                />
                                <button
                                  onClick={() => addToCart(Number(productId))}
                                  className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${displayMode === 'night' ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-200 hover:bg-gray-300'
                                    }`}
                                  disabled={quantity >= product.quantity}
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cart Footer */}
                {Object.keys(cart).length > 0 && (
                  <div className={`border-t p-6 pb-24 transition-colors duration-500 ${displayMode === 'night' ? 'bg-transparent border-slate-700' : 'bg-transparent border-gray-200'
                    }`}>
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className={`transition-colors duration-500 ${displayMode === 'night' ? 'text-gray-300' : 'text-gray-600'
                          }`}>Итого:</span>
                        <span className={`text-2xl transition-colors duration-500 ${displayMode === 'night' ? 'text-blue-400' : 'text-blue-600'
                          }`}>{formatPrice(getTotalCart())}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-3">
                      <button
                        onClick={handleCheckout}
                        disabled={isCheckingOut}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg transition-colors ${isCheckingOut
                            ? 'bg-gray-400 cursor-not-allowed'
                            : paymentMode === 'manual_check'
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg'
                          } text-white`}
                      >
                        <Check className="w-5 h-5" />
                        {isCheckingOut
                          ? 'Обработка...'
                          : paymentMode === 'manual_check'
                            ? 'Оформить заказ'
                            : paymentMode === 'demo_online'
                              ? '💳 Оплатить онлайн (демо)'
                              : '💳 Оплатить онлайн'
                        }
                      </button>

                      <button
                        onClick={() => {
                          if (confirm('Вы уверены, что хотите очистить корзину?\n\nОчищайте корзину только после подтверждения оплаты компанией!')) {
                            console.log('🗑️ [Cart] Корзина очищена вручную пользователем');
                            setCart({});
                          }
                        }}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg transition-colors ${displayMode === 'night'
                            ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                      >
                        <X className="w-5 h-5" />
                        Очистить корзину
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 📢 Рекламный баннер */}
        {!showCart && <ApprovedAdsBanner />}

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className={`rounded-lg shadow-sm p-12 transition-colors duration-500 ${displayMode === 'night' ? 'bg-slate-800' : 'bg-white'
              }`}>
              <ShoppingCart className={`w-16 h-16 mx-auto mb-4 ${displayMode === 'night' ? 'text-gray-600' : 'text-gray-300'
                }`} />
              <p className={displayMode === 'night' ? 'text-gray-300' : 'text-gray-500'}>Загрузка товаров...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className={`rounded-lg shadow-sm p-12 transition-colors duration-500 ${displayMode === 'night' ? 'bg-slate-800' : 'bg-white'
              }`}>
              <ShoppingCart className={`w-16 h-16 mx-auto mb-4 ${displayMode === 'night' ? 'text-gray-600' : 'text-gray-300'
                }`} />
              <p className={displayMode === 'night' ? 'text-gray-300' : 'text-gray-500'}>
                {searchQuery ? 'Товары не найдены' : 'Пока нет товаров в наличии'}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 md:gap-7">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                displayMode={displayMode}
                colorAnimationEnabled={colorAnimationEnabled}
                highlightedProductId={highlightedProductId}
                isLiked={likedProductIds.includes(product.id)}
                cartQuantity={cart[product.id]}
                likeAnimation={likeAnimation}
                formatPrice={formatPrice}
                getPriceWithMarkup={getPriceWithMarkup}
                onToggleLike={(productId) => {
                  if (!isTogglingLike) {
                    toggleLike(productId);
                  }
                }}
                onViewImage={(url, name, index) => {
                  setViewingImage({ url, name });
                  setViewingImageIndex(index);
                }}
                onViewCompany={(companyId) => setViewingCompanyId(companyId)}
                onDoubleClick={() => {
                  if (!isTogglingLike) {
                    toggleLike(product.id);
                  }
                }}
              >
                {/* Кнопка добавления в корзину */}
                <button
                  onClick={() => addToCart(product.id)}
                  disabled={
                    product.quantity === 0 ||
                    (cart[product.id] && cart[product.id] >= product.quantity)
                  }
                  className={`mt-auto w-full py-2 px-4 rounded-lg transition-colors ${product.quantity === 0 || (cart[product.id] && cart[product.id] >= product.quantity)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : displayMode === 'night'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span>{cart[product.id] ? 'Ещё' : 'В корзину'}</span>
                  </div>
                </button>
              </ProductCard>
            ))}
          </div>
        )}

        {/* Order Confirmation Modal */}
        {showOrderConfirmation && confirmedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="bg-green-600 text-white p-4 rounded-t-lg">
                <div className="flex items-center justify-center mb-1">
                  <Check className="w-8 h-8" />
                </div>
                <h2 className="text-center text-lg">Заказ успешно оформлен!</h2>
              </div>

              {/* Body */}
              <div className="p-4">
                <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3 mb-3">
                  <div className="text-center mb-3">
                    <div className="text-xs text-gray-600 mb-1">КОД ЗАКАЗА:</div>
                    <div className="text-2xl text-orange-600 tracking-wider mb-1">{confirmedOrder.code}</div>
                  </div>
                  <div className="border-t border-orange-200 pt-2 space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600">💰 Сумма:</span>
                      <span className="font-medium">{formatPrice(confirmedOrder.total)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600">📦 Товаров:</span>
                      <span className="font-medium">{confirmedOrder.itemsCount}</span>
                    </div>
                  </div>
                </div>

                {/* 🎨 Список товаров с цветами */}
                {confirmedOrder.items && confirmedOrder.items.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                    <div className="text-xs font-medium text-gray-700 mb-2">📋 Детали заказа:</div>
                    <div className="space-y-1">
                      {confirmedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-gray-700">
                            {item.name} × {item.quantity}
                            {item.color && (
                              <span className="ml-1 text-xs text-purple-600 font-medium">
                                ({item.color})
                              </span>
                            )}
                          </span>
                          <span className="font-medium text-gray-800">{formatPrice(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <div className="text-xs text-gray-700 space-y-1.5">
                    <p className="flex items-start gap-1.5">
                      <span>🏪</span>
                      <span>Приходите в магазин с этим чеком и оплатите товары наличными.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span>💬</span>
                      <span>Назовите код заказа: <strong>{confirmedOrder.code}</strong></span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span>✅</span>
                      <span>После оплаты компания подтвердит ваш заказ.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span>🛒</span>
                      <span><strong>Товары остаются в корзине</strong> до подтверждения оплаты компанией.</span>
                    </p>
                  </div>
                </div>

                <div className="text-center text-xs text-gray-600 mb-3">
                  Спасибо за покупку! Вы можете очистить корзину вручную после подтверждения.
                </div>

                <button
                  onClick={() => setShowOrderConfirmation(false)}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ОК
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        currentPage={showCart ? 'cart' : 'home'}
        cartItemsCount={Object.values(cart).reduce((sum, qty) => sum + qty, 0)}
        likesCount={likedProductIds.filter(id => {
          const product = products.find(p => p.id === id);
          return product && product.quantity > 0;
        }).length}
        onNavigate={(page) => {
          if (page === 'settings') {
            onOpenSettings();
          } else if (page === 'cart') {
            setShowCart(true);
          } else if (page === 'home') {
            setShowCart(false);
          } else if (page === 'likes') {
            onNavigateTo && onNavigateTo('likes');
          }
        }}
      />

      {/* Image Viewer Modal */}
      {viewingImage && (() => {
        // Найдем товар с этим изображением
        const product = products.find(p =>
          p.images && p.images.some(img => img.url === viewingImage.url)
        );
        const allImages = product?.images || [viewingImage];
        const currentImage = allImages[viewingImageIndex] || viewingImage;

        return (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4"
            onClick={() => {
              setViewingImage(null);
              setViewingImageIndex(0);
            }}
          >
            <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
              {/* Close button */}
              <button
                onClick={() => {
                  setViewingImage(null);
                  setViewingImageIndex(0);
                }}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 text-xl"
              >
                ✕ Закрыть
              </button>

              {/* Image */}
              <div className="bg-white rounded-lg overflow-hidden">
                <ImageWithFallback
                  src={typeof currentImage === 'string' ? currentImage : currentImage.url}
                  alt={viewingImage.name}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
                <div className="p-4 bg-gray-50 border-t">
                  <h3 className="text-center mb-2">{viewingImage.name}</h3>

                  {/* Navigation arrows for multiple images */}
                  {allImages.length > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-3">
                      <button
                        onClick={() => setViewingImageIndex(prev => prev > 0 ? prev - 1 : allImages.length - 1)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                      >
                        ← Назад
                      </button>
                      <span className="text-sm text-gray-600">
                        {viewingImageIndex + 1} / {allImages.length}
                      </span>
                      <button
                        onClick={() => setViewingImageIndex(prev => prev < allImages.length - 1 ? prev + 1 : 0)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                      >
                        Вперёд →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🏢 НОВОЕ: Модальное окно профиля компании */}
      {viewingCompanyId && userPhone && (
        <CompanyProfile
          companyId={viewingCompanyId}
          customerId={userPhone}
          onClose={() => setViewingCompanyId(null)}
          onProductClick={handleProductClickFromProfile}
        />
      )}

      {/* Floating Search Button - Fixed position */}
      {!showCart && (
        <div
          className={`fixed bottom-24 right-4 z-30 flex items-center transition-all duration-300 ${floatingSearchExpanded ? 'w-72' : 'w-14'
            }`}
        >
          {floatingSearchExpanded ? (
            <div className={`w-full flex items-center gap-2 rounded-full shadow-lg transition-colors duration-500 ${displayMode === 'night' ? 'bg-slate-800' : 'bg-white'
              } p-2`}>
              <Search className={`w-5 h-5 ml-2 flex-shrink-0 ${displayMode === 'night' ? 'text-gray-400' : 'text-gray-600'
                }`} />
              <input
                type="text"
                placeholder="Поиск..."
                value={floatingSearchQuery}
                onChange={(e) => {
                  setFloatingSearchQuery(e.target.value);
                  if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current);
                  }
                  searchTimeoutRef.current = setTimeout(() => {
                    setDebouncedSearchQuery(e.target.value);
                  }, 300);
                }}
                className={`flex-1 bg-transparent focus:outline-none transition-colors duration-500 ${displayMode === 'night' ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
                  }`}
                autoFocus
              />
              <button
                onClick={() => {
                  setFloatingSearchExpanded(false);
                  setFloatingSearchQuery('');
                }}
                className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${displayMode === 'night' ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                  }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setFloatingSearchExpanded(true)}
              className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 ${displayMode === 'night' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              <Search className="w-6 h-6 text-white" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}