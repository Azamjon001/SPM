import { Eye, Heart, Image as ImageIcon, MapPin, MessageCircle, Navigation, Package, Send, Star, TrendingUp, Upload, Users, Video, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { createAdvertisement } from '../utils/api';
import MapLocationPicker from './MapLocationPicker';

// API Base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

interface CompanySMMPanelProps {
  companyId: number;
  companyName: string;
}

interface CompanyProfile {
  id: number;
  name: string;
  phone: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  rating: number;
  total_ratings: number;
  total_products: number;
  total_sales: number;
  logo_image?: string;
}

interface MediaItem {
  id: string;
  type: 'photo' | 'video' | 'ad';
  url: string;
  title: string;
  description?: string;
  views: number;
  likes: number;
  comments: number;
  created_at: string;
}

export default function CompanySMMPanel({ companyId, companyName }: CompanySMMPanelProps) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'photos'>('profile');
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // 🆕 Статистика подписчиков и просмотров
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [profileViews, setProfileViews] = useState(0);

  // Временные данные профиля
  const [formData, setFormData] = useState({
    location: '',
    latitude: 0,
    longitude: 0,
    description: '',
    logo_image: ''
  });
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  useEffect(() => {
    loadCompanyProfile();
    loadMediaItems();
    loadSubscriberStats();

    // 🔄 Polling for updates every 10 seconds (replacement for Supabase Realtime)
    const pollInterval = setInterval(() => {
      loadMediaItems();
    }, 10000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [companyId]);

  // 🆕 Загрузка статистики подписчиков и просмотров
  const loadSubscriberStats = async () => {
    try {
      // Загружаем подписчиков
      const subsResponse = await fetch(
        `${API_BASE}/companies/${companyId}/subscription?customer_id=dummy`
      );
      const subsData = await subsResponse.json();
      if (subsData.success) {
        setSubscribersCount(subsData.subscribersCount);
      }

      // Загружаем просмотры
      const viewsResponse = await fetch(
        `${API_BASE}/companies/${companyId}/profile-views`
      );
      const viewsData = await viewsResponse.json();
      if (viewsData.success) {
        setProfileViews(viewsData.views);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const loadCompanyProfile = async () => {
    try {
      const response = await fetch(`${API_BASE}/companies/${companyId}/smm-profile`);
      const data = await response.json();

      if (data.success) {
        setProfile(data.profile);
        setFormData({
          location: data.profile.location || '',
          latitude: data.profile.latitude || 41.2995,
          longitude: data.profile.longitude || 69.2401,
          description: data.profile.description || '',
          logo_image: data.profile.logo_image || ''
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMediaItems = async () => {
    try {
      console.log('📸 [Media] Loading media items for company:', companyId);
      const response = await fetch(`${API_BASE}/companies/${companyId}/media`);
      const data = await response.json();

      console.log('📸 [Media] API Response:', data);

      if (data.success) {
        console.log(`📸 [Media] Loaded ${data.media?.length || 0} media items:`, data.media);
        setMediaItems(data.media);
      } else {
        console.log('⚠️ [Media] Failed to load:', data.error);
        setMediaItems([]);
      }
    } catch (error) {
      console.error('❌ [Media] Error loading media:', error);
      setMediaItems([]);
    }
  };

  const handleSaveProfile = async () => {
    try {
      console.log('💾 Сохранение профиля компании:', companyId);
      console.log('📝 Данные для сохранения:', formData);

      const url = `${API_BASE}/companies/${companyId}/smm-profile`;
      console.log('📡 Отправка запроса на:', url);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      console.log('📡 Статус ответа:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Ошибка HTTP:', response.status, errorText);
        toast.error(`Ошибка сервера: ${response.status}\n${errorText.substring(0, 100)}`);
        return;
      }

      const data = await response.json();
      console.log('✅ Ответ сервера:', data);

      if (data.success) {
        toast.success('✅ Профиль успешно обновлен!');
        setEditMode(false);
        loadCompanyProfile();
      } else {
        console.error('❌ Ошибка из API:', data.error);

        // Проверяем специальные ошибки
        if (data.error?.includes('SMM fields not created') || data.error?.includes('does not exist') || data.error?.includes('column')) {
          toast.error('⚠️ БАЗА ДАННЫХ НЕ НАСТРОЕНА!\n\nОткройте /START_HERE.md', { duration: 8000 });
        } else {
          toast.error(data.error || 'Ошибка сохранения профиля');
        }
      }
    } catch (error) {
      console.error('❌ ❌ Ошибка:', error);
      console.error('❌ ❌ Детали ошибки:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      // Более информативное сообщение
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        toast.error(`❌ НЕ УДАЛОСЬ ПОДКЛЮЧИТЬСЯ К СЕРВЕРУ!
        
Возможные причины:
1. 🔴 SQL скрипт не выполнен → Откройте /START_HERE.md
2. 🔴 Supabase Functions не работают
3. 🔴 CORS заблокировал запрос

Откройте консоль браузера (F12) для деталей.`, {
          duration: 10000
        });
      } else {
        toast.error(`Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleMediaUpload = async (file: File, title: string, description: string, type: 'photo' | 'video' | 'ad') => {
    try {
      console.log('📸 [UPLOAD] Starting upload...', { fileName: file.name, type, title });

      // Показываем прогресс
      toast.loading('Загрузка файла...', { id: 'media-upload' });

      // 1. Загружаем файл в Storage
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', type);

      const uploadResponse = await fetch(
        `${API_BASE}/companies/${companyId}/upload-media`,
        {
          method: 'POST',
          body: uploadFormData
        }
      );

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const uploadData = await uploadResponse.json();

      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Upload failed');
      }

      console.log('✅ [UPLOAD] File uploaded:', uploadData.file_url);

      // 2. Сохраняем метаданные в media_gallery
      const mediaResponse = await fetch(
        `${API_BASE}/companies/${companyId}/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type,
            title,
            description,
            file_url: uploadData.file_url,
            file_path: uploadData.file_path
          })
        }
      );

      if (!mediaResponse.ok) {
        throw new Error('Failed to save media metadata');
      }

      const mediaData = await mediaResponse.json();

      if (!mediaData.success) {
        throw new Error(mediaData.error || 'Failed to save metadata');
      }

      console.log('✅ [UPLOAD] Media metadata saved');

      toast.success(`${type === 'photo' ? 'Фото' : type === 'video' ? 'Видео' : 'Реклама'} загружено!`, { id: 'media-upload' });
      setUploadModalOpen(false);
      loadMediaItems();
    } catch (error) {
      console.error('❌ [UPLOAD] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Ошбка загрузки', { id: 'media-upload' });
    }
  };

  const handleLogoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          toast.loading('Загрузка логотипа...', { id: 'logo-upload' });

          // Загружаем через серверный endpoint
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);

          const response = await fetch(
            `${API_BASE}/companies/${companyId}/upload-logo`,
            {
              method: 'POST',
              body: uploadFormData
            }
          );

          if (!response.ok) {
            throw new Error('Ошибка загрузки на сервер');
          }

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Ошибка загрузки');
          }

          setFormData(prev => ({ ...prev, logo_image: data.logo_url }));
          toast.success('Логотип загружен! Не забудьте сохранить изменения.', { id: 'logo-upload' });
        } catch (error) {
          console.error('Ошибка при загрузке логотипа:', error);
          toast.error(error instanceof Error ? error.message : 'Ошибка загрузки логотипа', { id: 'logo-upload' });
        }
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-gradient-to-br from-orange-50 to-purple-50 rounded-xl p-4">
      {/* Навигация */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-6 py-4 transition-colors ${activeTab === 'profile'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Star className="w-5 h-5" />
            Профиль компании
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-2 px-6 py-4 transition-colors ${activeTab === 'photos'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <ImageIcon className="w-5 h-5" />
            Фотогалерея
          </button>
        </div>
      </div>

      {/* Профиль компании */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Профиль компании с логотипом */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden p-6">
            {/* Логотип и основная информация */}
            <div className="flex items-start gap-6 mb-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-white border-4 border-purple-200 shadow-lg overflow-hidden">
                  {formData.logo_image ? (
                    <img src={formData.logo_image} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white text-4xl">
                      {companyName.charAt(0)}
                    </div>
                  )}
                </div>
                {editMode && (
                  <button
                    onClick={handleLogoUpload}
                    className="absolute bottom-0 right-0 bg-purple-600 text-white p-2 rounded-full shadow-lg hover:bg-purple-700">
                    <Upload className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{companyName}</h2>
                    {profile && (
                      <div className="flex items-center gap-4 text-gray-600">
                        <div className="flex items-center gap-1">
                          <Star
                            key={1}
                            className={`w-5 h-5 ${1 <= Math.round(profile.rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                              }`}
                          />
                          <span className="ml-2">
                            {profile.rating.toFixed(1)} ({profile.total_ratings} оценок)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => editMode ? handleSaveProfile() : setEditMode(true)}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {editMode ? 'Сохранить' : 'Редактировать'}
                  </button>
                </div>
              </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                  <Package className="w-5 h-5" />
                  <span className="text-sm">Товаров</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{profile?.total_products || 0}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm">Продаж</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{profile?.total_sales || 0}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-orange-600 mb-2">
                  <Users className="w-5 h-5" />
                  <span className="text-sm">Подписчиков</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{subscribersCount}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Eye className="w-5 h-5" />
                  <span className="text-sm">Просмотров</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{profileViews}</p>
              </div>
            </div>

            {/* Информация о компании */}
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Локация
                </label>
                {editMode ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => setLocationModalOpen(true)}
                      className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg hover:border-purple-600 transition-colors text-left bg-purple-50 hover:bg-purple-100 flex items-center justify-between"
                    >
                      <span>{formData.location || 'Выберите локацию на карте'}</span>
                      <Navigation className="w-5 h-5 text-purple-600" />
                    </button>
                    {formData.latitude && formData.longitude && (
                      <p className="text-xs text-gray-500">
                        📍 {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-900">{formData.location || 'Не указано'}</p>
                    {formData.latitude && formData.longitude && (
                      <p className="text-xs text-gray-500 mt-1">
                        📍 {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Описание компании</label>
                {editMode ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    rows={4}
                    placeholder="Расскажите о вашей компании"
                  />
                ) : (
                  <p className="text-gray-900">{formData.description || 'Опиание не добавлено'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Фотогалерея */}
      {activeTab === 'photos' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-gray-900">Фотогалерея</h3>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Загрузить фото
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {mediaItems
              .filter((item) => item.type === 'photo')
              .map((item) => (
                <MediaCard key={item.id} item={item} />
              ))}
            {mediaItems.filter((item) => item.type === 'photo').length === 0 && (
              <div className="col-span-3 bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Фотографии не добавлены</p>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Загрузить первое фото
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно загрузки */}
      {uploadModalOpen && (
        <UploadModal
          onClose={() => setUploadModalOpen(false)}
          onUpload={handleMediaUpload}
          type={activeTab === 'photos' ? 'photo' : 'video'}
        />
      )}

      {/* Модальное окно выбора локации */}
      {locationModalOpen && (
        <MapLocationPicker
          currentLocation={formData.location}
          currentLatitude={formData.latitude}
          currentLongitude={formData.longitude}
          onClose={() => setLocationModalOpen(false)}
          onSelect={(location, lat, lng) => {
            setFormData({ ...formData, location, latitude: lat, longitude: lng });
            setLocationModalOpen(false);
            toast.success('Локация выбрана на карте!');
          }}
        />
      )}
    </div>
  );
}

// Карточка медиа
function MediaCard({ item, companyId, companyName }: { item: MediaItem, companyId?: number, companyName?: string }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitToModer = async () => {
    if (!companyId || !companyName) {
      console.error('❌ [Submit Ad] Missing company data:', { companyId, companyName });
      toast.error('Ошибка: данные компании не найдены');
      return;
    }

    // Проверяем данные медиа
    console.log('🔍 [Submit Ad] Checking media item:', item);

    if (!item.url) {
      console.error('❌ [Submit Ad] Missing image URL');
      toast.error('Ошибка: отсутствует ссылка на изображение');
      return;
    }

    try {
      setSubmitting(true);
      toast.loading('Отправка на модерацию...', { id: 'submit-ad' });

      console.log('📤 [Submit Ad] Sending to moderation:', {
        company_id: companyId,
        company_name: companyName,
        smm_post_id: item.id,
        image_url: item.url,
        caption: item.description || item.title
      });

      const result = await createAdvertisement({
        company_id: companyId,
        company_name: companyName,
        smm_post_id: item.id,
        image_url: item.url,
        caption: item.description || item.title,
        link_url: ''
      });

      console.log('📬 [Submit Ad] Server response:', result);

      if (result.success) {
        console.log('✅ [Submit Ad] Advertisement created:', result.ad);
        toast.success('✅ Реклама отправлена на модерацию!', { id: 'submit-ad' });
      } else {
        console.error('❌ [Submit Ad] Failed:', result.error);
        toast.error(result.error || 'Ошибка отправки', { id: 'submit-ad' });
      }
    } catch (error) {
      console.error('❌ [Submit Ad] Exception:', error);
      toast.error('Ошибка отправки на модерацию', { id: 'submit-ad' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-video bg-gray-100">
        <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
        {item.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/50 rounded-full p-4">
              <Video className="w-8 h-8 text-white" />
            </div>
          </div>
        )}
        {item.type === 'ad' && (
          <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded text-xs">
            Реклама
          </div>
        )}
      </div>
      <div className="p-4">
        <h4 className="text-gray-900 mb-2">{item.title}</h4>
        {item.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {item.views}
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {item.likes}
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              {item.comments}
            </div>
          </div>
          {item.type === 'ad' && companyId && (
            <button
              onClick={handleSubmitToModer}
              disabled={submitting}
              className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Отправка...' : 'На модерацию'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Модальное окно загрзки
function UploadModal({
  onClose,
  onUpload,
  type
}: {
  onClose: () => void;
  onUpload: (file: File, title: string, description: string, type: 'photo' | 'video' | 'ad') => void;
  type: 'photo' | 'video' | 'ad';
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);

    // Создаем превью для изображений
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }

    // Автоматически заполняем название если пустое
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleUploadClick = () => {
    if (!file) {
      toast.error('Выберите файл');
      return;
    }
    if (!title.trim()) {
      toast.error('Введите название');
      return;
    }
    onUpload(file, title, description, type);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-gray-900">
            Загрузить {type === 'photo' ? 'фото' : type === 'video' ? 'видео' : 'рекламу'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Название *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              placeholder="Введите название"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              rows={3}
              placeholder="Добавьте описание"
            />
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-purple-600 bg-purple-50' : 'border-gray-300'
              }`}
          >
            {preview ? (
              <div className="space-y-3">
                <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded" />
                <p className="text-sm text-gray-600">{file?.name}</p>
                <button
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Выбрать другой файл
                </button>
              </div>
            ) : file ? (
              <div className="space-y-3">
                <Video className="w-12 h-12 text-purple-600 mx-auto" />
                <p className="text-sm text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button
                  onClick={() => setFile(null)}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Выбрать другой файл
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Перетащите файл сюда или</p>
                <label className="inline-block cursor-pointer">
                  <span className="text-purple-600 hover:text-purple-700">Выберите файл</span>
                  <input
                    type="file"
                    className="hidden"
                    accept={type === 'photo' ? 'image/*' : type === 'video' ? 'video/*' : 'image/*,video/*'}
                    onChange={handleFileInput}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">Максимум 50 MB</p>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleUploadClick}
            disabled={!file || !title.trim()}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Загрузить
          </button>
        </div>
      </div>
    </div>
  );
}