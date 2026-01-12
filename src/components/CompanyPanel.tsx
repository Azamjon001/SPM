import { useState, useEffect } from 'react';
import { Building2, LogOut, Package, ShoppingCart, Receipt, BarChart3, Barcode, Megaphone, MessageCircle, Menu, X } from 'lucide-react';
import { DigitalWarehouse } from './DigitalWarehouse';
import SalesPanel from './SalesPanel';
import OrdersPanel from './OrdersPanel';
import AnalyticsPanel from './AnalyticsPanel';
import BarcodeSearchPanel from './BarcodeSearchPanel';
import CompanySMMPanel from './CompanySMMPanel';
import CompanyChatPanel from './CompanyChatPanel';
import { getCurrentLanguage, type Language, useTranslation } from '../utils/translations';

interface CompanyPanelProps {
  onLogout: () => void;
  companyId: number;
  companyName: string;
}

export default function CompanyPanel({ onLogout, companyId, companyName }: CompanyPanelProps) {
  const [activeTab, setActiveTab] = useState<'warehouse' | 'sales' | 'orders' | 'analytics' | 'barcode' | 'smm' | 'chat'>('warehouse');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 📱 Для мобильной версии
  
  // 🌍 Система локализации для компании (заблокирована на русском)
  const [language, setLanguage] = useState<Language>(getCurrentLanguage());
  const t = useTranslation(language);
  
  // Слушаем изменения языка
  useEffect(() => {
    const handleLanguageChange = (e: CustomEvent) => {
      setLanguage(e.detail);
    };
    
    window.addEventListener('languageChange', handleLanguageChange as EventListener);
    
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange as EventListener);
    };
  }, []);

  console.log('🏢 [CompanyPanel] Rendered with:', { companyId, companyName, type: typeof companyId });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 📱 Overlay для мобильных (при открытом sidebar) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ✅ SIDEBAR СЛЕВА */}
      <aside className={`
        w-64 bg-white shadow-lg flex flex-col fixed h-full z-30 transition-transform duration-300
        lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Логотип и название компании */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8" />
              <div>
                <h2 className="font-bold text-lg">{companyName}</h2>
                <p className="text-purple-100 text-xs">
                  {language === 'ru' ? 'Компания' : 'Kompaniya'}
                </p>
              </div>
            </div>
            {/* Кнопка закрытия для мобильных */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Навигационные кнопки */}
        <nav className="flex-1 overflow-y-auto py-4">
          <button
            onClick={() => {
              setActiveTab('warehouse');
              setIsSidebarOpen(false); // Закрываем на мобильных после выбора
            }}
            className={`w-full flex items-center gap-3 px-6 py-3 transition-all duration-300 ${
              activeTab === 'warehouse'
                ? 'bg-purple-50 text-purple-600 border-r-4 border-purple-600'
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600 hover:scale-y-105 hover:shadow-lg hover:shadow-purple-200/50'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="font-medium">{t.inventory}</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('sales');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-6 py-3 transition-all duration-300 ${
              activeTab === 'sales'
                ? 'bg-purple-50 text-purple-600 border-r-4 border-purple-600'
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600 hover:scale-y-105 hover:shadow-lg hover:shadow-purple-200/50'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="font-medium">{language === 'ru' ? 'Панель продаж' : 'Sotuv paneli'}</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('orders');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-6 py-3 transition-all duration-300 ${
              activeTab === 'orders'
                ? 'bg-purple-50 text-purple-600 border-r-4 border-purple-600'
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600 hover:scale-y-105 hover:shadow-lg hover:shadow-purple-200/50'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="font-medium">{t.orders}</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('analytics');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-6 py-3 transition-all duration-300 ${
              activeTab === 'analytics'
                ? 'bg-purple-50 text-purple-600 border-r-4 border-purple-600'
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600 hover:scale-y-105 hover:shadow-lg hover:shadow-purple-200/50'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="font-medium">{t.statistics}</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('barcode');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-6 py-3 transition-all duration-300 ${
              activeTab === 'barcode'
                ? 'bg-purple-50 text-purple-600 border-r-4 border-purple-600'
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600 hover:scale-y-105 hover:shadow-lg hover:shadow-purple-200/50'
            }`}
          >
            <Barcode className="w-5 h-5" />
            <span className="font-medium">{language === 'ru' ? 'Штрих-код' : 'Shtrix-kod'}</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('smm');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-6 py-3 transition-all duration-300 ${
              activeTab === 'smm'
                ? 'bg-purple-50 text-purple-600 border-r-4 border-purple-600'
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600 hover:scale-y-105 hover:shadow-lg hover:shadow-purple-200/50'
            }`}
          >
            <Megaphone className="w-5 h-5" />
            <span className="font-medium">{t.smm}</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('chat');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-6 py-3 transition-all duration-300 ${
              activeTab === 'chat'
                ? 'bg-purple-50 text-purple-600 border-r-4 border-purple-600'
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600 hover:scale-y-105 hover:shadow-lg hover:shadow-purple-200/50'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">{t.chat}</span>
          </button>
        </nav>

        {/* Кнопка выхода внизу */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3 rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-5 h-5" />
            {t.logout}
          </button>
        </div>
      </aside>

      {/* ✅ ОСНОВНОЙ КОНТЕНТ СПРАВА */}
      <main className="flex-1 lg:ml-64">
        {/* Header с названием активной панели */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-5">
          <div className="px-4 lg:px-8 py-4 flex items-center gap-4">
            {/* 📱 Кнопка гамбургера (только на мобильных) */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>

            <h1 className="text-xl lg:text-2xl font-bold text-gray-800">
              {activeTab === 'warehouse' && t.inventory}
              {activeTab === 'sales' && (language === 'ru' ? 'Панель продаж' : 'Sotuv paneli')}
              {activeTab === 'orders' && t.orders}
              {activeTab === 'analytics' && t.statistics}
              {activeTab === 'barcode' && (language === 'ru' ? 'Поиск по штрих-коду' : 'Shtrix-kod bo\'yicha qidiruv')}
              {activeTab === 'smm' && t.smm}
              {activeTab === 'chat' && t.chat}
            </h1>
          </div>
        </header>

        {/* Контент панелей */}
        <div className="p-4 lg:p-8">
          {activeTab === 'warehouse' && <DigitalWarehouse companyId={companyId} />}
          {activeTab === 'sales' && <SalesPanel companyId={companyId} />}
          {activeTab === 'orders' && <OrdersPanel companyId={companyId} />}
          {activeTab === 'analytics' && <AnalyticsPanel companyId={companyId} />}
          {activeTab === 'barcode' && <BarcodeSearchPanel companyId={companyId} />}
          {activeTab === 'smm' && <CompanySMMPanel companyId={companyId} companyName={companyName} />}
          {activeTab === 'chat' && <CompanyChatPanel companyId={companyId} companyName={companyName} />}
        </div>
      </main>
    </div>
  );
}