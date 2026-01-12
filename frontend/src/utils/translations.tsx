// 🌍 Система локализации для платформы
// Поддерживаемые языки: русский (по умолчанию) и узбекский

export type Language = 'ru' | 'uz';

export interface Translations {
  // Общие
  welcome: string;
  settings: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  add: string;
  search: string;
  loading: string;
  error: string;
  success: string;
  confirm: string;
  back: string;
  
  // Магазин покупателя (HomePage)
  store: string;
  welcomeUser: string;
  cart: string;
  myOrders: string;
  likes: string;
  totalPrice: string;
  checkout: string;
  emptyCart: string;
  addToCart: string;
  removeFromCart: string;
  quantity: string;
  price: string;
  product: string;
  products: string;
  inStock: string;
  outOfStock: string;
  searchProducts: string;
  noProductsFound: string;
  
  // Заказы и чеки
  orderCode: string;
  orderDate: string;
  orderStatus: string;
  orderTotal: string;
  orderItems: string;
  orderPending: string;
  orderPaid: string;
  orderCancelled: string;
  cancelOrder: string;
  deleteReceipt: string;
  deleteReceiptConfirm: string;
  receiptDeleted: string;
  
  // Оплата
  payment: string;
  paymentMethod: string;
  paymentManual: string;
  paymentDemo: string;
  paymentReal: string;
  payNow: string;
  paymentSuccess: string;
  paymentFailed: string;
  
  // Профиль компании
  companyProfile: string;
  companyName: string;
  companyLocation: string;
  companyProducts: string;
  companyPhotos: string;
  companyAds: string;
  rateCompany: string;
  yourRating: string;
  
  // Настройки покупателя
  settingsTitle: string;
  language: string;
  languageRussian: string;
  languageUzbek: string;
  displayMode: string;
  displayModeDay: string;
  displayModeNight: string;
  logout: string;
  
  // Цифровой склад (InventoryManagement)
  inventory: string;
  addProduct: string;
  editProduct: string;
  deleteProduct: string;
  productName: string;
  productPrice: string;
  productQuantity: string;
  productBarcode: string;
  productCategory: string;
  productImage: string;
  markup: string;
  markupPercent: string;
  sellingPrice: string;
  purchasePrice: string;
  
  // Цифровой склад - новые переводы
  importFile: string;
  enterBarcodes: string;
  totalProducts: string;
  totalQuantity: string;
  totalValue: string;
  categoriesManagement: string;
  manageCategories: string;
  deleteAll: string;
  deleteAllConfirm: string;
  showing: string;
  of: string;
  photo: string;
  name: string;
  category: string;
  barcode: string;
  colors: string;
  priceWithMarkup: string;
  totalPrice: string;
  priceWithMarkupTotal: string;
  actions: string;
  edit: string;
  delete: string;
  yes: string;
  no: string;
  hasColorOptions: string;
  color: string;
  any: string;
  importExcel: string;
  importCSV: string;
  importTXT: string;
  selectFile: string;
  uploading: string;
  uploadSuccess: string;
  uploadFailed: string;
  
  // Админ панель
  adminPanel: string;
  companies: string;
  addCompany: string;
  editCompany: string;
  deleteCompany: string;
  users: string;
  orders: string;
  statistics: string;
  
  // История продаж
  salesHistory: string;
  salesDate: string;
  salesTotal: string;
  salesProfit: string;
  
  // Финансы
  finance: string;
  totalRevenue: string;
  totalProfit: string;
  totalExpenses: string;
  frozenInProducts: string;
  
  // SMM
  smm: string;
  photos: string;
  videos: string;
  ads: string;
  
  // Chat
  chat: string;
  
  // Импорт товаров
  importProducts: string;
  importFromFile: string;
  importExcel: string;
  importCSV: string;
  importTXT: string;
  
  // Цифровая касса
  cashRegister: string;
  scanBarcode: string;
  enterBarcode: string;
  total: string;
  completeSale: string;
  
  // Компания - новые переводы
  companyPanel: string;
  salesPanel: string;
  barcodeSearch: string;
  notifications: string;
  companyManagement: string;
  
  // Панель продаж (SalesPanel)
  availableProducts: string;
  manageSales: string;
  customerOrders: string;
  ordersToday: string;
  salesAmount: string;
  profitAmount: string;
  toggleAvailability: string;
  availableForCustomers: string;
  makeAvailable: string;
  makeUnavailable: string;
  confirmPayment: string;
  viewReceipt: string;
  searchByCode: string;
  searchOrder: string;
  orderNotFound: string;
  confirmingPayment: string;
  paymentConfirmed: string;
  bulkActions: string;
  selectAll: string;
  deselectAll: string;
  
  // Аналитика (AnalyticsPanel)
  analytics: string;
  topProducts: string;
  revenueChart: string;
  profitMargin: string;
  totalSales: string;
  averageOrder: string;
  salesTrend: string;
  productPerformance: string;
  dailySales: string;
  weeklySales: string;
  monthlySales: string;
  
  // Заказы (OrdersPanel)
  allOrders: string;
  pendingOrders: string;
  completedOrders: string;
  cancelledOrders: string;
  filterByStatus: string;
  orderDetails: string;
  customer: string;
  phone: string;
  orderConfirmed: string;
  
  // Поиск по штрих-коду (BarcodeSearchPanel)
  barcodeSearchTitle: string;
  enterBarcodeManually: string;
  scanWithCamera: string;
  barcodeFound: string;
  barcodeNotFound: string;
  updateQuantity: string;
  currentStock: string;
  newQuantity: string;
  quantityUpdated: string;
  
  // Уведомления (NotificationsPanel)
  allNotifications: string;
  unreadNotifications: string;
  readNotifications: string;
  markAsRead: string;
  markAsUnread: string;
  deleteNotification: string;
  noNotifications: string;
  newOrder: string;
  lowStock: string;
  systemNotification: string;
  
  // SMM панель (CompanySMMPanel)
  smmPanel: string;
  companyProfile: string;
  uploadPhoto: string;
  uploadVideo: string;
  createAd: string;
  mediaGallery: string;
  myAds: string;
  adTitle: string;
  adDescription: string;
  publishAd: string;
  deleteMedia: string;
  editMedia: string;
  noMediaYet: string;
  noAdsYet: string;
  
  // Сообщения об ошибках
  errorLoading: string;
  errorSaving: string;
  errorDeleting: string;
  errorInvalidData: string;
  errorNetwork: string;
  
  // Подтверждения
  confirmDelete: string;
  confirmCancel: string;
  confirmLogout: string;
}

export const translations: Record<Language, Translations> = {
  ru: {
    // Общие
    welcome: 'Добро пожаловать',
    settings: 'Настройки',
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    edit: 'Редактировать',
    add: 'Добавить',
    search: 'Поиск',
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успешно',
    confirm: 'Подтвердить',
    back: 'Назад',
    
    // Магазин покупателя
    store: 'Магазин',
    welcomeUser: 'Добро пожаловать',
    cart: 'Корзина',
    myOrders: 'Мои заказы',
    likes: 'Избранное',
    totalPrice: 'Итого',
    checkout: 'Оформить заказ',
    emptyCart: 'Корзина пуста',
    addToCart: 'В корзину',
    removeFromCart: 'Убрать',
    quantity: 'Количество',
    price: 'Цена',
    product: 'Товар',
    products: 'Товары',
    inStock: 'В наличии',
    outOfStock: 'Нет в наличии',
    searchProducts: 'Поиск товаров...',
    noProductsFound: 'Товары не найдены',
    
    // Заказы и чеки
    orderCode: 'Код заказа',
    orderDate: 'Дата',
    orderStatus: 'Статус',
    orderTotal: 'Сумма',
    orderItems: 'Товары',
    orderPending: 'В ожидании',
    orderPaid: 'Оплачено',
    orderCancelled: 'Отменено',
    cancelOrder: 'Отменить заказ',
    deleteReceipt: 'Удалить из списка',
    deleteReceiptConfirm: 'Удалить этот чек из корзины?\n\n⚠️ Чек останется в системе компании, удалится только из вашего списка.',
    receiptDeleted: 'Чек удалён из корзины!',
    
    // Оплата
    payment: 'Оплата',
    paymentMethod: 'Способ оплаты',
    paymentManual: 'Чеки/Коды',
    paymentDemo: 'Демо онлайн',
    paymentReal: 'Реальная онлайн',
    payNow: 'Оплатить',
    paymentSuccess: 'Оплата успешна',
    paymentFailed: 'Ошибка оплаты',
    
    // Профиль компании
    companyProfile: 'Профиль компании',
    companyName: 'Название компании',
    companyLocation: 'Местоположение',
    companyProducts: 'Товары',
    companyPhotos: 'Фотогалерея',
    companyAds: 'Реклама',
    rateCompany: 'Оцените компанию',
    yourRating: 'Ваша оценка',
    
    // Настройки покупателя
    settingsTitle: 'Настройки',
    language: 'Язык',
    languageRussian: 'Русский',
    languageUzbek: 'Узбекский',
    displayMode: 'Режим отображения',
    displayModeDay: 'Дневной',
    displayModeNight: 'Ночной',
    logout: 'Выйти',
    
    // Цифровой склад
    inventory: 'Цифровой склад',
    addProduct: 'Добавить товар',
    editProduct: 'Редактировать товар',
    deleteProduct: 'Удалить товар',
    productName: 'Название товара',
    productPrice: 'Цена',
    productQuantity: 'Количество',
    productBarcode: 'Штрих-код',
    productCategory: 'Категория',
    productImage: 'Изображение',
    markup: 'Наценка',
    markupPercent: 'Процент наценки',
    sellingPrice: 'Цена продажи',
    purchasePrice: 'Закупочная цена',
    
    // Цифровой склад - новые переводы
    importFile: 'Импорт файла',
    enterBarcodes: 'Введите штрих-коды',
    totalProducts: 'Всего товаров',
    totalQuantity: 'Всего количества',
    totalValue: 'Общая стоимость',
    categoriesManagement: 'Управление категориями',
    manageCategories: 'Управление категориями',
    deleteAll: 'Удалить всё',
    deleteAllConfirm: 'Удалить все товары?\n\n⚠️ Это удалит все товары из вашего склада.',
    showing: 'Показано',
    of: 'из',
    photo: 'Фото',
    name: 'Название',
    category: 'Категория',
    barcode: 'Штрих-код',
    colors: 'Цвета',
    priceWithMarkup: 'Цена с наценкой',
    totalPrice: 'Итого',
    priceWithMarkupTotal: 'Итого с наценкой',
    actions: 'Действия',
    edit: 'Редактировать',
    delete: 'Удалить',
    yes: 'Да',
    no: 'Нет',
    hasColorOptions: 'Есть цветовые варианты',
    color: 'Цвет',
    any: 'Любой',
    importExcel: 'Excel',
    importCSV: 'CSV',
    importTXT: 'TXT',
    selectFile: 'Выберите файл',
    uploading: 'Загрузка...',
    uploadSuccess: 'Файл успешно загружен',
    uploadFailed: 'Ошибка загрузки файла',
    
    // Админ панель
    adminPanel: 'Админ панель',
    companies: 'Компании',
    addCompany: 'Добавить компанию',
    editCompany: 'Редактировать компанию',
    deleteCompany: 'Удалить компанию',
    users: 'Пользователи',
    orders: 'Заказы',
    statistics: 'Аналитика',
    
    // История продаж
    salesHistory: 'История продаж',
    salesDate: 'Дата продажи',
    salesTotal: 'Сумма продажи',
    salesProfit: 'Прибыль',
    
    // Финансы
    finance: 'Финансы',
    totalRevenue: 'Общий доход',
    totalProfit: 'Общая прибыль',
    totalExpenses: 'Общие расходы',
    frozenInProducts: 'Заморожено в товарах',
    
    // SMM
    smm: 'SMM',
    photos: 'Фотографии',
    videos: 'Видео',
    ads: 'Реклама',
    
    // Chat
    chat: 'Чат',
    
    // Импорт товаров
    importProducts: 'Импорт товаров',
    importFromFile: 'Импорт из файла',
    importExcel: 'Excel',
    importCSV: 'CSV',
    importTXT: 'TXT',
    
    // Цифровая касса
    cashRegister: 'Цифровая касса',
    scanBarcode: 'Сканировать штрих-код',
    enterBarcode: 'Ввести штрих-код',
    total: 'Итого',
    completeSale: 'Завершить продажу',
    
    // Компания - новые переводы
    companyPanel: 'Панель компании',
    salesPanel: 'Панель продаж',
    barcodeSearch: 'Поиск по штрих-коду',
    notifications: 'Уведомления',
    companyManagement: 'Управление компанией',
    
    // Панель продаж (SalesPanel)
    availableProducts: 'Доступные товары',
    manageSales: 'Управление продажами',
    customerOrders: 'Заказы клиентов',
    ordersToday: 'Заказы сегодня',
    salesAmount: 'Сумма продаж',
    profitAmount: 'Прибыль',
    toggleAvailability: 'Переключить доступность',
    availableForCustomers: 'Доступно для клиентов',
    makeAvailable: 'Сделать доступным',
    makeUnavailable: 'Сделать недоступным',
    confirmPayment: 'Подтвердить оплату',
    viewReceipt: 'Просмотреть чек',
    searchByCode: 'Поиск по коду',
    searchOrder: 'Поиск заказа',
    orderNotFound: 'Заказ не найден',
    confirmingPayment: 'Подтверждение оплаты',
    paymentConfirmed: 'Оплата подтверждена',
    bulkActions: 'Массовые действия',
    selectAll: 'Выбрать все',
    deselectAll: 'Отменить выбор',
    
    // Аналитика (AnalyticsPanel)
    analytics: 'Аналитика',
    topProducts: 'Топ-продукты',
    revenueChart: 'График доходов',
    profitMargin: 'Маржа прибыли',
    totalSales: 'Общие продажи',
    averageOrder: 'Средний заказ',
    salesTrend: 'Тенденция продаж',
    productPerformance: 'Производительность продукта',
    dailySales: 'Продажи за день',
    weeklySales: 'Продажи за неделю',
    monthlySales: 'Продажи за месяц',
    
    // Заказы (OrdersPanel)
    allOrders: 'Все заказы',
    pendingOrders: 'Заказы в ожидании',
    completedOrders: 'Завершённые заказы',
    cancelledOrders: 'Отменённые заказы',
    filterByStatus: 'Фильтр по статусу',
    orderDetails: 'Детали заказа',
    customer: 'Клиент',
    phone: 'Телефон',
    orderConfirmed: 'Заказ подтверждён',
    
    // Поиск по штрих-коду (BarcodeSearchPanel)
    barcodeSearchTitle: 'Поиск по штрих-коду',
    enterBarcodeManually: 'Ввести штрих-код вручную',
    scanWithCamera: 'Сканировать с камеры',
    barcodeFound: 'Штрих-код найден',
    barcodeNotFound: 'Штрих-код не найден',
    updateQuantity: 'Обновить количество',
    currentStock: 'Текущий запас',
    newQuantity: 'Новое количество',
    quantityUpdated: 'Количество обновлено',
    
    // Уведомления (NotificationsPanel)
    allNotifications: 'Все уведомления',
    unreadNotifications: 'Непрочитанные уведомления',
    readNotifications: 'Прочитанные уведомления',
    markAsRead: 'Отметить как прочитанное',
    markAsUnread: 'Отметить как непрочитанное',
    deleteNotification: 'Удалить уведомление',
    noNotifications: 'Уведомлений нет',
    newOrder: 'Новый заказ',
    lowStock: 'Низкий запас',
    systemNotification: 'Системное уведомление',
    
    // SMM панель (CompanySMMPanel)
    smmPanel: 'SMM панель',
    companyProfile: 'Профиль компании',
    uploadPhoto: 'Загрузить фото',
    uploadVideo: 'Загрузить видео',
    createAd: 'Создать рекламу',
    mediaGallery: 'Галерея медиа',
    myAds: 'Мои рекламы',
    adTitle: 'Заголовок рекламы',
    adDescription: 'Описание рекламы',
    publishAd: 'Опубликовать рекламу',
    deleteMedia: 'Удалить медиа',
    editMedia: 'Редактировать медиа',
    noMediaYet: 'Медиа ещё нет',
    noAdsYet: 'Рекламы ещё нет',
    
    // Сообщения об ошибках
    errorLoading: 'Ошибка загрузки',
    errorSaving: 'Ошибка сохранения',
    errorDeleting: 'Ошибка удаления',
    errorInvalidData: 'Неверные данные',
    errorNetwork: 'Ошибка сети',
    
    // Подтверждения
    confirmDelete: 'Вы уверены, что хотите удалить?',
    confirmCancel: 'Вы уверены, что хотите отменить?',
    confirmLogout: 'Вы уверены, что хотите выйти?',
  },
  
  uz: {
    // Общие
    welcome: 'Xush kelibsiz',
    settings: 'Sozlamalar',
    save: 'Saqlash',
    cancel: 'Bekor qilish',
    delete: "O'chirish",
    edit: 'Tahrirlash',
    add: "Qo'shish",
    search: 'Qidiruv',
    loading: 'Yuklanmoqda...',
    error: 'Xato',
    success: 'Muvaffaqiyatli',
    confirm: 'Tasdiqlash',
    back: 'Orqaga',
    
    // Магазин покупателя
    store: 'Do\'kon',
    welcomeUser: 'Xush kelibsiz',
    cart: 'Savat',
    myOrders: 'Mening buyurtmalarim',
    likes: 'Tanlangan',
    totalPrice: 'Jami',
    checkout: 'Rasmiylashtirish',
    emptyCart: 'Savat bo\'sh',
    addToCart: 'Savatga',
    removeFromCart: 'Olib tashlash',
    quantity: 'Miqdor',
    price: 'Narx',
    product: 'Mahsulot',
    products: 'Mahsulotlar',
    inStock: 'Mavjud',
    outOfStock: 'Mavjud emas',
    searchProducts: 'Mahsulotlarni qidirish...',
    noProductsFound: 'Mahsulotlar topilmadi',
    
    // Заказы и чеки
    orderCode: 'Buyurtma kodi',
    orderDate: 'Sana',
    orderStatus: 'Holat',
    orderTotal: 'Summa',
    orderItems: 'Mahsulotlar',
    orderPending: 'Kutilmoqda',
    orderPaid: "To'langan",
    orderCancelled: 'Bekor qilingan',
    cancelOrder: 'Buyurtmani bekor qilish',
    deleteReceipt: "Ro'yxatdan o'chirish",
    deleteReceiptConfirm: "Bu chekni savatdan o'chirasizmi?\n\n⚠️ Chek kompaniya tizimida qoladi, faqat sizning ro'yxatingizdan o'chiriladi.",
    receiptDeleted: "Chek savatdan o'chirildi!",
    
    // Оплата
    payment: "To'lov",
    paymentMethod: "To'lov usuli",
    paymentManual: 'Cheklar/Kodlar',
    paymentDemo: 'Demo onlayn',
    paymentReal: 'Haqiqiy onlayn',
    payNow: "To'lash",
    paymentSuccess: "To'lov muvaffaqiyatli",
    paymentFailed: "To'lov xatosi",
    
    // Профиль компании
    companyProfile: 'Kompaniya profili',
    companyName: 'Kompaniya nomi',
    companyLocation: 'Joylashuv',
    companyProducts: 'Mahsulotlar',
    companyPhotos: 'Fotogalereya',
    companyAds: 'Reklama',
    rateCompany: 'Kompaniyani baholang',
    yourRating: 'Sizning bahoyingiz',
    
    // Настройки покупателя
    settingsTitle: 'Sozlamalar',
    language: 'Til',
    languageRussian: 'Ruscha',
    languageUzbek: "O'zbekcha",
    displayMode: 'Displey rejimi',
    displayModeDay: 'Kunduzgi',
    displayModeNight: 'Tungi',
    logout: 'Chiqish',
    
    // Цифровой склад
    inventory: 'Raqamli ombor',
    addProduct: "Mahsulot qo'shish",
    editProduct: 'Mahsulotni tahrirlash',
    deleteProduct: "Mahsulotni o'chirish",
    productName: 'Mahsulot nomi',
    productPrice: 'Narx',
    productQuantity: 'Miqdor',
    productBarcode: 'Shtrix-kod',
    productCategory: 'Kategoriya',
    productImage: 'Rasm',
    markup: 'Ustama',
    markupPercent: 'Ustama foizi',
    sellingPrice: 'Sotuv narxi',
    purchasePrice: 'Xarid narxi',
    
    // Цифровой склад - новые переводы
    importFile: 'Faylni import qilish',
    enterBarcodes: 'Shtrix-kodlarni kiriting',
    totalProducts: 'Jami mahsulotlar',
    totalQuantity: 'Jami miqdor',
    totalValue: 'Jami narx',
    categoriesManagement: 'Kategoriyalarni boshqarish',
    manageCategories: 'Kategoriyalarni boshqarish',
    deleteAll: 'Hammasini o\'chirish',
    deleteAllConfirm: 'Barcha mahsulotlarni o\'chirasizmi?\n\n⚠️ Bu sizning omboringizdan barcha mahsulotlarni o\'chiradi.',
    showing: 'Ko\'rsatilgan',
    of: 'dan',
    photo: 'Rasm',
    name: 'Nomi',
    category: 'Kategoriya',
    barcode: 'Shtrix-kod',
    colors: 'Ranglar',
    priceWithMarkup: 'Ustama bilan narx',
    totalPrice: 'Jami',
    priceWithMarkupTotal: 'Ustama bilan jami narx',
    actions: 'Harakatlar',
    edit: 'Tahrirlash',
    delete: "O'chirish",
    yes: 'Ha',
    no: 'Yo\'q',
    hasColorOptions: 'Rang variantlari mavjud',
    color: 'Rang',
    any: 'Har qanday',
    importExcel: 'Excel',
    importCSV: 'CSV',
    importTXT: 'TXT',
    selectFile: 'Faylni tanlash',
    uploading: 'Yuklanmoqda...',
    uploadSuccess: 'Fayl muvaffaqiyatli yuklandi',
    uploadFailed: 'Faylni yuklashda xato',
    
    // Админ панель
    adminPanel: 'Admin panel',
    companies: 'Kompaniyalar',
    addCompany: "Kompaniya qo'shish",
    editCompany: 'Kompaniyani tahrirlash',
    deleteCompany: "Kompaniyani o'chirish",
    users: 'Foydalanuvchilar',
    orders: 'Buyurtmalar',
    statistics: 'Аналитика',
    
    // История продаж
    salesHistory: 'Sotuv tarixi',
    salesDate: 'Sotuv sanasi',
    salesTotal: 'Sotuv summasi',
    salesProfit: 'Foyda',
    
    // Финансы
    finance: 'Moliya',
    totalRevenue: 'Umumiy daromad',
    totalProfit: 'Umumiy foyda',
    totalExpenses: 'Umumiy xarajatlar',
    frozenInProducts: 'Mahsulotlarda muzlatilgan',
    
    // SMM
    smm: 'SMM',
    photos: 'Fotosuratlar',
    videos: 'Videolar',
    ads: 'Reklama',
    
    // Chat
    chat: 'Chat',
    
    // Импорт товаров
    importProducts: 'Mahsulotlarni import qilish',
    importFromFile: 'Fayldan import qilish',
    importExcel: 'Excel',
    importCSV: 'CSV',
    importTXT: 'TXT',
    
    // Цифровая касса
    cashRegister: 'Raqamli kassa',
    scanBarcode: 'Shtrix-kodni skanerlash',
    enterBarcode: 'Shtrix-kodni kiriting',
    total: 'Jami',
    completeSale: 'Sotuvni yakunlash',
    
    // Компания - новые переводы
    companyPanel: 'Kompaniya paneli',
    salesPanel: 'Sotuv paneli',
    barcodeSearch: 'Shtrix-kod bo\'yicha qidiruv',
    notifications: 'Xabarlar',
    companyManagement: 'Kompaniya boshqaruv',
    
    // Панель продаж (SalesPanel)
    availableProducts: 'Mavjud mahsulotlar',
    manageSales: 'Sotuvlarni boshqarish',
    customerOrders: 'Mijoz buyurtmalari',
    ordersToday: 'Bugungi buyurtmalar',
    salesAmount: 'Sotuv miqdori',
    profitAmount: 'Foyda miqdori',
    toggleAvailability: 'Mavjudlikni o\'zgartirish',
    availableForCustomers: 'Mijozlar uchun mavjud',
    makeAvailable: 'Mavjud qilish',
    makeUnavailable: 'Mavjud emas qilish',
    confirmPayment: 'To\'lovni tasdiqlash',
    viewReceipt: 'Chekni ko\'rish',
    searchByCode: 'Kod bo\'yicha qidirish',
    searchOrder: 'Buyurtmani qidirish',
    orderNotFound: 'Buyurtma topilmadi',
    confirmingPayment: 'To\'lovni tasdiqlash',
    paymentConfirmed: 'To\'lov tasdiqlandi',
    bulkActions: 'Ko\'plab harakatlar',
    selectAll: 'Hammasini tanlash',
    deselectAll: 'Tanlashni bekor qilish',
    
    // Аналитика (AnalyticsPanel)
    analytics: 'Analitika',
    topProducts: 'Eng yuqori mahsulotlar',
    revenueChart: 'Daromad grafigi',
    profitMargin: 'Foyda foizi',
    totalSales: 'Umumiy sotuvlar',
    averageOrder: 'O\'rta buyurtma',
    salesTrend: 'Sotuv tendensiya',
    productPerformance: 'Mahsulot faoliyati',
    dailySales: 'Kundalik sotuvlar',
    weeklySales: 'Haftalik sotuvlar',
    monthlySales: 'Oylik sotuvlar',
    
    // Заказы (OrdersPanel)
    allOrders: 'Barcha buyurtmalar',
    pendingOrders: 'Kutilayotgan buyurtmalar',
    completedOrders: 'Yakunlangan buyurtmalar',
    cancelledOrders: 'Bekor qilingan buyurtmalar',
    filterByStatus: 'Holat bo\'yicha filtrlash',
    orderDetails: 'Buyurtma tafsilotlari',
    customer: 'Mijoz',
    phone: 'Telefon',
    orderConfirmed: 'Buyurtma tasdiqlandi',
    
    // Поиск по штрих-коду (BarcodeSearchPanel)
    barcodeSearchTitle: 'Shtrix-kod bo\'yicha qidiruv',
    enterBarcodeManually: 'Shtrix-kodni qo\'yish',
    scanWithCamera: 'Kamera yordamida skanerlash',
    barcodeFound: 'Shtrix-kod topildi',
    barcodeNotFound: 'Shtrix-kod topilmadi',
    updateQuantity: 'Miqdorni yangilash',
    currentStock: 'Joriy ombor',
    newQuantity: 'Yangi miqdor',
    quantityUpdated: 'Miqdor yangilandi',
    
    // Уведомления (NotificationsPanel)
    allNotifications: 'Barcha xabarlar',
    unreadNotifications: 'O\'qilmagan xabarlar',
    readNotifications: 'O\'qilgan xabarlar',
    markAsRead: 'O\'qilgan deb belgilash',
    markAsUnread: 'O\'qilmagan deb belgilash',
    deleteNotification: 'Xabarni o\'chirish',
    noNotifications: 'Xabarlar yo\'q',
    newOrder: 'Yangi buyurtma',
    lowStock: 'Omborda kam',
    systemNotification: 'Tizim xabari',
    
    // SMM панель (CompanySMMPanel)
    smmPanel: 'SMM paneli',
    companyProfile: 'Kompaniya profili',
    uploadPhoto: 'Rasmni yuklash',
    uploadVideo: 'Videoni yuklash',
    createAd: 'Reklama yaratish',
    mediaGallery: 'Media galereya',
    myAds: 'Mening reklamalari',
    adTitle: 'Reklama sarlavhasi',
    adDescription: 'Reklama tavsifi',
    publishAd: 'Reklamani nashr etish',
    deleteMedia: 'Medaniyatni o\'chirish',
    editMedia: 'Medaniyatni tahrirlash',
    noMediaYet: 'Medaniyat hali yo\'q',
    noAdsYet: 'Reklamalar hali yo\'q',
    
    // Сообщения об ошибках
    errorLoading: 'Yuklash xatosi',
    errorSaving: 'Saqlash xatosi',
    errorDeleting: "O'chirish xatosi",
    errorInvalidData: "Noto'g'ri ma'lumotlar",
    errorNetwork: 'Tarmoq xatosi',
    
    // Подтверждения
    confirmDelete: "O'chirishni xohlaysizmi?",
    confirmCancel: 'Bekor qilishni xohlaysizmi?',
    confirmLogout: 'Chiqishni xohlaysizmi?',
  }
};

// Хук для использования переводов
export function useTranslation(language: Language = 'ru'): Translations {
  return translations[language] || translations.ru;
}

// Get current language from localStorage
export function getCurrentLanguage(): Language {
  // 🔒 ЯЗЫК ЗАБЛОКИРОВАН НА РУССКОМ - ПЕРЕКЛЮЧЕНИЕ ОТКЛЮЧЕНО
  return 'ru'; // Всегда русский, независимо от localStorage
}

// Функция для сохранения языка в localStorage
export function setCurrentLanguage(language: Language): void {
  try {
    localStorage.setItem('app_language', language);
    
    // 🔄 НЕ перезагружаем страницу! Вместо этого отправляем событие
    console.log('🌍 Language changed to:', language);
    window.dispatchEvent(new CustomEvent('languageChange', { detail: language }));
    
  } catch (error) {
    console.error('Error saving language to localStorage:', error);
  }
}