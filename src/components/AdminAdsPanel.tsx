import { useState, useEffect } from 'react';
import { Megaphone, Check, X, Clock, Eye, Building2, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { getAdvertisements, approveAdvertisement, rejectAdvertisement, deleteAdvertisement, type Advertisement } from '../utils/api';

export default function AdminAdsPanel() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadAds();
    
    // Автообновление каждые 10 секунд
    const interval = setInterval(loadAds, 10000);
    return () => clearInterval(interval);
  }, [activeFilter]);

  const loadAds = async () => {
    try {
      console.log('📢 [Admin Ads] Loading advertisements with filter:', activeFilter);
      const filters = activeFilter === 'all' ? {} : { status: activeFilter as 'pending' | 'approved' | 'rejected' };
      const result = await getAdvertisements(filters);
      
      console.log('📢 [Admin Ads] API Response:', result);
      
      if (result.success) {
        console.log(`✅ [Admin Ads] Loaded ${result.ads?.length || 0} advertisements`);
        setAds(result.ads || []);
      } else {
        console.error('❌ [Admin Ads] Failed to load:', result.error);
      }
    } catch (error) {
      console.error('❌ [Admin Ads] Exception:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (adId: string) => {
    try {
      toast.loading('Утверждение рекламы...', { id: 'approve-ad' });
      
      const result = await approveAdvertisement(adId);
      
      if (result.success) {
        toast.success('✅ Реклама утверждена!', { id: 'approve-ad' });
        loadAds();
      } else {
        toast.error(result.error || 'Ошибка утверждения', { id: 'approve-ad' });
      }
    } catch (error) {
      toast.error('Ошибка утверждения рекламы', { id: 'approve-ad' });
    }
  };

  const handleReject = async () => {
    if (!selectedAd) return;

    try {
      toast.loading('Отклонение рекламы...', { id: 'reject-ad' });
      
      const result = await rejectAdvertisement(selectedAd.id, rejectionReason);
      
      if (result.success) {
        toast.success('Реклама отклонена', { id: 'reject-ad' });
        setRejectModalOpen(false);
        setRejectionReason('');
        setSelectedAd(null);
        loadAds();
      } else {
        toast.error(result.error || 'Ошибка отклонения', { id: 'reject-ad' });
      }
    } catch (error) {
      toast.error('Ошибка отклонения рекламы', { id: 'reject-ad' });
    }
  };

  const handleDelete = async (adId: string) => {
    if (!confirm('Удалить эту рекламу?')) return;

    try {
      console.log('🗑️ [Admin Delete] Starting delete for ad:', adId);
      toast.loading('Удаление...', { id: 'delete-ad' });
      
      const result = await deleteAdvertisement(adId);
      
      console.log('🗑️ [Admin Delete] Server response:', result);
      
      if (result.success) {
        console.log('✅ [Admin Delete] Ad deleted successfully');
        toast.success('Реклама удалена', { id: 'delete-ad' });
        loadAds();
      } else {
        console.error('❌ [Admin Delete] Failed:', result.error);
        toast.error(result.error || 'Ошибка удаления', { id: 'delete-ad' });
      }
    } catch (error) {
      console.error('❌ [Admin Delete] Exception:', error);
      toast.error('Ошибка удаления', { id: 'delete-ad' });
    }
  };

  const openRejectModal = (ad: Advertisement) => {
    setSelectedAd(ad);
    setRejectModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm flex items-center gap-1">
          <Clock className="w-4 h-4" />
          На модерации
        </span>;
      case 'approved':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-1">
          <Check className="w-4 h-4" />
          Утверждено
        </span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm flex items-center gap-1">
          <X className="w-4 h-4" />
          Отклонено
        </span>;
      default:
        return null;
    }
  };

  const pendingCount = ads.filter(ad => ad.status === 'pending').length;
  const approvedCount = ads.filter(ad => ad.status === 'approved').length;
  const rejectedCount = ads.filter(ad => ad.status === 'rejected').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Загрузка реклам...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Megaphone className="w-8 h-8" />
          <h2>Модерация рекламы</h2>
        </div>
        <p className="text-purple-100">
          Проверяйте и утверждайте рекламные материалы от компаний
        </p>
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex gap-2 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeFilter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Все ({ads.length})
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeFilter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              На модерации ({pendingCount})
            </button>
            <button
              onClick={() => setActiveFilter('approved')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeFilter === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Утверждено ({approvedCount})
            </button>
            <button
              onClick={() => setActiveFilter('rejected')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeFilter === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Отклонено ({rejectedCount})
            </button>
          </div>

          {/* Кнопка обновления для отладки */}
          <button
            onClick={() => {
              console.log('🔄 [Admin Ads] Manual refresh clicked');
              loadAds();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Обновить
          </button>
        </div>
      </div>

      {/* Список реклам */}
      <div className="space-y-4">
        {ads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {activeFilter === 'pending' ? 'Нет реклам на модерации' : 'Нет реклам'}
            </p>
          </div>
        ) : (
          ads.map((ad) => {
            console.log('🔍 [Admin Ads Card] Rendering ad:', ad);
            return (
            <div key={ad.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="md:flex">
                {/* Изображение */}
                <div className="md:w-1/3 lg:w-1/4 bg-gray-100">
                  {ad.image_url ? (
                    <img
                      src={ad.image_url}
                      alt={ad.caption || 'Реклама'}
                      className="w-full h-full object-cover min-h-[200px]"
                      onError={(e) => {
                        console.error('❌ Failed to load image:', ad.image_url);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center min-h-[200px] text-gray-400">
                      <AlertCircle className="w-12 h-12" />
                    </div>
                  )}
                </div>

                {/* Контент */}
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900">{ad.company_name || '(Компания не указана)'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Отправлено {ad.submitted_at ? new Date(ad.submitted_at).toLocaleString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Invalid Date'}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(ad.status)}
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-700">{ad.caption || '(Описание отсутствует)'}</p>
                  </div>
                  
                  {/* 🔍 Отладочная информация */}
                  <details className="mb-4 text-xs text-gray-500 border border-gray-200 rounded p-2">
                    <summary className="cursor-pointer hover:text-gray-700">🔍 Отладка: показать данные</summary>
                    <pre className="mt-2 overflow-auto">{JSON.stringify(ad, null, 2)}</pre>
                  </details>

                  {ad.status === 'rejected' && ad.rejection_reason && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-red-900">
                          <strong>Причина отклонения:</strong> {ad.rejection_reason}
                        </p>
                      </div>
                    </div>
                  )}

                  {ad.status === 'approved' && ad.reviewed_at && (
                    <div className="mb-4 text-sm text-gray-500">
                      Утверждено {new Date(ad.reviewed_at).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}

                  {/* Действия */}
                  <div className="flex gap-2">
                    {ad.status === 'pending' && (
                      <>
                        <button
                          key={`approve-${ad.id}`}
                          onClick={() => handleApprove(ad.id)}
                          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          Утвердить
                        </button>
                        <button
                          key={`reject-${ad.id}`}
                          onClick={() => openRejectModal(ad)}
                          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Отклонить
                        </button>
                      </>
                    )}
                    {ad.status === 'approved' && (
                      <button
                        key={`cancel-${ad.id}`}
                        onClick={() => openRejectModal(ad)}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Отменить публикацию
                      </button>
                    )}
                    <button
                      key={`delete-${ad.id}`}
                      onClick={() => handleDelete(ad.id)}
                      className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* Модальное окно отклонения */}
      {rejectModalOpen && selectedAd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRejectModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-gray-900">Отклонить рекламу</h3>
              <button onClick={() => setRejectModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-600">
                Вы уверены, что хотите отклонить рекламу от <strong>{selectedAd.company_name}</strong>?
              </p>

              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Причина отклонения (необязательно)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  rows={3}
                  placeholder="Например: Изображение низкого качества, неприемлемый контент и т.д."
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}