import { Loader2, MessageCircle, Paperclip, Search, Send, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getChatMessages, getChats, markMessagesAsRead, sendChatMessage, uploadChatMedia } from '../utils/api';

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

interface Chat {
  company_id: number;
  company_name: string;
  company_phone: string;
  unread_count_for_admin: number;
  last_message_text: string;
  last_message_type: string;
  last_message_sender: string;
  last_message_at: string;
}

// 💾 In-memory cache
const chatsCache = { data: null as Chat[] | null, timestamp: 0 };
const messagesCache = new Map<number, Message[]>();

export default function AdminChatPanel() {
  const [chats, setChats] = useState<Chat[]>(() => chatsCache.data || []);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fullscreenMedia, setFullscreenMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedChatsRef = useRef(false);
  const hasLoadedMessagesRef = useRef(new Set<number>());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Polling for new messages (replacement for Supabase Realtime)
  const pollMessages = useCallback(async (companyId: number) => {
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
  }, []);

  // Polling for new chats
  const pollChats = useCallback(async () => {
    try {
      const loadedChats = await getChats();
      setChats(prev => {
        if (JSON.stringify(loadedChats) !== JSON.stringify(prev)) {
          chatsCache.data = loadedChats;
          chatsCache.timestamp = Date.now();
          return loadedChats;
        }
        return prev;
      });
    } catch (error) {
      console.error('Error polling chats:', error);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedChatsRef.current) {
      loadChats();
      hasLoadedChatsRef.current = true;
    }

    // Poll for new chats every 5 seconds
    const chatPollInterval = setInterval(pollChats, 5000);

    return () => {
      clearInterval(chatPollInterval);
    };
  }, [pollChats]);

  useEffect(() => {
    if (selectedChat) {
      // Загружаем из кеша или с сервера
      const cached = messagesCache.get(selectedChat.company_id);
      if (cached && !hasLoadedMessagesRef.current.has(selectedChat.company_id)) {
        setMessages(cached);
        setMessagesLoading(false);
      } else if (!hasLoadedMessagesRef.current.has(selectedChat.company_id)) {
        loadMessages(selectedChat.company_id);
        hasLoadedMessagesRef.current.add(selectedChat.company_id);
      }

      handleMarkMessagesAsRead(selectedChat.company_id);

      // Start polling for messages every 2 seconds
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      pollingIntervalRef.current = setInterval(() => {
        pollMessages(selectedChat.company_id);
      }, 2000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [selectedChat, pollMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChats = async () => {
    try {
      // Используем кеш если свежий (менее 5 секунд)
      const now = Date.now();
      if (chatsCache.data && (now - chatsCache.timestamp) < 5000) {
        setChats(chatsCache.data);
        setLoading(false);
        return;
      }

      const loadedChats = await getChats();
      setChats(loadedChats);
      chatsCache.data = loadedChats;
      chatsCache.timestamp = now;
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (companyId: number) => {
    try {
      setMessagesLoading(true);
      const loadedMessages = await getChatMessages(companyId);
      setMessages(loadedMessages);
      messagesCache.set(companyId, loadedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleMarkMessagesAsRead = async (companyId: number) => {
    try {
      await markMessagesAsRead(companyId, 'admin');

      // Обновляем счётчики непрочитанных
      setChats(prev => {
        const updated = prev.map(chat =>
          chat.company_id === companyId
            ? { ...chat, unread_count_for_admin: 0 }
            : chat
        );
        chatsCache.data = updated;
        return updated;
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async (type: 'text' | 'voice' | 'image' | 'video' | 'file' = 'text', mediaData?: any) => {
    if (!selectedChat) return;

    try {
      const textToSend = type === 'text' ? messageText : null;

      setMessageText('');
      setSending(true);

      // 🟢 Создаём оптимистичное сообщение для мгновенного отображения
      const optimisticMessage: Message = {
        id: Date.now(), // Временный ID
        sender_type: 'admin',
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
        company_id: selectedChat.company_id,
        sender_type: 'admin',
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
          messagesCache.set(selectedChat.company_id, updated);
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
    if (!selectedChat) return;

    try {
      setUploading(true);

      const result = await uploadChatMedia(selectedChat.company_id, file);

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

  const formatChatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return formatMessageTime(dateString);
    } else if (diffDays === 1) {
      return 'Вчера';
    } else if (diffDays < 7) {
      const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      return days[date.getDay()];
    } else {
      return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }
  };

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.sender_type === 'admin';

    return (
      <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`max-w-[70%] ${isOwnMessage ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-900'} rounded-2xl px-4 py-2 shadow`}>
          {message.reply_to && (
            <div className={`text-xs ${isOwnMessage ? 'bg-green-700' : 'bg-gray-300'} rounded-lg px-2 py-1 mb-2 opacity-80`}>
              <div className="font-semibold">{message.reply_to.sender_type === 'admin' ? 'Вы' : 'Компания'}</div>
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

          <div className={`text-xs ${isOwnMessage ? 'text-green-100' : 'text-gray-500'} mt-1 text-right`}>
            {formatMessageTime(message.created_at)}
            {isOwnMessage && (
              <span className="ml-1">{message.is_read ? '✓✓' : '✓'}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const filteredChats = chats.filter(chat =>
    chat.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.company_phone.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-100">
      {/* Список чатов */}
      <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r bg-white`}>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Чаты компаний</h2>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
              <MessageCircle className="w-12 h-12 mb-2" />
              <p className="text-center">Нет чатов</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <div
                key={chat.company_id}
                onClick={() => setSelectedChat(chat)}
                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b ${selectedChat?.company_id === chat.company_id ? 'bg-green-50' : ''}`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg">
                  {chat.company_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 truncate">{chat.company_name}</h3>
                    <span className="text-xs text-gray-500">{formatChatTime(chat.last_message_at)}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{chat.last_message_text || 'Нет сообщений'}</p>
                </div>
                {chat.unread_count_for_admin > 0 && (
                  <div className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-semibold">
                    {chat.unread_count_for_admin > 9 ? '9+' : chat.unread_count_for_admin}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Окно сообщений */}
      <div className={`${selectedChat ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-gray-50`}>
        {selectedChat ? (
          <>
            {/* Заголовок чата */}
            <div className="flex items-center gap-3 p-4 bg-white border-b shadow-sm">
              <button
                onClick={() => setSelectedChat(null)}
                className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg"
              >
                ←
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                {selectedChat.company_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedChat.company_name}</h3>
                <p className="text-xs text-gray-500">{selectedChat.company_phone}</p>
              </div>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto p-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <MessageCircle className="w-16 h-16 mb-4" />
                  <p>Начните диалог с компанией</p>
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
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!messageText.trim() || sending}
                  className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageCircle className="w-20 h-20 mb-4" />
            <p className="text-lg">Выберите чат для начала общения</p>
          </div>
        )}
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
