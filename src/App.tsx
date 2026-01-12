import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { CacheProvider } from './utils/cache';
import { ThemeProvider } from './utils/ThemeContext';
import LoginPage from './components/LoginPage';
import SmsVerification from './components/SmsVerification';
import CompanyLogin from './components/CompanyLogin';
import CompanyKeyVerification from './components/CompanyKeyVerification';
import HomePage from './components/HomePage';
import LikesPage from './components/LikesPage';
import SettingsPage from './components/SettingsPage';
import AdminPanel from './components/AdminPanel';
import CompanyPanel from './components/CompanyPanel';
import LoadingScreen from './components/LoadingScreen';
import PaymentPage from './components/PaymentPage';
import MobileOptimization from './components/MobileOptimization';
import CompanyModeSelector from './components/CompanyModeSelector';
import CompanyRegistrationForm from './components/CompanyRegistrationForm';
import PrivateCompanyAccess from './components/PrivateCompanyAccess';
import CustomerRegistrationModeSelector from './components/CustomerRegistrationModeSelector';
import { loginCompany, verifyCompanyAccess, getCompanies, addCompany, getUserLikes, checkServerHealth, getCompanyByCompanyId } from './utils/api';
import { subscribeToReload } from './utils/reloadBroadcast';

type UserType = 'customer' | 'admin' | 'company' | null;

export default function App() {
  return (
    <ThemeProvider>
      <CacheProvider>
        <MobileOptimization />
        <AppContent />
      </CacheProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userType, setUserType] = useState<UserType>(null);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 🔒 ПРИВАТНОСТЬ: Состояния
  const [selectedCompanyMode, setSelectedCompanyMode] = useState<'public' | 'private' | null>(null);
  const [privateCompanyId, setPrivateCompanyId] = useState<string | null>(null);
  const [customerRegistrationMode, setCustomerRegistrationMode] = useState<'public' | 'private' | null>(null);
  
  // Likes & Cart state
  const [likedProductIds, setLikedProductIds] = useState<number[]>([]);
  const [cart, setCart] = useState<{ [key: number]: number }>({});
  
  const [selectedColors, setSelectedColors] = useState<{ [key: number]: string }>(() => {
    const saved = localStorage.getItem('selectedColors');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [viewingImage, setViewingImage] = useState<{ url: string; name: string } | null>(null);
  const [viewingImageIndex, setViewingImageIndex] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem('selectedColors', JSON.stringify(selectedColors));
    } catch (error) {
      console.error('❌ Error saving selected colors:', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('v2_') || key.startsWith('cache_')) {
            localStorage.removeItem(key);
          }
        });
      }
    }
  }, [selectedColors]);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToReload(() => {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white; padding: 16px 24px; border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3); z-index: 999999;
        font-family: Arial, sans-serif; font-size: 16px; font-weight: 600;
        text-align: center; animation: slideDown 0.5s ease;
      `;
      notification.innerHTML = '🔄 Обновление системы...<br><small style="font-weight: 400; font-size: 14px;">Перезагрузка через 2 сек</small>';
      document.body.appendChild(notification);
      setTimeout(() => window.location.reload(), 2000);
    });
    return () => unsubscribe();
  }, []);

  const initializeApp = async () => {
    const startTime = Date.now();
    const MINIMUM_LOADING_TIME = 4600;
    
    try {
      await checkServerHealth();
      const savedSession = localStorage.getItem('userSession');
      
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          if (session.userType === 'customer') {
            setPendingUser(session.userData);
            setUserType('customer');
            if (session.userData?.phone) {
              const savedLikes = await getUserLikes(session.userData.phone).catch(() => []);
              setLikedProductIds(savedLikes || []);
            }
            if (location.pathname === '/' || location.pathname === '/login') {
                navigate('/main');
            }
          } else if (session.userType === 'admin') {
            setPendingUser(session.userData);
            setUserType('admin');
            navigate('/admin');
          } else if (session.userType === 'company') {
            setCurrentCompany(session.companyData);
            setUserType('company');
            navigate('/company/dashboard');
          }
        } catch (error) {
          console.error('Error restoring session:', error);
          localStorage.removeItem('userSession');
        }
      }

      // Check companies (lightweight check mainly for first run logic)
      const companies = await getCompanies();
      if (!companies || companies.length === 0) {
          // Logic for first company creation if needed
          const defaultKey = generateKey();
          try {
             await addCompany({
                name: 'Главная компания',
                phone: '909383572',
                password: '24067',
                access_key: defaultKey
             });
             console.log('Default company created with key:', defaultKey);
          } catch(e) { /* ignore */ }
      }
      
    } catch (error) {
      console.error('❌ Error initializing app:', error);
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = MINIMUM_LOADING_TIME - elapsedTime;
      if (remainingTime > 0) await new Promise(resolve => setTimeout(resolve, remainingTime));
      setLoading(false);
    }
  };

  const generateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 30; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  };

  const handleUserLogin = (userData: any) => {
    setPendingUser(userData);
    if (userData.phone === '914751330') {
      setUserType('admin');
      navigate('/admin');
      localStorage.setItem('userSession', JSON.stringify({ userType: 'admin', userData: userData }));
      return;
    }
    if (userData.companyId) setPrivateCompanyId(userData.companyId);
    handleCustomerLogin(userData);
  };

  const handleCustomerLogin = async (userData: any) => {
    try {
      let actualCompanyId = null;
      if (userData.companyId) {
        try {
          const company = await getCompanyByCompanyId(userData.companyId);
          if (!company.is_private) {
            alert('❌ Эта компания не является приватной.'); return;
          }
          actualCompanyId = company.id;
        } catch {
          alert('❌ Компания не найдена.'); return;
        }
      }
      
      const { addUser } = await import('./utils/api');
      const response = await addUser({ 
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone_number: userData.phone,
        company_id: actualCompanyId ? actualCompanyId.toString() : null
      });

      const updatedUser = {
          ...userData,
          id: response.user?.id,
          firstName: response.user?.first_name || userData.firstName,
          lastName: response.user?.last_name || userData.lastName,
          companyId: response.user?.company_id
      };

      setPendingUser(updatedUser);
      const savedLikes = await getUserLikes(userData.phone).catch(() => []);
      setLikedProductIds(savedLikes || []);
      
      setUserType('customer');
      localStorage.setItem('userSession', JSON.stringify({
        userType: 'customer',
        userData: updatedUser
      }));
      navigate('/main');
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Ошибка при сохранении данных.');
    }
  };

  const handleSmsVerify = async (code: string) => {
    if (pendingUser.phone === '914751330' && code === '15051') {
      setUserType('admin');
      navigate('/admin');
      localStorage.setItem('userSession', JSON.stringify({ userType: 'admin', userData: pendingUser }));
    } else {
      try {
        const { addUser } = await import('./utils/api');
        const response = await addUser({ 
          first_name: pendingUser.firstName,
          last_name: pendingUser.lastName,
          phone_number: pendingUser.phone
        });
        
        const updatedUser = {
            ...pendingUser,
            id: response.user?.id,
            firstName: response.user?.first_name || pendingUser.firstName,
            lastName: response.user?.last_name || pendingUser.lastName
        };

        setPendingUser(updatedUser);
        const savedLikes = await getUserLikes(pendingUser.phone).catch(() => []);
        setLikedProductIds(savedLikes || []);
        
        setUserType('customer');
        localStorage.setItem('userSession', JSON.stringify({
          userType: 'customer',
          userData: updatedUser
        }));
        navigate('/main'); // Go to home after SMS
      } catch (error) {
        console.error('Error saving user:', error);
        alert('Ошибка при сохранении данных.');
      }
    }
  };

  const handleCompanyLogin = async (phone: string, password: string) => {
    try {
      const company = await loginCompany(phone, password);
      setCurrentCompany(company);
      navigate('/company/verify');
      return true;
    } catch (error: any) {
      alert(error.message || 'Ошибка входа');
      return false;
    }
  };

  const handleCompanyKeyVerify = async (key: string) => {
    if (!currentCompany) {
      navigate('/company/login');
      return false;
    }
    try {
      const company = await verifyCompanyAccess(currentCompany.id, key);
      setUserType('company');
      localStorage.setItem('userSession', JSON.stringify({ userType: 'company', companyData: company }));
      navigate('/company/dashboard');
      return true;
    } catch (error: any) {
      alert(error.message || 'Неверный ключ');
      return false;
    }
  };

  const handleLogout = () => {
    setUserType(null);
    setPendingUser(null);
    setCurrentCompany(null);
    setCustomerRegistrationMode(null);
    setPrivateCompanyId(null);
    localStorage.removeItem('userSession');
    navigate('/');
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={
           <CustomerRegistrationModeSelector
              onSelectPublic={() => { setCustomerRegistrationMode('public'); navigate('/login'); }}
              onSelectPrivate={() => { setCustomerRegistrationMode('private'); navigate('/login'); }}
              onSwitchToCompany={() => navigate('/company/login')}
            />
        } />
        
        <Route path="/login" element={
            <LoginPage 
              onLogin={handleUserLogin}
              onSwitchToCompany={() => navigate('/company/login')}
              isPrivateMode={customerRegistrationMode === 'private'}
              onBack={() => navigate('/')}
            />
        } />

        <Route path="/sms" element={
            <SmsVerification 
              phone={pendingUser?.phone}
              onVerify={handleSmsVerify}
              onBack={() => navigate('/login')}
            />
        } />

        <Route path="/main" element={
            <HomePage 
              onLogout={handleLogout}
              userName={pendingUser ? `${pendingUser.firstName} ${pendingUser.lastName}` : undefined}
              userPhone={pendingUser?.phone}
              userCompanyId={pendingUser?.companyId}
              onOpenSettings={() => navigate('/settings')}
              onNavigateTo={(page) => {
                  if (page === 'settings') navigate('/settings');
                  else if (page === 'likes') navigate('/favourites');
                  else if (page === 'home') navigate('/main');
              }}
              onLikesChange={setLikedProductIds}
              likedProductIds={likedProductIds}
              setLikedProductIds={setLikedProductIds}
              cart={cart}
              setCart={setCart}
              selectedColors={selectedColors}
              setSelectedColors={setSelectedColors}
            />
        } />

        <Route path="/favourites" element={
            <LikesPage 
              likedProductIds={likedProductIds}
              setLikedProductIds={setLikedProductIds}
              cart={cart}
              setCart={setCart}
              selectedColors={selectedColors}
              setSelectedColors={setSelectedColors}
              onBackToHome={() => navigate('/main')}
              onLogout={handleLogout}
              userName={pendingUser ? `${pendingUser.firstName} ${pendingUser.lastName}` : undefined}
              userPhone={pendingUser?.phone}
              viewingImage={viewingImage}
              setViewingImage={setViewingImage}
              viewingImageIndex={viewingImageIndex}
              setViewingImageIndex={setViewingImageIndex}
              onNavigateTo={(page) => {
                if (page === 'home') navigate('/main');
                else if (page === 'cart') {
                    // Cart logic
                    localStorage.setItem('openCartOnLoad', 'true');
                    navigate('/main');
                } else if (page === 'settings') navigate('/settings');
              }}
            />
        } />

        <Route path="/settings" element={
            <SettingsPage 
              onLogout={handleLogout}
              userName={pendingUser ? `${pendingUser.firstName} ${pendingUser.lastName}` : undefined}
              userPhone={pendingUser?.phone}
              onBackToHome={() => navigate('/main')}
              onNavigateTo={(page) => {
                if (page === 'home') navigate('/main');
                if (page === 'likes') navigate('/favourites');
              }}
            />
        } />

        <Route path="/company/login" element={
            <CompanyLogin 
              onLogin={handleCompanyLogin}
              onSwitchToCustomer={() => navigate('/login')}
            />
        } />

        <Route path="/company/verify" element={
            <CompanyKeyVerification 
              onVerify={handleCompanyKeyVerify}
              onBack={() => navigate('/company/login')}
            />
        } />

        <Route path="/company/dashboard" element={
            currentCompany ? (
                <CompanyPanel 
                    onLogout={handleLogout} 
                    companyId={currentCompany.id}
                    companyName={currentCompany.name}
                />
            ) : <Navigate to="/company/login" />
        } />

        <Route path="/admin" element={
            <AdminPanel onLogout={handleLogout} />
        } />

        <Route path="/payment" element={
             <PaymentPage 
              onBackToHome={() => navigate('/main')}
              onLogout={handleLogout}
              userName={pendingUser ? `${pendingUser.firstName} ${pendingUser.lastName}` : undefined}
              userPhone={pendingUser?.phone}
            />
        } />

        <Route path="/company/mode" element={
             <CompanyModeSelector
              onSelectMode={(mode) => {
                setSelectedCompanyMode(mode);
                navigate('/company/register');
              }}
            />
        } />

        <Route path="/company/register" element={
             selectedCompanyMode ? (
                <CompanyRegistrationForm
                mode={selectedCompanyMode}
                onBack={() => navigate('/company/mode')}
                onSubmit={async (data) => {
                    try {
                    await addCompany(data);
                    alert(`✅ Компания "${data.name}" успешно создана!`);
                    setSelectedCompanyMode(null);
                    navigate('/login');
                    } catch (error: any) {
                    alert('Ошибка: ' + (error.message || 'Не удалось создать компанию'));
                    }
                }}
                />
             ) : <Navigate to="/company/mode" />
        } />

        <Route path="/private-access" element={
            <PrivateCompanyAccess
              onAccessGranted={async (companyId) => {
                const company = await getCompanyByCompanyId(companyId);
                setPrivateCompanyId(companyId);
                alert(`✅ Доступ получен к компании: ${company.name}`);
                navigate('/main');
              }}
              onBack={() => navigate('/login')}
            />
        } />

         {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
