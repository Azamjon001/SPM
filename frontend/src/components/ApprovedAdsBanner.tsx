import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getAdvertisements, type Advertisement } from '../utils/api';

export default function ApprovedAdsBanner() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApprovedAds();
    
    // Автообновление каждые 30 секунд
    const interval = setInterval(loadApprovedAds, 30000);
    return () => clearInterval(interval);
  }, []);

  // Автоматическая смена баннера каждые 5 секунд
  useEffect(() => {
    if (ads.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [ads.length]);

  const loadApprovedAds = async () => {
    try {
      const result = await getAdvertisements({ status: 'approved' });
      
      if (result.success && result.ads && result.ads.length > 0) {
        setAds(result.ads);
      } else {
        setAds([]);
      }
    } catch (error) {
      // Не логируем ошибку если это сетевая ошибка (сервер не развернут)
      if (error instanceof Error && !error.message.includes('NETWORK_ERROR')) {
        console.error('Ошибка загрузки реклам:', error);
      }
      setAds([]);
    } finally {
      setLoading(false);
    }
  };

  const nextAd = () => {
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  };

  const prevAd = () => {
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
  };

  const goToAd = (index: number) => {
    setCurrentIndex(index);
  };

  if (loading || ads.length === 0) {
    return null; // Не показываем ничего если нет утвержденных реклам
  }

  const currentAd = ads[currentIndex];

  return (
    <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
      {/* Основное изображение баннера */}
      <div className="relative aspect-[16/7] md:aspect-[21/9] bg-gradient-to-br from-purple-600 to-purple-800">
        <img
          src={currentAd.image_url}
          alt={currentAd.caption}
          className="w-full h-full object-cover"
        />
        
        {/* Градиент для читаемости текста */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Текст поверх баннера */}
        {currentAd.caption && (
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <p className="text-lg md:text-xl max-w-2xl drop-shadow-lg">
              {currentAd.caption}
            </p>
          </div>
        )}

        {/* Кнопки навигации (только если больше одного баннера) */}
        {ads.length > 1 && (
          <>
            <button
              onClick={prevAd}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
            <button
              onClick={nextAd}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
            >
              <ChevronRight className="w-6 h-6 text-gray-800" />
            </button>
          </>
        )}

        {/* Индикаторы (точки) */}
        {ads.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {ads.map((_, index) => (
              <button
                key={index}
                onClick={() => goToAd(index)}
                className={`transition-all ${
                  index === currentIndex
                    ? 'w-8 h-2 bg-white'
                    : 'w-2 h-2 bg-white/50 hover:bg-white/75'
                } rounded-full`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Бейдж "Реклама" */}
      <div className="absolute top-4 right-4">
        <span className="px-3 py-1 bg-white/90 backdrop-blur text-gray-700 rounded-full text-xs">
          Реклама
        </span>
      </div>
    </div>
  );
}