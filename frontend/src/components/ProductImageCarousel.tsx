import { useState } from 'react';
import { ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ProductImageCarouselProps {
  images: Array<{ url: string; filepath: string; uploaded_at: string }>;
  productName: string;
  onImageClick?: (url: string) => void;
}

export default function ProductImageCarousel({ images, productName, onImageClick }: ProductImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

  // Минимальное расстояние свайпа (в пикселях)
  const minSwipeDistance = 50;

  if (!images || images.length === 0) {
    // Если нет изображений - показываем заглушку
    return (
      <div className="relative h-full w-full bg-gray-100 flex items-center justify-center">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1705495140141-d955bab1ebf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9kdWN0JTIwYm94JTIwcGFja2FnZXxlbnwxfHx8fDE3NjUzNDk0OTR8MA&ixlib=rb-4.1.0&q=80&w=1080"
          alt={productName}
          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onImageClick?.("https://images.unsplash.com/photo-1705495140141-d955bab1ebf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9kdWN0JTIwYm94JTIwcGFja2FnZXxlbnwxfHx8fDE3NjUzNDk0OTR8MA&ixlib=rb-4.1.0&q=80&w=1080")}
        />
      </div>
    );
  }

  const goToPrevious = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // 📱 Touch events для мобильных устройств
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0); // Reset
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext(); // Свайп влево = следующее фото
    } else if (isRightSwipe) {
      goToPrevious(); // Свайп вправо = предыдущее фото
    }
  };

  // 🖱️ Mouse events для десктопа
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const distance = dragStart - e.clientX;
    
    if (distance > minSwipeDistance) {
      goToNext(); // Drag влево = следующее фото
      setIsDragging(false);
    } else if (distance < -minSwipeDistance) {
      goToPrevious(); // Drag вправо = предыдущее фото
      setIsDragging(false);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className={`relative h-full w-full group select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown} 
      onMouseUp={handleMouseUp} 
      onMouseMove={handleMouseMove} 
      onMouseLeave={handleMouseLeave} 
      onTouchStart={handleTouchStart} 
      onTouchMove={handleTouchMove} 
      onTouchEnd={handleTouchEnd}
    >
      {/* Текущее изображение */}
      <ImageWithFallback
        src={images[currentIndex].url}
        alt={`${productName} - ${currentIndex + 1}`}
        className={`w-full h-full object-cover transition-opacity pointer-events-none ${
          isDragging ? 'opacity-90' : 'hover:opacity-90'
        }`}
        onClick={(e) => {
          if (!isDragging) {
            onImageClick?.(images[currentIndex].url);
          }
        }}
      />

      {/* Навигация - показывается только если больше 1 фото */}
      {images.length > 1 && (
        <>
          {/* Кнопка "Предыдущее" */}
          <button
            onClick={goToPrevious}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            aria-label="Предыдущее фото"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Кнопка "Следующее" */}
          <button
            onClick={goToNext}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            aria-label="Следующее фото"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Индикаторы (точки) */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-4'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Перейти к фото ${index + 1}`}
              />
            ))}
          </div>

          {/* Счетчик фото */}
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}