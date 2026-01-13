import { Loader2, MessageCircle, Paperclip, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getChatMessages, markMessagesAsRead, sendChatMessage, uploadChatMedia } from '../utils/api';

interface Message {
  id: number;
  sender_type: 'admin' | 'company';
  message_type: 'text' | 'voice' | 'image' | 'video' | 'file';
  message_text: string | null;
  media_url: string | null;
  media_filename: string | null;
  voice_duration: number | null;
  video_duration: number | null;
  created_at: string;
  is_read: boolean;
  reply_to?: {
    id: number;
    message_text: string;
    message_type: string;
    sender_type: string;
  } | null;
}

interface CompanyChatPanelProps {
  companyId: number;
  companyName: string;
}

// 💾 In-memory cache для сообщений
const messagesCache = new Map<number, Message[]>();

export default function CompanyChatPanel({ companyId, companyName }: CompanyChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Загружаем из кеша при инициализации
    return messagesCache.get(companyId) || [];
  });
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Polling for new messages (replacement for Supabase Realtime)
  const pollMessages = useCallback(async () => {
    try {
      const loadedMessages = await getChatMessages(companyId);
      setMessages(prev => {
        // Only update if there are new messages
        if (loadedMessages.length !== prev.length ||
          (loadedMessages.length > 0 && prev.length > 0 &&
            loadedMessages[loadedMessages.length - 1].id !== prev[prev.length - 1].id)) {
          messagesCache.set(companyId, loadedMessages);
          return loadedMessages;
        }
        return prev;
      });
    } catch (error) {
      console.error('Error polling messages:', error);
    }
  }, [companyId]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      loadMessages();
      handleMarkMessagesAsRead();
      hasLoadedRef.current = true;
    }

    // Start polling for messages every 2 seconds
    pollingIntervalRef.current = setInterval(pollMessages, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [pollMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const loadedMessages = await getChatMessages(companyId);
      setMessages(loadedMessages);
      messagesCache.set(companyId, loadedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkMessagesAsRead = async () => {
    try {
      await markMessagesAsRead(companyId, 'company');
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async (type: 'text' | 'voice' | 'image' | 'video' | 'file' = 'text', mediaData?: any) => {
    try {
      const textToSend = type === 'text' ? messageText : null;

      setMessageText('');
      setSending(true);

      // 🟢 Создаём оптимистичное сообщение для мгновенного отображения
      const optimisticMessage: Message = {
        id: Date.now(), // Временный ID
        sender_type: 'company',
        message_type: type,
        message_text: textToSend,
        media_url: mediaData?.url || null,
        media_filename: mediaData?.media_filename || null,
        voice_duration: mediaData?.voice_duration || null,
        video_duration: mediaData?.video_duration || null,
        created_at: new Date().toISOString(),
        is_read: false,
        reply_to: null
      };

      // Сразу добавляем в UI
      setMessages(prev => [...prev, optimisticMessage]);

      const messageDataPayload: any = {
        company_id: companyId,
        sender_type: 'company',
        message_type: type,
        message_text: textToSend,
        ...mediaData
      };

      const result = await sendChatMessage(messageDataPayload);

      if (result.message) {
        // Заменяем оптимистичное сообщение на реальное из сервера
        setMessages(prev => {
          const updated = prev.map(m =>
            m.id === optimisticMessage.id ? result.message : m
          );
          messagesCache.set(companyId, updated);
          return updated;
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Ошибка отправки сообщения');
      // Удаляем оптимистичное сообщение при ошибке
      setMessages(prev => prev.filter(m => m.id !== Date.now()));
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'image' | 'video' | 'file') => {
    try {
      setUploading(true);

      const result = await uploadChatMedia(companyId, file);

      if (result.url) {
        await handleSendMessage(type, {
          media_filepath: result.filepath,
          media_filename: result.filename,
          media_size: result.size,
          media_mimetype: result.mimetype,
          url: result.url
        });
      } else {
        alert('Ошибка загрузки файла');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Определяем тип файла
    let type: 'image' | 'video' | 'file' = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';

    handleFileUpload(file, type);
    e.target.value = ''; // Reset input
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    // Добавляем UTC+5 смещение (5 часов = 5 * 60 * 60 * 1000 мс)
    const utcPlus5 = new Date(date.getTime() + (5 * 60 * 60 * 1000));
    const hours = utcPlus5.getUTCHours().toString().padStart(2, '0');
    const minutes = utcPlus5.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.sender_type === 'company';

    return (
      <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`max-w-[70%] ${isOwnMessage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'} rounded-2xl px-4 py-2 shadow`}>
          {message.reply_to && (
            <div className={`text-xs ${isOwnMessage ? 'bg-blue-700' : 'bg-gray-300'} rounded-lg px-2 py-1 mb-2 opacity-80`}>
              <div className="font-semibold">{message.reply_to.sender_type === 'admin' ? 'Админ' : 'Вы'}</div>
              <div className="truncate">{message.reply_to.message_text || `[${message.reply_to.message_type}]`}</div>
            </div>
          )}

          {message.message_type === 'text' && (
            <div className="text-sm whitespace-pre-wrap break-words">{message.message_text}</div>
          )}

          {message.message_type === 'image' && message.media_url && (
            <div>
              <img
                src={message.media_url}
                alt="Изображение"
                className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }}
                onClick={() => setFullscreenMedia({ url: message.media_url!, type: 'image' })}
              />
              {message.message_text && <div className="text-sm mt-2">{message.message_text}</div>}
            </div>
          )}

          {message.message_type === 'video' && message.media_url && (
            <div>
              <video
                src={message.media_url}
                className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }}
                onClick={() => setFullscreenMedia({ url: message.media_url!, type: 'video' })}
              />
              {message.message_text && <div className="text-sm mt-2">{message.message_text}</div>}
            </div>
          )}

          {message.message_type === 'file' && message.media_url && (
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              <a
                href={message.media_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm ${isOwnMessage ? 'text-white underline' : 'text-blue-600 underline'}`}
              >
                {message.media_filename || 'Файл'}
              </a>
            </div>
          )}

          <div className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'} mt-1 text-right`}>
            {formatMessageTime(message.created_at)}
            {isOwnMessage && (
              <span className="ml-1">{message.is_read ? '✓✓' : '✓'}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl overflow-hidden">
      {/* Заголовок чата */}
      <div className="flex items-center gap-3 p-4 bg-white border-b shadow-sm rounded-t-xl">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
          👤
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Поддержка</h3>
          <p className="text-xs text-gray-500">Администратор Azaton</p>
        </div>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageCircle className="w-16 h-16 mb-4" />
            <p className="text-center">Напишите нам, если у вас есть вопросы</p>
            <p className="text-sm text-center mt-2">Мы ответим как можно скорее</p>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Ввод сообщения */}
      <div className="p-4 bg-white border-t">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
          </button>
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Введите сообщение..."
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!messageText.trim() || sending}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Fullscreen media viewer */}
      {fullscreenMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setFullscreenMedia(null)}
        >
          <button
            onClick={() => setFullscreenMedia(null)}
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
          >
            ✕
          </button>
          {fullscreenMedia.type === 'image' ? (
            <img
              src={fullscreenMedia.url}
              alt="Fullscreen"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={fullscreenMedia.url}
              controls
              autoPlay
              className="max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
