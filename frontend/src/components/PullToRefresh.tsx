/**
 * 🔄 PULL-TO-REFRESH КОМПОНЕНТ
 * 
 * Позволяет пользователям потянуть экран вниз для обновления данных
 * Работает как в Instagram, Telegram и других мобильных приложениях
 */

import { useState, useEffect, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
}

export default function PullToRefresh({ onRefresh, children, disabled = false }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);

  const PULL_THRESHOLD = 80; // Минимальное расстояние для активации
  const MAX_PULL = 120; // Максимальное расстояние

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Только если прокрутка в самом верху
      if (window.scrollY === 0 && !refreshing) {
        setStartY(e.touches[0].clientY);
        setPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pulling || refreshing) return;
      
      const currentY = e.touches[0].clientY;
      const distance = currentY - startY;
      
      // Только если тянем вниз И в самом верху страницы
      if (distance > 0 && window.scrollY === 0) {
        // Применяем resistance effect (чем дальше тянешь, тем сложнее)
        const resistanceFactor = 0.5;
        const adjustedDistance = Math.min(distance * resistanceFactor, MAX_PULL);
        setPullDistance(adjustedDistance);
        
        // Предотвращаем скролл браузера при потягивании
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!pulling || refreshing) return;
      
      setPulling(false);
      
      // Если потянули достаточно далеко - запускаем обновление
      if (pullDistance >= PULL_THRESHOLD) {
        setRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          console.error('Error refreshing:', error);
        } finally {
          setTimeout(() => {
            setRefreshing(false);
            setPullDistance(0);
          }, 500); // Небольшая задержка для плавной анимации
        }
      } else {
        // Если не дотянули - возвращаем обратно
        setPullDistance(0);
      }
      
      setStartY(0);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pulling, refreshing, pullDistance, startY, onRefresh, disabled]);

  // Процент выполнения (для анимации)
  const progress = Math.min((pullDistance / PULL_THRESHOLD) * 100, 100);
  const isReady = pullDistance >= PULL_THRESHOLD;

  return (
    <div className="relative">
      {/* Индикатор Pull-to-Refresh */}
      <div 
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-200"
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 0 ? 1 : 0,
          pointerEvents: 'none'
        }}
      >
        <div 
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
            isReady 
              ? 'bg-purple-500 text-white scale-110' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          <RefreshCw 
            size={20} 
            className={`${refreshing || isReady ? 'animate-spin' : ''}`}
            style={{
              transform: refreshing ? 'none' : `rotate(${progress * 3.6}deg)`
            }}
          />
          <span className="text-sm font-medium">
            {refreshing ? 'Обновление...' : isReady ? 'Отпустите для обновления' : 'Потяните для обновления'}
          </span>
        </div>
      </div>

      {/* Контент */}
      <div 
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pulling ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {children}
      </div>

      {/* Оверлей при обновлении */}
      {refreshing && (
        <div className="fixed inset-0 bg-black/10 z-40 pointer-events-none" />
      )}
    </div>
  );
}
