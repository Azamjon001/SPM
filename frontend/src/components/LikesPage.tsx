import { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Search } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { getProducts, getUserLikes, saveUserLikes } from '../utils/api';
import BottomNavigation from './BottomNavigation';
import ProductCard from './ProductCard'; // 🖼️ НОВОЕ: Карточка товара с автоматическим листанием фото
import type { DisplayMode, WeatherType } from './SettingsPage';
import { 
  FallingStars, 
  CloudsAnimation, 
  SnowAnimation, 
  RainAnimation, 
  StormAnimation, 
} from './WeatherAnimations';

interface Product {
  id: number;
  name: string;
  quantity: number;
  price: number;
  markup_percent?: number;
  available_for_customers?: boolean;
  images?: Array<{ url: string; filepath: string; uploaded_at: string }>; // 📸 Изображения товара
  has_color_options?: boolean; // 🎨 Есть ли выбор цвета у товара
}

interface LikesPageProps {
  likedProductIds: number[];
  setLikedProductIds: (ids: number[] | ((prev: number[]) => number[])) => void;
  cart: { [key: number]: number };
  setCart: (cart: { [key: number]: number } | ((prev: { [key: number]: number }) => { [key: number]: number })) => void;
  selectedColors: { [key: number]: string }; // 🎨 Выбранные цвета для товаров
  setSelectedColors: (colors: { [key: number]: string } | ((prev: { [key: number]: string }) => { [key: number]: string })) => void;
  onBackToHome: () => void;
  onLogout: () => void;
  userName?: string;
  userPhone?: string;
  viewingImage: { url: string; name: string } | null;
  setViewingImage: (image: { url: string; name: string } | null) => void;
  viewingImageIndex: number; // 🆕 Индекс текущего изображения в карусели
  setViewingImageIndex: (index: number | ((prev: number) => number)) => void; // 🆕 Функция установки индекса
  onNavigateTo?: (page: 'home' | 'cart' | 'settings') => void;
}

export default function LikesPage({ 
  likedProductIds,
  setLikedProductIds,
  cart,
  setCart,
  selectedColors,
  setSelectedColors,
  onBackToHome,
  onLogout,
  userName,
  userPhone,
  viewingImage,
  setViewingImage,
  viewingImageIndex,
  setViewingImageIndex,
  onNavigateTo
}: LikesPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // State for like animation
  const [likeAnimation, setLikeAnimation] = useState<number | null>(null);
  
  // State to prevent multiple quick toggles
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  
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

  useEffect(() => {
    loadProducts();
    // Reload products every 5 seconds
    const interval = setInterval(loadProducts, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Auto change weather every 5 minutes
    const weatherInterval = setInterval(() => {
      const weathers: WeatherType[] = ['sunny', 'rain', 'snow', 'storm'];
      const newWeather = weathers[Math.floor(Math.random() * weathers.length)];
      setWeather(newWeather);
    }, 5 * 60 * 1000);

    return () => clearInterval(weatherInterval);
  }, []);

  useEffect(() => {
    const handleDisplayModeChange = (e: CustomEvent) => {
      setDisplayMode(e.detail);
    };

    const handleWeatherToggle = (e: CustomEvent) => {
      setWeatherEnabled(e.detail);
    };

    const handleColorAnimationToggle = (e: CustomEvent) => {
      setColorAnimationEnabled(e.detail);
    };

    window.addEventListener('displayModeChange', handleDisplayModeChange as EventListener);
    window.addEventListener('weatherToggle', handleWeatherToggle as EventListener);
    window.addEventListener('colorAnimationToggle', handleColorAnimationToggle as EventListener);

    return () => {
      window.removeEventListener('displayModeChange', handleDisplayModeChange as EventListener);
      window.removeEventListener('weatherToggle', handleWeatherToggle as EventListener);
      window.removeEventListener('colorAnimationToggle', handleColorAnimationToggle as EventListener);
    };
  }, []);
  
  // Sync likes to Supabase when they change
  useEffect(() => {
    if (userPhone && likedProductIds) {
      const timeoutId = setTimeout(() => {
        console.log('💾 [Likes Page Sync] Saving likes to Supabase...');
        saveUserLikes(userPhone, likedProductIds).catch(error => {
          console.error('❌ [Likes Page Sync] Failed to sync likes to Supabase:', error);
        });
      }, 500); // Wait 500ms before saving to avoid too many requests
      
      return () => clearTimeout(timeoutId);
    }
  }, [likedProductIds, userPhone]);

  const loadProducts = async () => {
    try {
      const productsData = await getProducts();
      setProducts(productsData.filter((p: Product) => 
        p.quantity > 0 && p.available_for_customers === true
      ));
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter products to show only liked ones
  const likedProducts = products.filter(product => likedProductIds.includes(product.id));
  
  // Apply search filter
  const filteredProducts = likedProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' сум';
  };

  const getPriceWithMarkup = (product: Product) => {
    const markupPercent = product.markup_percent || 0;
    return product.price * (1 + markupPercent / 100);
  };

  const addToCart = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const currentInCart = cart[productId] || 0;
    if (currentInCart < product.quantity) {
      setCart(prev => ({
        ...prev,
        [productId]: currentInCart + 1
      }));
    }
  };

  return (
    <div className={`min-h-screen pb-20 relative transition-colors duration-500 ${
      displayMode === 'night' ? 'bg-gradient-to-b from-indigo-900 via-blue-900 to-slate-900' : 'bg-gradient-to-b from-blue-50 to-gray-50'
    }`}>
      {/* Weather Animations - Only show if enabled */}
      {weatherEnabled && displayMode === 'night' && <FallingStars />}
      
      {/* Clouds - Only show if weather enabled */}
      {weatherEnabled && <CloudsAnimation isDark={displayMode === 'night'} />}
      
      {/* Weather effects - Only show if enabled */}
      {weatherEnabled && weather === 'snow' && <SnowAnimation />}
      {weatherEnabled && weather === 'rain' && <RainAnimation />}
      {weatherEnabled && weather === 'storm' && <StormAnimation />}
      
      {/* Header */}
      <header className={`shadow-sm sticky top-0 z-20 transition-colors duration-500 ${
        displayMode === 'night' ? 'bg-indigo-800 text-white' : 'bg-white'
      }`}>
        <div className="container mx-auto px-4 py-4 relative">
          {/* Солнце и луна убраны */}
          
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-500 fill-current" />
            <h1 className={displayMode === 'night' ? 'text-white' : ''}>Избранное</h1>
          </div>
          {likedProductIds.length > 0 && (
            <p className={`text-sm ${displayMode === 'night' ? 'text-blue-200' : 'text-gray-600'}`}>
              {likedProductIds.length} {likedProductIds.length === 1 ? 'товар' : 'товаров'}
            </p>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Search Bar */}
        {likedProductIds.length > 0 && (
          <div className="mb-6">
            <div className={`relative transition-colors duration-500 ${
              displayMode === 'night' ? 'bg-slate-800 border-slate-700' : 'bg-white'
            } rounded-xl shadow-sm border`}>
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                displayMode === 'night' ? 'text-gray-400' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder="Поиск в избранном..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-colors duration-500 ${
                  displayMode === 'night' 
                    ? 'bg-slate-800 text-white placeholder-gray-400 focus:ring-blue-500' 
                    : 'bg-white focus:ring-blue-500'
                }`}
              />
            </div>
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className={`rounded-lg shadow-sm p-12 transition-colors duration-500 ${
              displayMode === 'night' ? 'bg-slate-800' : 'bg-white'
            }`}>
              <Heart className={`w-16 h-16 mx-auto mb-4 ${
                displayMode === 'night' ? 'text-gray-600' : 'text-gray-300'
              }`} />
              <p className={displayMode === 'night' ? 'text-gray-300' : 'text-gray-500'}>Загрузка...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className={`rounded-lg shadow-sm p-12 transition-colors duration-500 ${
              displayMode === 'night' ? 'bg-slate-800' : 'bg-white'
            }`}>
              <Heart className={`w-16 h-16 mx-auto mb-4 ${
                displayMode === 'night' ? 'text-gray-600' : 'text-gray-300'
              }`} />
              <p className={`mb-2 ${displayMode === 'night' ? 'text-gray-300' : 'text-gray-500'}`}>
                {searchQuery ? 'Товары не найдены' : 'Нет избранных товаров'}
              </p>
              {!searchQuery && (
                <p className={`text-sm ${displayMode === 'night' ? 'text-gray-400' : 'text-gray-400'}`}>
                  Добавьте товары в избранное, нажав на иконку ❤️ на карточке товара
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                displayMode={displayMode}
                colorAnimationEnabled={colorAnimationEnabled}
                highlightedProductId={null}
                isLiked={true} // Всегда true на странице лайков
                cartQuantity={cart[product.id]}
                likeAnimation={likeAnimation === product.id ? { productId: product.id, isLiked: false } : null}
                formatPrice={formatPrice}
                getPriceWithMarkup={getPriceWithMarkup}
                onToggleLike={(productId) => {
                  if (!isTogglingLike) {
                    setIsTogglingLike(true);
                    setLikedProductIds(prev => prev.filter(id => id !== productId));
                    setTimeout(() => setIsTogglingLike(false), 500);
                  }
                }}
                onViewImage={(url, name, index) => {
                  setViewingImage({ url, name });
                  setViewingImageIndex(index);
                }}
                onViewCompany={() => {}} // Нет функционала просмотра компании на странице лайков
                onDoubleClick={() => {
                  if (!isTogglingLike) {
                    setIsTogglingLike(true);
                    
                    // Remove from likes on double click
                    setLikedProductIds(prev => prev.filter(id => id !== product.id));
                    
                    // Show like animation (removing)
                    setLikeAnimation(product.id);
                    setTimeout(() => {
                      setLikeAnimation(null);
                      setIsTogglingLike(false);
                    }, 1000);
                  }
                }}
              >
                {/* 🎨 Новая анимированная кнопка */}
                <div className="mt-auto">
                  <AnimatedCartButton
                    onClick={() => addToCart(product.id)}
                    disabled={
                      product.quantity === 0 || 
                      (cart[product.id] && cart[product.id] >= product.quantity)
                    }
                    isAdded={!!cart[product.id]}
                    text={cart[product.id] ? 'Ещё' : 'В корзину'}
                    addedText="Добавлено"
                  />
                </div>
              </ProductCard>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentPage="likes"
        cartItemsCount={Object.values(cart).reduce((acc, val) => acc + val, 0)}
        likesCount={likedProductIds.filter(id => {
          const product = products.find(p => p.id === id);
          return product && product.quantity > 0;
        }).length}
        onNavigate={(page) => {
          if (page === 'likes') {
            // Already on likes page, do nothing
            return;
          }
          
          if (onNavigateTo) {
            onNavigateTo(page);
          }
        }}
      />

      {/* Image Viewer Modal */}
      {viewingImage && (() => {
        // Найдем товар с которым связано изображение
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
              <button
                onClick={() => {
                  setViewingImage(null);
                  setViewingImageIndex(0);
                }}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 text-xl"
              >
                ✕ Закрыть
              </button>
              
              <div className="bg-white rounded-lg overflow-hidden">
                <ImageWithFallback
                  src={currentImage.url}
                  alt={viewingImage.name}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
                <div className="p-4 bg-gray-50 border-t">
                  <h3 className="text-center mb-2">{viewingImage.name}</h3>
                  
                  {/* 📸 Навигация по изображениям (если их больше одного) */}
                  {allImages.length > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-3">
                      <button
                        onClick={() => setViewingImageIndex(prev => prev > 0 ? prev - 1 : allImages.length - 1)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                      >
                        ‹ Назад
                      </button>
                      <span className="text-sm text-gray-600">
                        {viewingImageIndex + 1} / {allImages.length}
                      </span>
                      <button
                        onClick={() => setViewingImageIndex(prev => prev < allImages.length - 1 ? prev + 1 : 0)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                      >
                        Вперед ›
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}