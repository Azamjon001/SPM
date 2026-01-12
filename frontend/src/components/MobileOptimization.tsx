import { useEffect } from 'react';

/**
 * 📱 МОБИЛЬНАЯ ОПТИМИЗАЦИЯ
 * 
 * 1. ✅ Отключает зум (pinch-to-zoom) на всех устройствах
 * 2. ✅ Отключает pull-to-refresh (обновление свайпом вниз)
 * 3. ✅ Делает контент полноэкранным без возможности масштабирования
 */
export default function MobileOptimization() {
  useEffect(() => {
    // 🔒 1. Добавляем мета-тег для отключения зума
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    } else {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
      document.head.appendChild(meta);
    }

    // 🔒 2. Отключаем двойное касание для зума
    let lastTouchEnd = 0;
    const preventDoubleTapZoom = (event: TouchEvent) => {
      // ✅ Пропускаем события для input, textarea и contenteditable элементов
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    };
    document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });

    // 🔒 3. Отключаем жест pinch-to-zoom
    const preventPinchZoom = (event: TouchEvent) => {
      // ✅ Пропускаем события для input, textarea и contenteditable элементов
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };
    document.addEventListener('touchmove', preventPinchZoom, { passive: false });

    // 🔒 4. Отключаем зум через ctrl/cmd + колесо мыши
    const preventWheelZoom = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    };
    document.addEventListener('wheel', preventWheelZoom, { passive: false });

    // 🔒 5. Отключаем pull-to-refresh (обновление свайпом вниз)
    let touchStartY = 0;
    const preventPullToRefresh = (event: TouchEvent) => {
      // ✅ Пропускаем события для input, textarea и contenteditable элементов
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      
      const touch = event.touches[0];
      touchStartY = touch.clientY;
    };

    const preventPullToRefreshMove = (event: TouchEvent) => {
      // ✅ Пропускаем события для input, textarea и contenteditable элементов
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      
      const touch = event.touches[0];
      const touchEndY = touch.clientY;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      // Если пользователь на самом верху страницы и тянет вниз - блокируем
      if (scrollTop === 0 && touchEndY > touchStartY) {
        event.preventDefault();
      }
    };

    document.addEventListener('touchstart', preventPullToRefresh, { passive: false });
    document.addEventListener('touchmove', preventPullToRefreshMove, { passive: false });

    // 🔒 6. CSS стили для отключения выделения текста и зума
    const style = document.createElement('style');
    style.textContent = `
      * {
        /* Отключаем выделение текста при долгом нажатии */
        -webkit-user-select: none;
        user-select: none;
        
        /* Отключаем вызов меню при долгом нажатии */
        -webkit-touch-callout: none;
      }
      
      /* Разрешаем выделение текста для инпутов и textarea */
      input, textarea, [contenteditable] {
        -webkit-user-select: text !important;
        user-select: text !important;
        /* ✅ Разрешаем касания для input полей */
        touch-action: manipulation !important;
        /* ✅ Предотвращаем отскок при фокусе */
        -webkit-tap-highlight-color: transparent;
      }
      
      /* Отключаем overscroll (резиновый эффект на iOS) */
      body {
        overscroll-behavior-y: none;
        -webkit-overflow-scrolling: touch;
        position: relative;
        width: 100%;
        min-height: 100vh;
      }
      
      /* Отключаем горизонтальный скролл */
      html {
        overflow-x: hidden;
      }
    `;
    document.head.appendChild(style);

    console.log('✅ [Mobile Optimization] Отключены: зум, pull-to-refresh, выделение текста');

    // Cleanup
    return () => {
      document.removeEventListener('touchend', preventDoubleTapZoom);
      document.removeEventListener('touchmove', preventPinchZoom);
      document.removeEventListener('wheel', preventWheelZoom);
      document.removeEventListener('touchstart', preventPullToRefresh);
      document.removeEventListener('touchmove', preventPullToRefreshMove);
      style.remove();
    };
  }, []);

  return null; // Этот компонент ничего не рендерит
}