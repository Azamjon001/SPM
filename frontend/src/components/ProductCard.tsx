import { useState, useEffect, useRef } from 'react';
import { Heart, Camera, BadgeCheck, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductImage {
  url: string;
  id?: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
  markup_percent?: number;
  images?: ProductImage[];
  company_name?: string;
  company_id?: number;
}

interface ProductCardProps {
  product: Product;
  displayMode: string;
  colorAnimationEnabled: boolean;
  highlightedProductId: number | null;
  isLiked: boolean;
  cartQuantity?: number;
  likeAnimation?: { productId: number; isLiked: boolean } | null;
  formatPrice: (price: number) => string;
  getPriceWithMarkup: (product: Product) => number;
  onToggleLike: (productId: number) => void;
  onViewImage: (url: string, name: string, index: number) => void;
  onViewCompany: (companyId: number) => void;
  onDoubleClick: () => void;
  children?: React.ReactNode; // Для кнопок добавления в корзину
}

export default function ProductCard({
  product,
  displayMode,
  colorAnimationEnabled,
  highlightedProductId,
  isLiked,
  cartQuantity,
  likeAnimation,
  formatPrice,
  getPriceWithMarkup,
  onToggleLike,
  onViewImage,
  onViewCompany,
  onDoubleClick,
  children,
}: ProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // 👆 Swipe/Drag detection
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const images = product.images || [];
  const hasMultipleImages = images.length > 1;

  // Минимальное расстояние свайпа (в пикселях)
  const minSwipeDistance = 50;

  // 🎯 Автоматическое листание с случайной задержкой
  useEffect(() => {
    if (!hasMultipleImages) return;

    // Случайная задержка от 0 до 2000ms для каждой карточки
    const randomDelay = Math.random() * 2000;

    const startAutoPlay = () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
      
      autoPlayTimerRef.current = setInterval(() => {
        if (!isPaused) {
          setDirection('next');
          setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }
      }, 3000); // Смена каждые 3 секу��ды
    };

    // Запускаем с задержкой
    const initialTimer = setTimeout(startAutoPlay, randomDelay);

    return () => {
      clearTimeout(initialTimer);
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
    };
  }, [hasMultipleImages, images.length, isPaused]);

  // 🛑 Функция паузы автоматического листания на 10 секунд
  const pauseAutoPlay = () => {
    setIsPaused(true);
    
    // Очищаем предыдущий таймер паузы если есть
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }
    
    // Возобновляем через 10 секунд
    pauseTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 10000);
  };

  // 🖱️ Ручное листание
  const goToPrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasMultipleImages) return;
    
    pauseAutoPlay(); // Останавливаем автоматическое листание на 10 сек
    setDirection('prev');
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasMultipleImages) return;
    
    pauseAutoPlay(); // Останавливаем автоматическое листание на 10 сек
    setDirection('next');
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  // 🎯 Переход к конкретному изображению через dots
  const goToImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === currentImageIndex) return;
    
    pauseAutoPlay(); // Останавливаем автоматическое листание на 10 сек
    setDirection(index > currentImageIndex ? 'next' : 'prev');
    setCurrentImageIndex(index);
  };

  // 🖱️ Ручное листание (можно добавить стрелки)
  const handleImageClick = (e: React.MouseEvent) => {
    if (!hasMultipleImages) {
      onViewImage(images[0].url, product.name, 0);
      return;
    }

    // Если было перетаскивание, не открываем просмотр
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    // При клике открываем просмотр
    onViewImage(images[currentImageIndex].url, product.name, currentImageIndex);
  };

  // 👆 Touch handlers для свайпа
  const onTouchStart = (e: React.TouchEvent) => {
    if (!hasMultipleImages) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!hasMultipleImages) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!hasMultipleImages || !touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Свайп влево - следующее фото
      pauseAutoPlay();
      setDirection('next');
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
      setIsDragging(true);
      // Сбрасываем флаг через небольшую задержку
      setTimeout(() => setIsDragging(false), 100);
    } else if (isRightSwipe) {
      // Свайп вправо - предыдущее фото
      pauseAutoPlay();
      setDirection('prev');
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
      setIsDragging(true);
      // Сбрасываем флаг через небольшую задержку
      setTimeout(() => setIsDragging(false), 100);
    }

    // Сбрасываем состояние
    setTouchStart(null);
    setTouchEnd(null);
  };

  // 🖱️ Mouse handlers для drag на десктопе
  const onMouseDown = (e: React.MouseEvent) => {
    if (!hasMultipleImages) return;
    e.preventDefault();
    setTouchEnd(null);
    setTouchStart(e.clientX);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!hasMultipleImages || !touchStart) return;
    setTouchEnd(e.clientX);
  };

  const onMouseUp = () => {
    if (!hasMultipleImages || !touchStart || touchEnd === null) {
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Драг влево - следующее фото
      pauseAutoPlay();
      setDirection('next');
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
      setIsDragging(true);
      // Сбрасываем флаг через небольшую задержку
      setTimeout(() => setIsDragging(false), 100);
    } else if (isRightSwipe) {
      // Драг вправо - предыдущее фото
      pauseAutoPlay();
      setDirection('prev');
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
      setIsDragging(true);
      // Сбрасываем флаг через небольшую задержку
      setTimeout(() => setIsDragging(false), 100);
    }

    // Сбрасываем состояние
    setTouchStart(null);
    setTouchEnd(null);
  };

  const onMouseLeave = () => {
    setTouchStart(null);
    setTouchEnd(null);
  };

  const currentImage = images[currentImageIndex];

  return (
    <div 
      key={product.id}
      id={`product-${product.id}`}
      className={`rounded-lg shadow-sm transition-all duration-500 overflow-hidden flex flex-col relative hover:shadow-2xl hover:scale-105 hover:-translate-y-2 ${
        colorAnimationEnabled 
          ? `floating-blob-container ${displayMode === 'night' ? 'bg-slate-800/40 hover:bg-slate-750/60 backdrop-blur-sm border border-slate-600 hover:border-slate-400 hover:shadow-slate-500/50' : 'bg-white/40 hover:bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-purple-300 hover:shadow-purple-200/50'}`
          : (displayMode === 'night' ? 'bg-slate-800/40 hover:bg-slate-750/60 backdrop-blur-sm border border-slate-600 hover:border-slate-400 hover:shadow-slate-500/50' : 'bg-white/40 hover:bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-purple-300 hover:shadow-purple-200/50')
      } ${highlightedProductId === product.id ? 'ring-4 ring-purple-500 ring-opacity-75 animate-pulse' : ''}`}
      onDoubleClick={onDoubleClick}
    >
      {/* Product Image with Auto-Carousel */}
      <div className="relative h-48 sm:h-52 md:h-56 bg-gray-100 flex-shrink-0 z-10 group">
        {images.length > 0 ? (
          <>
            <div 
              className="relative w-full h-full overflow-hidden cursor-pointer"
              onClick={handleImageClick}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseLeave}
            >
              {/* 🖼️ ПЛАВНОЕ ЛИСТАНИЕ ИЗОБРАЖЕНИЙ (как в Яндекс Маркете) */}
              {images.map((image, index) => {
                // Определяем позицию каждого изображения
                let position = 'hidden';
                if (index === currentImageIndex) {
                  position = 'current';
                } else if (index === (currentImageIndex - 1 + images.length) % images.length) {
                  position = 'prev';
                } else if (index === (currentImageIndex + 1) % images.length) {
                  position = 'next';
                }

                // Вычисляем transform для слайда
                let transform = 'translateX(0%)';
                if (position === 'current') {
                  transform = 'translateX(0%)';
                } else if (position === 'prev') {
                  transform = 'translateX(-100%)';
                } else if (position === 'next') {
                  transform = 'translateX(100%)';
                } else {
                  // Скрываем остальные изображения
                  return null;
                }

                return (
                  <img
                    key={index}
                    src={image.url}
                    alt={product.name}
                    className="absolute top-0 left-0 w-full h-full object-cover"
                    style={{ 
                      transform,
                      transition: 'transform 500ms cubic-bezier(0.4, 0.0, 0.2, 1)', // Плавная анимация
                    }}
                  />
                );
              })}
            </div>
            
            {/* Стрелки навигации (показываются при hover, только если больше 1 фото) */}
            {hasMultipleImages && (
              <>
                <button
                  onClick={goToPrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  aria-label="Предыдущее фото"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  aria-label="Следующее фото"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            
            {/* 🔘 Круглые точки-индикаторы */}
            {hasMultipleImages && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => goToImage(index, e)}
                    className={`transition-all duration-300 rounded-full ${
                      index === currentImageIndex
                        ? 'w-2 h-2 bg-white'
                        : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/75'
                    }`}
                    aria-label={`Перейти к фото ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <span className="text-gray-400 text-sm">Нет фото</span>
          </div>
        )}
        
        {/* Like Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike(product.id);
          }}
          className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-white rounded-full p-1.5 sm:p-2 shadow-md hover:scale-110 transition-transform z-10"
        >
          <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${
            isLiked
              ? 'text-pink-500 fill-current' 
              : 'text-gray-400'
          }`} />
        </button>
        
        {/* Cart Badge */}
        {cartQuantity && (
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-green-500 text-white rounded-full px-2 py-0.5 sm:px-3 sm:py-1 text-xs z-10">
            {cartQuantity}
          </div>
        )}
        
        {/* Like Animation */}
        {likeAnimation?.productId === product.id && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <Heart 
              className={`w-16 h-16 sm:w-20 sm:h-20 animate-ping ${
                likeAnimation.isLiked 
                  ? 'text-pink-500 fill-current' 
                  : 'text-gray-400'
              }`}
              style={{
                animation: 'likeScale 1s ease-out'
              }}
            />
          </div>
        )}
      </div>

      {/* Product Info - уменьшен padding */}
      <div className="p-2 sm:p-2.5 md:p-3 flex flex-col flex-grow relative z-10">
        <h3 className={`mb-1 line-clamp-2 text-sm sm:text-base transition-colors duration-500 ${
          displayMode === 'night' ? 'text-white' : ''
        }`}>{product.name}</h3>
        
        {/* 🏢 Название компании */}
        {product.company_name && (
          <button
            onClick={() => product.company_id && onViewCompany(product.company_id)}
            className={`text-xs mb-1.5 text-left flex items-center gap-1 hover:underline transition-colors ${
              displayMode === 'night' ? 'text-purple-400' : 'text-purple-600'
            }`}
          >
            <BadgeCheck className="w-4 h-4 fill-blue-500 text-white flex-shrink-0" />
            {product.company_name}
          </button>
        )}
        
        <div className="mb-2">
          <div className={`mb-0.5 text-base sm:text-lg transition-colors duration-500 ${
            displayMode === 'night' ? 'text-blue-400' : 'text-blue-600'
          }`}>
            {formatPrice(getPriceWithMarkup(product))}
            {product.markup_percent && product.markup_percent > 0 && (
              <span className="hidden text-xs text-orange-600 ml-1">+{product.markup_percent}%</span>
            )}
          </div>
          <div className={`text-xs sm:text-sm transition-colors duration-500 ${
            displayMode === 'night' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            В наличии: <span className={`font-medium ${
              displayMode === 'night' ? 'text-green-400' : 'text-green-600'
            }`}>{product.quantity} шт.</span>
          </div>
        </div>
        
        {/* Кнопки (передаются через children) */}
        {children}
      </div>
    </div>
  );
}