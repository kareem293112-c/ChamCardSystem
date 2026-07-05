
import { 
  LogOut, CreditCard, MapPin, User, QrCode, MessageCircle, 
  ArrowLeft, Wallet, Send, RefreshCw, CheckCircle2, QrCode as QrIcon,
  Search, Smartphone, Wifi, CreditCard as CardIcon, ShieldCheck,
  Zap, Camera, CameraOff, Loader2, Info, Copy, Share2, Image as ImageIcon,
  CheckCircle, XCircle, Clock, ChevronLeft, Tag, Trash, Plus, Gift
} from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Outlet, useNavigate, useLocation } from 'react-router-dom';

// Enforce Lazy Loading for All 7 Profile Sub-Views
const VerifyIdView = lazy(() => import('./components/profile/VerifyIdView'));
const ActiveSessionsView = lazy(() => import('./components/profile/ActiveSessionsView'));
const ChangePinView = lazy(() => import('./components/profile/ChangePinView'));
const TopupChannelsView = lazy(() => import('./components/profile/TopupChannelsView'));
const ComplianceView = lazy(() => import('./components/profile/ComplianceView'));
const FaqView = lazy(() => import('./components/profile/FaqView'));
const SupportTicketView = lazy(() => import('./components/profile/SupportTicketView'));
import { QRCodeCanvas } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { View, Card, AuthSession, AppAction, SystemState, RechargeRequest, Transaction } from './types';
import { authStore } from './store/authStore';
import { rechargeService } from './services/rechargeService';
import { useAdminIdleTimeout } from './hooks/useAdminIdleTimeout';

import BalanceCard from './components/BalanceCard';
import BottomNavigationBar from './components/BottomNavigationBar';
import CardList from './components/CardList';

import TransportMap from './components/TransportMap';
import Profile from './components/Profile';
import Toast from './components/Toast';
import Auth from './components/Auth';
import CardInspector from './components/CardInspector';
import SecurityCenter from './components/SecurityCenter';
import AddCardModal from './components/AddCardModal';
import TransactionsHistory from './components/TransactionsHistory';
import { NfcSyncModal } from './components/NfcSyncModal';

const DriverDashboard = React.lazy(() => import('./components/DriverDashboard').then(m => ({ default: m.DriverDashboard })));
const AdminApp = React.lazy(() => import('./AdminApp'));

// الصورة الأصلية التي قدمها المستخدم (الباركود مع الشعار مدمجين)
const ORIGINAL_QR_IMAGE = "https://images2.imgbox.com/6c/f5/lYn1Qe4c_o.png";

export function generateOfflineSignature(cardId: string, userId: string, timestamp: number): string {
  const secret = 'sham_card_pro_offline_secret_2026_secure';
  const rawData = `${cardId}:${userId}:${timestamp}:${secret}`;
  let hash = 0;
  for (let i = 0; i < rawData.length; i++) {
    const char = rawData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return "offline_" + Math.abs(hash).toString(16);
}

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<AuthSession | null>(() => authStore.getSession());
  const [activeView, setActiveView] = useState<View>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      if (v === 'qr_payment' || v === 'qr') {
        return 'qr_payment';
      }
    } catch (e) {
      console.warn("Error reading URL params", e);
    }
    return 'home';
  });
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<{ from: string, to: string } | null>(null);
  const [syncCard, setSyncCard] = useState<Card | null>(null);
  
  // Recharge Flow States
  const [topupStep, setTopupStep] = useState<'info' | 'upload' | 'confirm'>('info');
  const [rechargeAmount, setRechargeAmount] = useState('5000');
  const [receiptImg, setReceiptImg] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('Syriatel Cash');

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [system, setSystem] = useState<SystemState>({
    isBusy: false,
    busyAction: null,
    nfcStatus: 'IDLE',
    isOnline: navigator.onLine
  });

  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const checkIsMobile = () => {
      // Sniff user agent for mobile operating systems
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileUA = mobileRegex.test(userAgent);

      // Check for touch capability
      const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      
      // Check coarse pointer (touchscreens)
      const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

      // Combine factors for a bulletproof check
      return isMobileUA || (hasTouch && isCoarsePointer);
    };
    setIsMobile(checkIsMobile());
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    // Scroll to the absolute top of the page on route/view changes
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (location.pathname.startsWith('/profile')) {
      if (activeView !== 'profile') {
        setActiveView('profile');
      }
    } else if (location.pathname === '/' || location.pathname === '') {
      if (activeView === 'profile') {
        setActiveView('home');
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    if (activeView === 'profile') {
      if (!location.pathname.startsWith('/profile')) {
        navigate('/profile');
      }
    } else {
      if (location.pathname.startsWith('/profile')) {
        navigate('/');
      }
    }
  }, [activeView]);

  // Passenger/user session automatic idle timeout of 5 minutes
  useAdminIdleTimeout({
    onTimeout: () => {
      if (session) {
        authStore.clearSession();
        setSession(null);
        setActiveView('home');
        triggerToast('تم تسجيل الخروج تلقائياً لعدم النشاط لحماية حسابك', 'error');
      }
    },
    timeoutMs: 5 * 60 * 1000 // 5 minutes
  });

  // Request persistent storage
  useEffect(() => {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(persistent => {
        if (persistent) {
          console.log("Storage will not be cleared by the UA.");
        } else {
          console.log("Storage may be cleared by the UA under pressure.");
        }
      });
    }
  }, []);

  const [showInspector, setShowInspector] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);

  // Offers & Admin-Offers State Variables
  const [offers, setOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [adminTab, setAdminTab] = useState<'requests' | 'offers'>('requests');

  // Form states for new offer
  const [newOfferTitle, setNewOfferTitle] = useState('');
  const [newOfferDesc, setNewOfferDesc] = useState('');
  const [newOfferDiscount, setNewOfferDiscount] = useState('');
  const [newOfferCode, setNewOfferCode] = useState('');
  const [newOfferExpiry, setNewOfferExpiry] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

  const handleSaveRoute = useCallback((from: string, to: string) => {
    const saved = localStorage.getItem('user_routes');
    const list = saved ? JSON.parse(saved) : [];
    const exists = list.some((r: any) => r.from === from && r.to === to);
    if (!exists) {
      const newRoute = {
        id: Math.random().toString(36).substr(2, 9),
        from,
        to,
        icon: 'MapPin'
      };
      list.push(newRoute);
      localStorage.setItem('user_routes', JSON.stringify(list));
      triggerToast('تم حفظ المسار في حسابك', 'success');
    }
  }, []);

  const handleIsRouteSaved = useCallback((from: string, to: string) => {
    const saved = localStorage.getItem('user_routes');
    const list = saved ? JSON.parse(saved) : [];
    return list.some((r: any) => r.from === from && r.to === to);
  }, []);

  const handleSelectRoute = useCallback((route: { from: string, to: string }) => {
    setSelectedRoute(route);
    setActiveView('transport');
  }, []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [cards, setCards] = useState<Card[]>([]);

  const loadDashboard = useCallback(() => {
    if (!session?.token) return;
    fetch('/api/dashboard', {
      headers: {
        'Authorization': `Bearer ${session.token}`
      }
    })
    .then(res => {
      if (res.ok) return res.json();
      if (res.status === 401 || res.status === 404) {
        authStore.clearSession();
        setSession(null);
        return null;
      }
      throw new Error("Failed to load dashboard data");
    })
    .then(data => {
      if (!data) return;
      if (data.cards) {
        setCards(data.cards);
      }
      if (data.transactions) {
        setTransactions(data.transactions);
      }
      if (data.user) {
        setSession(prev => prev ? { ...prev, user: { ...prev.user, ...data.user } } : null);
      }
    })
    .catch(err => {
      console.error("Error fetching dashboard:", err);
    });
  }, [session?.token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const fetchOffers = useCallback(() => {
    setLoadingOffers(true);
    fetch('/api/offers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOffers(data);
        }
        setLoadingOffers(false);
      })
      .catch(err => {
        console.error("Error loading offers:", err);
        setLoadingOffers(false);
      });
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  useEffect(() => {
    if (syncCard && showInspector) {
      setShowInspector(false);
    }
  }, [syncCard, showInspector]);

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferTitle || !newOfferDesc) {
      triggerToast('يرجى ملء الحقول الأساسية', 'error');
      return;
    }
    if (!session?.token) return;

    setIsSubmittingOffer(true);
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({
          title: newOfferTitle,
          description: newOfferDesc,
          discount: newOfferDiscount,
          code: newOfferCode,
          expiryDate: newOfferExpiry
        })
      });
      if (res.ok) {
        triggerToast('تمت إضافة العرض بنجاح', 'success');
        setNewOfferTitle('');
        setNewOfferDesc('');
        setNewOfferDiscount('');
        setNewOfferCode('');
        setNewOfferExpiry('');
        fetchOffers();
      } else {
        const errData = await res.json();
        triggerToast(errData.message || 'فشل إضافة العرض', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('حدث خطأ أثناء إضافة العرض', 'error');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!session?.token) return;
    try {
      const res = await fetch(`/api/offers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });
      if (res.ok) {
        triggerToast('تم حذف العرض بنجاح', 'success');
        fetchOffers();
      } else {
        triggerToast('فشل حذف العرض', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('حدث خطأ أثناء حذف العرض', 'error');
    }
  };

  useEffect(() => {
    const handleSync = () => {
      const pending = JSON.parse(localStorage.getItem('pending_offline_trips') || '[]');
      if (pending.length > 0 && session?.token && navigator.onLine) {
        console.log("Online status detected. Syncing offline QR transactions...");
        Promise.all(pending.map((trip: any) => {
          return fetch('/api/trips/pay-qr', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.token}`
            },
            body: JSON.stringify({ cardId: trip.cardId, busId: 'bus_M1' })
          });
        }))
        .then(() => {
          localStorage.setItem('pending_offline_trips', '[]');
          loadDashboard();
          triggerToast('تمت مزامنة عمليات الدفع غير المتصلة بنجاح', 'success');
        })
        .catch(err => console.error("Error syncing offline transactions:", err));
      }
    };

    window.addEventListener('online', handleSync);
    if (navigator.onLine) {
      handleSync();
    }
    return () => window.removeEventListener('online', handleSync);
  }, [session?.token, loadDashboard]);

  const handleApproveRecharge = useCallback((requestId: string, amount: number, userId: string) => {
    rechargeService.updateStatus(requestId, 'approved');
    if (session && session.user.phone === userId) {
      setCards(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          if (updated[0].type === 'physical') {
            updated[0].pendingNfcAmount = (updated[0].pendingNfcAmount || 0) + amount;
          } else {
            updated[0].balance += amount;
          }
        }
        return updated;
      });
      setTransactions(prev => [
        {
          id: 'tx_' + Math.random().toString(36).substr(2, 9),
          cardId: cards[0]?.id || '1',
          cardName: cards[0]?.alias || 'البطاقة الافتراضية',
          type: 'recharge',
          title: 'شحن رصيد مقبول',
          subtitle: cards[0]?.type === 'physical' ? 'معلق بانتظار NFC' : 'تم شحن الرصيد مباشرة',
          amount,
          timestamp: Date.now()
        },
        ...prev
      ]);
      triggerToast(`تم قبول الشحن وإضافة ${amount.toLocaleString()} ل.س لرصيدك`, 'success');
    } else {
      triggerToast('تم قبول طلب الشحن وإعلام المشترك', 'success');
    }
  }, [session, cards]);

  const triggerToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const dispatchAction = useCallback(async (action: AppAction) => {
    if (system.isBusy) return;
    switch (action) {
      case 'PAY_QR': setActiveView('qr_payment'); break;
      case 'INSPECT_NFC': 
      case 'TOP_UP_NFC':
        setShowInspector(true); 
        setSystem(p => ({...p, nfcStatus: 'READY'})); 
        break;
      case 'TRIGGER_SCAN':
        setSystem(p => ({...p, nfcStatus: 'SCANNING'}));
        break;
      case 'TRIGGER_WRITE':
        setSystem(p => ({...p, nfcStatus: 'WRITING'}));
        break;
      case 'ADD_NEW_CARD':
        setShowAddCard(true);
        break;
      case 'TOP_UP_BALANCE': setTopupStep('info'); setActiveView('topup'); break;
      case 'TRANSFER_FUNDS': setActiveView('transfer'); break;
      case 'NAVIGATE_HOME': setActiveView('home'); break;
      case 'NAVIGATE_CARDS': setActiveView('cards'); break;
      case 'NAVIGATE_TRANSPORT': setActiveView('transport'); break;
      case 'NAVIGATE_PROFILE': setActiveView('profile'); break;
      case 'NAVIGATE_ADMIN_REQUESTS': setActiveView('admin_requests'); break;
      case 'GOTO_SECURITY': setActiveView('security'); break;
  const handleLogout = () => {
    if (!navigator.onLine) {
        alert("لا يمكن تسجيل الخروج أثناء وضع عدم الاتصال. يرجى الاتصال بالإنترنت لمزامنة البيانات.");
        return;
    }
    // Check for pending offline trips
    const pending = localStorage.getItem('pending_offline_trips');
    if (pending && JSON.parse(pending).length > 0) {
        alert("يوجد تذاكر عبور لم تتم مزامنتها. يرجى الانتظار حتى اكتمال المزامنة قبل تسجيل الخروج.");
        return;
    }
    authStore.clearSession(); 
    setSession(null); 
    setActiveView('home'); 
  };

  // ... (inside the switch)
  case 'PERFORM_LOGOUT': handleLogout(); break;
    }
  }, [system.isBusy]);



  const renderView = () => {
    switch(activeView) {
      case 'admin_login':
        return (
          <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-900 text-white font-bold text-center">جاري تحميل لوحة التحكم...</div>}>
            <AdminApp />
          </React.Suspense>
        );
      case 'driver':
        return (
          <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-950 text-emerald-400 font-bold text-center">جاري تحميل واجهة السائق...</div>}>
            <DriverDashboard />
          </React.Suspense>
        );
      case 'topup':
        if (topupStep !== 'confirm') {
          return (
            <ActionView 
              onBack={() => { setActiveView('home'); setTopupStep('info'); }}
              title="شحن رصيد المحفظة" 
              subtitle="أدخل قيمة الشحن المطلوبة واختر وسيلة الدفع المناسبة" 
              icon={<Wallet />} 
              hideConfirm
            >
               <div className="space-y-6">
                  {/* Amount Input */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                     <p className="text-[10px] font-black text-slate-400 mb-3 uppercase text-right">قيمة الشحن المطلوبة (ل.س) *</p>
                     <input 
                       type="number" 
                       value={rechargeAmount}
                       onChange={e => setRechargeAmount(e.target.value)}
                       className="w-full text-center text-4xl font-black bg-transparent outline-none dark:text-white"
                       placeholder="0"
                     />
                     
                     {/* Presets */}
                     <div className="grid grid-cols-4 gap-2 mt-4">
                       {['5000', '10000', '25000', '50000'].map((preset) => (
                         <button
                           key={preset}
                           type="button"
                           onClick={() => setRechargeAmount(preset)}
                           className={`py-2 px-1 text-xs font-black rounded-xl border transition-all ${
                             rechargeAmount === preset
                               ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                               : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                           }`}
                         >
                           {parseInt(preset).toLocaleString()}
                         </button>
                       ))}
                     </div>
                  </div>

                  {/* Payment Method selector */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm text-right">
                    <p className="text-[10px] font-black text-slate-400 mb-4 uppercase">وسيلة الدفع الإلكتروني *</p>
                    <div className="space-y-3">
                      {[
                        { id: 'Syriatel Cash', name: 'سيريتل كاش (Syriatel Cash)', desc: 'دفع فوري عبر حساب سيريتل كاش', color: 'border-red-500/20 hover:border-red-500/50', activeColor: 'border-red-500 bg-red-500/5 text-red-600 dark:text-red-400' },
                        { id: 'MTN Cash', name: 'كاش بموبايلك (MTN Cash)', desc: 'دفع فوري عبر حساب كاش بموبايلك', color: 'border-yellow-500/20 hover:border-yellow-500/50', activeColor: 'border-yellow-500 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400' },
                        { id: 'BIMO', name: 'بيمو الدفع الإلكتروني', desc: 'عبر تطبيق بنك بيمو السعودي الفرنسي', color: 'border-blue-500/20 hover:border-blue-500/50', activeColor: 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400' },
                        { id: 'Cash', name: 'دفع نقدي عبر الموزع المعتمَد', desc: 'تعبئة فورية لدى أقرب كشك أو مكتب معتمد', color: 'border-emerald-500/20 hover:border-emerald-500/50', activeColor: 'border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' }
                      ].map((method) => {
                        const isSelected = paymentMethod === method.id;
                        return (
                          <div
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id)}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                              isSelected ? method.activeColor : `${method.color} bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-850`
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-extrabold text-sm">{method.name}</h4>
                                <p className="text-[10px] text-slate-400 mt-1">{method.desc}</p>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-current' : 'border-slate-300 dark:border-slate-750'}`}>
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-current"></div>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submission Info */}
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold leading-normal text-right">
                    سيتم تفعيل الرصيد مباشرة في محفظتك الإلكترونية فور معالجة طلبك عبر {paymentMethod === 'Syriatel Cash' ? 'سيريتل كاش' : paymentMethod === 'MTN Cash' ? 'كاش بموبايلك' : paymentMethod === 'BIMO' ? 'بنك بيمو' : 'الموزع المعتمد'}.
                  </div>

                  <button 
                    disabled={!rechargeAmount || parseInt(rechargeAmount) <= 0}
                    onClick={async () => {
                      const ok = await rechargeService.submitRequest({
                        userId: session?.user.phone || 'unknown',
                        userName: session?.user.fullName || 'User',
                        amount: parseInt(rechargeAmount),
                        receiptImage: 'none',
                        paymentMethod: paymentMethod,
                      } as any, session?.token || '');
                      
                      if (ok) {
                        setTopupStep('confirm');
                      } else {
                        triggerToast('فشل إرسال طلب الشحن. يرجى المحاولة لاحقاً', 'error');
                      }
                    }}
                    className="w-full bg-emerald-600 text-white font-black py-6 rounded-[32px] text-xl disabled:opacity-50 shadow-xl active:scale-95 transition-all"
                  >
                    تأكيد وإرسال طلب الشحن
                  </button>
               </div>
            </ActionView>
          );
        }

        if (topupStep === 'confirm') {
          return (
            <div className="p-8 pt-24 text-center animate-in zoom-in duration-500 flex flex-col min-h-screen">
               <div className="w-32 h-32 bg-emerald-500 rounded-[48px] flex items-center justify-center mx-auto mb-10 shadow-2xl relative">
                  <div className="absolute inset-0 bg-emerald-500 rounded-[48px] animate-ping opacity-20"></div>
                  <CheckCircle2 size={64} className="text-white" />
               </div>
               <h2 className="text-4xl font-black dark:text-white mb-2">طلبك قيد المعالجة</h2>
               <p className="text-slate-400 font-bold mb-4 px-6">تم إرسال طلب الشحن بنجاح وسنقوم بإشعارك فور تفعيله تلقائياً.</p>
               <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-right space-y-2 mb-12">
                 <p className="text-xs text-slate-500">تفاصيل العملية:</p>
                 <p className="text-sm font-black dark:text-white">المبلغ المطلوب: <span className="text-emerald-500">{parseInt(rechargeAmount).toLocaleString()} ل.س</span></p>
                 <p className="text-sm font-black dark:text-white">طريقة الدفع: <span>{paymentMethod === 'Syriatel Cash' ? 'سيريتل كاش' : paymentMethod === 'MTN Cash' ? 'كاش بموبايلك' : paymentMethod === 'BIMO' ? 'بيمو الدفع الإلكتروني' : 'موزع معتمد'}</span></p>
               </div>
               <button onClick={() => { setActiveView('home'); setTopupStep('info'); }} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-6 rounded-[32px] text-xl mt-auto mb-10">العودة للرئيسية</button>
            </div>
          );
        }
        return null;

      case 'admin_requests':
        return (
          <div className="p-6 pt-16 flex flex-col min-h-screen pb-36 animate-in fade-in" dir="rtl">
             <div className="flex justify-between items-center mb-6">
                <button onClick={() => setActiveView('home')} className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm"><ArrowLeft className="rotate-180 dark:text-white" /></button>
                <h2 className="text-2xl font-black dark:text-white">لوحة الإشراف والإدارة</h2>
             </div>

             {/* Admin Section Tabs */}
             <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl mb-8">
                <button 
                  onClick={() => setAdminTab('requests')} 
                  className={`flex-1 py-3 text-xs font-black rounded-xl transition ${adminTab === 'requests' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}
                >
                  طلبات الشحن المعلقة ({rechargeService.getRequests().filter(r => r.status === 'pending').length})
                </button>
                <button 
                  onClick={() => setAdminTab('offers')} 
                  className={`flex-1 py-3 text-xs font-black rounded-xl transition ${adminTab === 'offers' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}
                >
                  إدارة العروض والخصومات
                </button>
             </div>

             {adminTab === 'requests' ? (
               <div className="space-y-4">
                  {rechargeService.getRequests().filter(r => r.status === 'pending').length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8">
                      <CheckCircle2 className="mx-auto text-emerald-500 w-16 h-16 mb-4" />
                      <h4 className="text-lg font-bold dark:text-white mb-2">لا توجد طلبات معلقة</h4>
                      <p className="text-slate-400 text-sm">لقد قمت بمعالجة كافة طلبات شحن رصيد المستخدمين بنجاح!</p>
                    </div>
                  ) : (
                    rechargeService.getRequests().filter(r => r.status === 'pending').map(req => (
                      <div key={req.id} className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                         <div className="flex justify-between mb-4">
                            <div className="text-right">
                               <p className="font-black dark:text-white">{req.userName}</p>
                               <p className="text-[10px] text-slate-400">{req.userId}</p>
                            </div>
                            <p className="text-xl font-black text-emerald-600">{req.amount.toLocaleString()} ل.س</p>
                         </div>
                         <img src={req.receiptImage} className="w-full h-48 object-cover rounded-2xl mb-4 border border-slate-100" />
                         <div className="flex gap-3">
                            <button onClick={() => { handleApproveRecharge(req.id, req.amount, req.userId); setActiveView('admin_requests'); }} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-500 transition">موافقة</button>
                            <button onClick={() => { rechargeService.updateStatus(req.id, 'rejected'); triggerToast('تم الرفض', 'error'); setActiveView('admin_requests'); }} className="flex-1 bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 transition">رفض</button>
                         </div>
                      </div>
                    ))
                  )}
               </div>
             ) : (
               <div className="space-y-8 animate-in fade-in duration-300">
                 {/* Add Offer Form */}
                 <form onSubmit={handleAddOffer} className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4 text-right">
                    <h3 className="text-sm font-black dark:text-white mb-2 flex items-center gap-2">
                      <Gift className="text-emerald-500" size={20} />
                      إضافة عرض ترويجي جديد
                    </h3>
                    
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 mb-1.5">عنوان العرض العريض *</label>
                       <input 
                         type="text"
                         required
                         value={newOfferTitle}
                         onChange={(e) => setNewOfferTitle(e.target.value)}
                         placeholder="مثال: حسم 10% لطلاب الجامعات"
                         className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-xs dark:text-white outline-none focus:border-emerald-500"
                       />
                    </div>

                    <div>
                       <label className="block text-[10px] font-black text-slate-400 mb-1.5">تفاصيل العرض ووصفه *</label>
                       <textarea 
                         required
                         value={newOfferDesc}
                         onChange={(e) => setNewOfferDesc(e.target.value)}
                         placeholder="اشرح شروط العرض وطريقة الاستفادة منه بالتفصيل..."
                         rows={2}
                         className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-xs dark:text-white outline-none focus:border-emerald-500"
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-1.5">نسبة/قيمة الخصم</label>
                          <input 
                            type="text"
                            value={newOfferDiscount}
                            onChange={(e) => setNewOfferDiscount(e.target.value)}
                            placeholder="مثال: %10+ أو مجاني"
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-xs dark:text-white outline-none focus:border-emerald-500"
                          />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-1.5">رمز الكوبون (إن وجد)</label>
                          <input 
                            type="text"
                            value={newOfferCode}
                            onChange={(e) => setNewOfferCode(e.target.value)}
                            placeholder="مثال: SHAM10"
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-xs dark:text-white outline-none focus:border-emerald-500 font-mono tracking-wider text-right"
                          />
                       </div>
                    </div>

                    <div>
                       <label className="block text-[10px] font-black text-slate-400 mb-1.5">تاريخ الانتهاء</label>
                       <input 
                         type="text"
                         value={newOfferExpiry}
                         onChange={(e) => setNewOfferExpiry(e.target.value)}
                         placeholder="مثال: 2026-12-31"
                         className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-xs dark:text-white outline-none focus:border-emerald-500"
                       />
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmittingOffer}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:bg-emerald-400 text-white font-black py-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmittingOffer ? <Loader2 className="animate-spin w-4 h-4" /> : 'حفظ ونشر العرض فوراً'}
                    </button>
                 </form>

                 {/* Offers List */}
                 <div className="space-y-4">
                    <h3 className="text-sm font-black dark:text-white mb-2 text-right">العروض المنشورة حالياً</h3>
                    {offers.length === 0 ? (
                      <p className="text-xs font-bold text-slate-400 text-center py-6">لا توجد عروض منشورة في النظام حالياً.</p>
                    ) : (
                      offers.map((offer) => (
                        <div key={offer.id} className="bg-white dark:bg-slate-900 rounded-[24px] p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center text-right">
                           <div className="flex-1 min-w-0 pr-2">
                              <p className="font-extrabold text-xs dark:text-white truncate">{offer.title}</p>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">{offer.description}</p>
                              {offer.code && <span className="inline-block mt-2 bg-slate-100 dark:bg-slate-800 text-emerald-600 font-mono text-[9px] font-black px-2 py-0.5 rounded">كوبون: {offer.code}</span>}
                           </div>
                           <button 
                             onClick={() => {
                               if (confirm('هل أنت متأكد من حذف هذا العرض؟')) {
                                 handleDeleteOffer(offer.id);
                               }
                             }} 
                             className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition"
                           >
                             <Trash size={16} />
                           </button>
                        </div>
                      ))
                    )}
                 </div>
               </div>
             )}
          </div>
        );

      case 'cards':
        return (
          <div className="bg-slate-50 dark:bg-slate-950 min-h-screen animate-in fade-in pt-12 pb-24" dir="rtl">
            <CardList 
              cards={cards} 
              onDeleteCard={(id) => {
                if (session?.token) {
                  fetch(`/api/cards/${id}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${session.token}`
                    }
                  })
                  .then(res => {
                    if (res.ok) {
                      setCards(prev => prev.filter(c => c.id !== id));
                      triggerToast('تم حذف البطاقة بنجاح', 'success');
                    } else {
                      triggerToast('فشل حذف البطاقة من الخادم', 'error');
                    }
                  })
                  .catch(() => {
                    triggerToast('حدث خطأ أثناء الاتصال بالخادم الرئيسي', 'error');
                  });
                } else {
                  setCards(prev => prev.filter(c => c.id !== id));
                  triggerToast('تم حذف البطاقة بنجاح', 'success');
                }
              }} 
              onRenameCard={(id, newAlias) => {
                if (session?.token) {
                  fetch(`/api/cards/${id}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.token}`
                    },
                    body: JSON.stringify({ alias: newAlias })
                  })
                  .then(res => {
                    if (res.ok) {
                      setCards(prev => prev.map(c => c.id === id ? { ...c, alias: newAlias } : c));
                      triggerToast('تم تعديل اسم البطاقة بنجاح', 'success');
                    } else {
                      triggerToast('فشل تعديل اسم البطاقة بالخادم', 'error');
                    }
                  })
                  .catch(() => {
                    triggerToast('حدث خطأ أثناء الاتصال بالخادم الرئيسي', 'error');
                  });
                } else {
                  setCards(prev => prev.map(c => c.id === id ? { ...c, alias: newAlias } : c));
                  triggerToast('تم تعديل اسم البطاقة بنجاح', 'success');
                }
              }}
              onMakePrimary={(id) => {
                setCards(prev => {
                  const idx = prev.findIndex(c => c.id === id);
                  if (idx <= 0) return prev;
                  const updated = [...prev];
                  const [item] = updated.splice(idx, 1);
                  return [item, ...updated];
                });
                triggerToast('تم تعيين البطاقة كافتراضية', 'success');
              }}
              dispatch={dispatchAction} 
              getPermission={() => ({ allowed: true })} 
              onTriggerNfcSync={(card) => setSyncCard(card)}
            />
          </div>
        );

      case 'offers':
        return (
          <div className="p-6 pt-16 flex flex-col min-h-screen pb-36 animate-in fade-in" dir="rtl">
             {/* Header */}
             <div className="mb-8 text-right space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                   <Gift size={26} />
                </div>
                <h2 className="text-3xl font-black dark:text-white">عروض الشام الرقمية</h2>
                <p className="text-slate-400 font-bold text-xs">توفير مستمر وحسم حقيقي على رحلاتك اليومية</p>
             </div>

             {/* Offers List */}
             {loadingOffers ? (
               <div className="flex flex-col items-center justify-center py-20 space-y-4">
                 <Loader2 className="animate-spin text-emerald-600 w-10 h-10" />
                 <p className="text-sm font-bold text-slate-400">جاري تحميل العروض المتوفرة...</p>
               </div>
             ) : offers.length === 0 ? (
               <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8">
                 <Tag className="mx-auto text-slate-300 dark:text-slate-700 w-16 h-16 mb-4" />
                 <h4 className="text-lg font-bold dark:text-white mb-2">لا توجد عروض حالياً</h4>
                 <p className="text-slate-400 text-sm">ترقبوا إطلاق عروض جديدة قريباً من قبل إدارة بطاقة الشام الرقمية.</p>
               </div>
             ) : (
               <div className="space-y-6">
                 {offers.map((offer) => (
                   <div key={offer.id} className="relative overflow-hidden bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] p-6 shadow-md transition-all hover:shadow-lg animate-in slide-in-from-bottom duration-300">
                     {/* Circular notches on the side to look like a real ticket */}
                     <div className="absolute top-1/2 -left-4 w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-950 -translate-y-1/2 border-r-2 border-dashed border-slate-200 dark:border-slate-800"></div>
                     <div className="absolute top-1/2 -right-4 w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-950 -translate-y-1/2 border-l-2 border-dashed border-slate-200 dark:border-slate-800"></div>

                     <div className="flex justify-between items-start mb-3 pl-2 pr-2">
                       <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] px-3 py-1.5 rounded-full">
                         {offer.discount || "حسم خاص"}
                       </span>
                       {offer.expiryDate && (
                         <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                           <Clock size={12} />
                           ينتهي: {offer.expiryDate}
                         </span>
                       )}
                     </div>

                     <div className="px-2">
                       <h3 className="text-lg font-black dark:text-white mb-2 leading-snug">{offer.title}</h3>
                       <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-4">{offer.description}</p>

                       {offer.code && (
                         <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 mt-2">
                           <div className="text-right">
                             <p className="text-[9px] text-slate-400 font-bold">رمز الكوبون</p>
                             <p className="text-sm font-black font-mono text-emerald-600 tracking-wider mt-0.5">{offer.code}</p>
                           </div>
                           <button 
                             onClick={() => {
                               navigator.clipboard.writeText(offer.code);
                               triggerToast('تم نسخ رمز الخصم', 'success');
                             }}
                             className="bg-emerald-600 text-white p-2 rounded-xl text-xs font-bold hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-1.5 px-3"
                           >
                             <Copy size={12} />
                             نسخ
                           </button>
                         </div>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        );

      case 'transport':
        return (
          <div className="relative w-full h-screen animate-in fade-in" dir="rtl">
            <div className="w-full h-full pb-24">
              <TransportMap 
                initialRoute={selectedRoute} 
                onSaveRoute={handleSaveRoute} 
                isAlreadySaved={handleIsRouteSaved} 
              />
            </div>
          </div>
        );

      case 'profile':
        return (
          <Routes>
            <Route path="/profile/*" element={
              <div className="bg-slate-50 dark:bg-slate-950 min-h-screen animate-in fade-in pb-24" dir="rtl">
                <Profile 
                  user={session?.user || null} 
                  dispatch={dispatchAction} 
                  getPermission={() => ({ allowed: true })} 
                  onSelectRoute={handleSelectRoute} 
                  isDarkMode={isDarkMode} 
                  onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
                  onNotify={() => triggerToast('لا توجد إشعارات جديدة حالياً', 'success')} 
                />
              </div>
            }>
              <Route path="verify-id" element={<Suspense fallback={<div className="text-white text-center p-4">جاري التحميل...</div>}><VerifyIdView /></Suspense>} />
              <Route path="active-sessions" element={<Suspense fallback={<div className="text-white text-center p-4">جاري التحميل...</div>}><ActiveSessionsView /></Suspense>} />
              <Route path="change-pin" element={<Suspense fallback={<div className="text-white text-center p-4">جاري التحميل...</div>}><ChangePinView /></Suspense>} />
              <Route path="topup-channels" element={<Suspense fallback={<div className="text-white text-center p-4">جاري التحميل...</div>}><TopupChannelsView /></Suspense>} />
              <Route path="compliance" element={<Suspense fallback={<div className="text-white text-center p-4">جاري التحميل...</div>}><ComplianceView /></Suspense>} />
              <Route path="faq" element={<Suspense fallback={<div className="text-white text-center p-4">جاري التحميل...</div>}><FaqView /></Suspense>} />
              <Route path="support-ticket" element={<Suspense fallback={<div className="text-white text-center p-4">جاري التحميل...</div>}><SupportTicketView /></Suspense>} />
            </Route>
          </Routes>
        );

      case 'security':
        return (
          <SecurityCenter onBack={() => setActiveView('profile')} />
        );

      case 'transfer':
        return (
          <TransferView 
            cards={cards} 
            setCards={setCards} 
            setTransactions={setTransactions}
            triggerToast={triggerToast} 
            setActiveView={setActiveView} 
          />
        );

      case 'qr_payment':
        return (
          <QrPaymentView 
            cards={cards} 
            setCards={setCards} 
            setTransactions={setTransactions}
            triggerToast={triggerToast} 
            setActiveView={setActiveView} 
          />
        );

      case 'transactions_history':
        return (
          <TransactionsHistory 
            transactions={transactions} 
            onBack={() => setActiveView('home')} 
          />
        );

      default:
        return (
          <div className="space-y-6 pb-36">
             <header className="px-6 pt-2 flex justify-between items-center">
                <div className="flex items-center gap-4 text-right">
                   <img src={session?.user.avatar} className="w-12 h-12 rounded-2xl border-2 border-emerald-500 shadow-lg" alt="avatar" />
                   <div><h1 className="text-xl font-black dark:text-white">أهلاً، {session?.user.fullName.split(' ')[0]}</h1></div>
                </div>
                <div className="flex gap-2">
                   
                   {session?.role === 'admin' && (
                     <button onClick={() => setActiveView('admin_requests')} className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm relative">
                        <ShieldCheck size={24} />
                        {rechargeService.getRequests().filter(r => r.status === 'pending').length > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{rechargeService.getRequests().filter(r => r.status === 'pending').length}</span>
                        )}
                     </button>
                   )}
                   
                </div>
             </header>

             {cards[0]?.pendingNfcAmount && cards[0].pendingNfcAmount > 0 ? (
               <div 
                 onClick={() => {
                   setSyncCard(cards[0]);
                    //
                   setShowInspector(true);
                 }}
                 className="mx-6 p-5 justify-between items-center flex rounded-[32px] bg-amber-500/10 dark:bg-amber-500/20 border-2 border-amber-500/20 hover:border-amber-500/40 text-amber-800 dark:text-amber-300 cursor-pointer animate-pulse transition active:scale-95 duration-500"
               >
                 <div className="flex items-center gap-4 text-right">
                   <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-sm">NFC</div>
                   <div>
                     <h4 className="font-extrabold text-xs leading-tight">شحن رصيد معلق بانتظار NFC</h4>
                     <p className="text-[10px] font-bold mt-1 text-amber-600 dark:text-amber-400">مرر البطاقة لتعبئة {(cards[0].pendingNfcAmount).toLocaleString()} ل.س</p>
                   </div>
                 </div>
                 <div className="text-[10px] font-black bg-amber-500 text-white px-3 py-1.5 rounded-xl">اضغط للتمرير</div>
               </div>
             ) : null}

             <BalanceCard card={cards[0]} dispatch={dispatchAction} getPermission={() => ({ allowed: true })} />



             {/* Transactions Section */}
             <div className="px-6 space-y-4">
               <div className="flex justify-between items-center px-1">
                 <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">آخر العمليات</h3>
                 <button 
                   id="show-all-transactions"
                   onClick={() => setActiveView('transactions_history')} 
                   className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline cursor-pointer active:scale-95 transition"
                 >
                   عرض الكل
                 </button>
               </div>

               <div className="space-y-3">
                 {transactions.slice(0, 4).map(tx => {
                   const isRecharge = tx.type === 'recharge';
                   return (
                     <div key={tx.id} className="bg-white dark:bg-slate-900 rounded-[28px] p-4 flex justify-between items-center border border-slate-100 dark:border-slate-800 shadow-sm">
                       <div className="flex items-center gap-3">
                         <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black ${
                           isRecharge 
                             ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
                             : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                         }`}>
                           {isRecharge ? '+' : '-'}
                         </div>
                         <div className="text-right">
                           <h4 className="font-black text-xs text-slate-800 dark:text-slate-100">{tx.title}</h4>
                           <p className="text-[10px] text-slate-400 font-bold mt-0.5">{tx.subtitle}</p>
                         </div>
                       </div>
                       <div className="text-left">
                         <div className={`font-black text-xs ${isRecharge ? 'text-emerald-600' : 'text-slate-800 dark:text-white'}`}>
                           {isRecharge ? '+' : ''}{tx.amount.toLocaleString()} ل.س
                         </div>
                         <span className="text-[8px] text-slate-400 block mt-0.5">
                           {new Date(tx.timestamp).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}
                         </span>
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
          </div>
        );
    }
  };

  // Check if it is driver route
  const isDriverView = window.location.pathname === '/driver' || window.location.search.includes('view=driver');

  const renderAppContent = () => {
    if (isDriverView || activeView === 'driver') {
      return (
        <div className="pt-16">
          <DriverDashboard />
        </div>
      );
    }

    if (!session) {
      return (
        <div className="pt-16">
          <Auth onLogin={setSession} />
        </div>
      );
    }

    return (
      <div className="w-full max-w-md mx-auto bg-slate-50 dark:bg-slate-950 min-h-screen relative overflow-hidden flex flex-col shadow-2xl" dir="rtl">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <main className="flex-1 relative overflow-y-auto no-scrollbar pt-4">{renderView()}</main>
        {['home', 'cards', 'offers', 'profile', 'qr_payment', 'transactions_history'].includes(activeView) && (
          <BottomNavigationBar activeView={activeView} onNavigate={setActiveView} />
        )}

        {showInspector && (
          <CardInspector 
            onClose={() => setShowInspector(false)} 
            nfcStatus={system.nfcStatus} 
            setNfcStatus={(s) => setSystem(p => ({...p, nfcStatus: s}))} 
            dispatch={dispatchAction} 
            cards={cards}
            setCards={setCards}
          />
        )}
        {syncCard && (
          <NfcSyncModal 
            card={syncCard} 
            token={session?.token || ""} 
            onClose={() => setSyncCard(null)} 
            onSuccess={(newBalance) => {
              setCards(prev => prev.map(c => c.id === syncCard.id ? { ...c, balance: newBalance, pendingNfcAmount: 0 } : c));
              setTransactions(prev => [
                {
                  id: 'tx_nfc_' + Date.now(),
                  cardId: syncCard.id,
                  cardName: syncCard.alias || "بطاقة فيزيائية",
                  type: 'recharge',
                  title: "شحن عبر NFC نجح",
                  subtitle: "تم تفريغ الرصيد المعلق بنجاح",
                  amount: syncCard.pendingNfcAmount || 0,
                  timestamp: Date.now()
                },
                ...prev
              ]);
              setSyncCard(null);
            }} 
          />
        )}
        {showAddCard && (
          <AddCardModal 
            onClose={() => setShowAddCard(false)} 
            onAdd={(newCard) => {
              if (session?.token) {
                fetch('/api/cards/add', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.token}`
                  },
                  body: JSON.stringify(newCard)
                })
                .then(res => {
                  if (res.ok) {
                    loadDashboard();
                    triggerToast('تمت إضافة البطاقة بنجاح', 'success');
                  } else {
                    triggerToast('فشل إضافة البطاقة بالخادم', 'error');
                  }
                })
                .catch(err => {
                  // Offline fallback
                  setCards(prev => [...prev, newCard]);
                  triggerToast('تم الحفظ محلياً (وضع العمل دون اتصال)', 'success');
                });
              } else {
                setCards(prev => [...prev, newCard]);
                triggerToast('تمت إضافة البطاقة بنجاح', 'success');
              }
              setShowAddCard(false);
            }} 
          />
        )}
      </div>
    );
  };

  return (
    <>
      {renderAppContent()}
    </>
  );
};

const TransferView: React.FC<{
  cards: any[];
  setCards: React.Dispatch<React.SetStateAction<any[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  triggerToast: (message: string, type: 'success' | 'error') => void;
  setActiveView: (view: any) => void;
}> = ({ cards, setCards, setTransactions, triggerToast, setActiveView }) => {
  const [recipientPhone, setRecipientPhone] = useState('');
  const [transferAmt, setTransferAmt] = useState('2500');
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id || '');

  const handleTransferSubmit = () => {
    if (!recipientPhone.trim()) {
      triggerToast('الرجاء إدخال رقم هاتف المستلم', 'error');
      return;
    }
    const amt = parseInt(transferAmt);
    if (isNaN(amt) || amt <= 0) {
      triggerToast('المبلغ غير صالح', 'error');
      return;
    }
    const card = cards.find(c => c.id === selectedCardId);
    if (!card) {
      triggerToast('البطاقة المحددة غير موجودة', 'error');
      return;
    }
    if (card.balance < amt) {
      triggerToast('رصيد البطاقة غير كافٍ لإتمام عملية التحويل', 'error');
      return;
    }

    setCards(prev => prev.map(c => c.id === selectedCardId ? { ...c, balance: c.balance - amt } : c));
    setTransactions(prev => [
      {
        id: 'tx_transfer_' + Math.random().toString(36).substr(2, 9),
        cardId: selectedCardId,
        cardName: card.alias,
        type: 'transfer',
        title: 'تحويل رصيد صادر',
        subtitle: `إلى الرقم ${recipientPhone}`,
        amount: -amt,
        timestamp: Date.now()
      },
      ...prev
    ]);
    triggerToast(`تم تحويل ${amt.toLocaleString()} ل.س للمشترك ${recipientPhone} بنجاح`, 'success');
    setActiveView('home');
  };

  return (
    <div className="p-8 pt-16 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setActiveView('home')} className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm"><ArrowLeft className="rotate-180 dark:text-white" /></button>
        <h2 className="text-2xl font-black dark:text-white">تحويل رصيد</h2>
      </div>

      <div className="space-y-6 flex-1">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm text-right">
          <p className="text-[10px] font-black text-slate-400 mb-3 uppercase">اختر بطاقة الدفع</p>
          {cards.length === 1 ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl flex items-center justify-between">
              <span className="font-extrabold text-sm dark:text-white">{cards[0].alias}</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{cards[0].balance.toLocaleString()} ل.س</span>
            </div>
          ) : (
            <select 
              value={selectedCardId} 
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-700 border-none rounded-2xl font-bold font-sans text-sm pr-4 focus:ring-2 focus:ring-emerald-500 dark:text-white outline-none"
            >
              {cards.map(c => (
                <option key={c.id} value={c.id}>{c.alias} ({c.balance.toLocaleString()} ل.س)</option>
              ))}
            </select>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm text-right">
          <p className="text-[10px] font-black text-slate-400 mb-3 uppercase">رقم الهاتف المستلم (تنسيق دولي)</p>
          <input 
            type="tel" 
            placeholder="+963..."
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            dir="ltr"
            className="w-full bg-slate-50 dark:bg-slate-700 border-none rounded-2xl p-4 text-center font-bold text-sm focus:ring-2 focus:ring-emerald-500 dark:text-white outline-none"
          />
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm text-right">
          <p className="text-[10px] font-black text-slate-400 mb-3 uppercase">مبلغ التحويل (ل.س)</p>
          <input 
            type="number" 
            value={transferAmt}
            onChange={(e) => setTransferAmt(e.target.value)}
            className="w-full text-center text-4xl font-black bg-transparent outline-none dark:text-white"
          />
        </div>
      </div>

      <div className="mt-8 pb-10">
        <button 
          onClick={handleTransferSubmit}
          className="w-full bg-emerald-600 text-white font-black py-6 rounded-[32px] shadow-2xl active:scale-95 transition-all text-xl"
        >
          تأكيد عملية التحويل
        </button>
      </div>
    </div>
  );
};

const QrPaymentView: React.FC<{
  cards: any[];
  setCards: React.Dispatch<React.SetStateAction<any[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  triggerToast: (message: string, type: 'success' | 'error') => void;
  setActiveView: (view: any) => void;
}> = ({ cards, setCards, setTransactions, triggerToast, setActiveView }) => {
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id || '');
  const currentCard = cards.find(c => c.id === selectedCardId);
  const [payStep, setPayStep] = useState<'scan' | 'done'>('scan');
  const [paymentDetails, setPaymentDetails] = useState<{ amount: number; cardName: string; txId: string; busName?: string } | null>(null);

  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>('bus_M1');

  // Secure QR Generation state
  const [payMode, setPayMode] = useState<'scan' | 'generate'>('scan');
  const [signedQr, setSignedQr] = useState<string>('');
  const [loadingQr, setLoadingQr] = useState<boolean>(false);
  const [qrCountdown, setQrCountdown] = useState<number>(60);

  const openedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (payMode === 'generate') {
      openedAtRef.current = Date.now();
    }
  }, [payMode]);

  const fetchSignedQr = () => {
    if (!selectedCardId) return;
    setLoadingQr(true);
    const session = authStore.getSession();

    // Check offline state
    const isOffline = !navigator.onLine;
    if (isOffline) {
      try {
        const phone = session?.user?.phone || localStorage.getItem('user_phone') || "+963931112223";
        const timestamp = Date.now();
        const signature = generateOfflineSignature(selectedCardId, phone, timestamp);
        const qrPayload = {
          cardId: selectedCardId,
          userId: phone,
          timestamp,
          signature,
          isOffline: true
        };
        const qrToken = btoa(JSON.stringify(qrPayload));
        setSignedQr(qrToken);
        setQrCountdown(60);
        setLoadingQr(false);
        triggerToast("تم توليد رمز عبور آمن دون اتصال بالإنترنت", "success");
      } catch (e) {
        console.error("Local QR generation error:", e);
        setLoadingQr(false);
      }
      return;
    }

    fetch(`/api/cards/${selectedCardId}/signed-qr`, {
      headers: {
        'Authorization': `Bearer ${session?.token || ''}`
      }
    })
    .then(res => {
      if (res.ok) return res.json();
      throw new Error("Failed to load secure QR");
    })
    .then(data => {
      setSignedQr(data.qrToken);
      setQrCountdown(60);
      setLoadingQr(false);
    })
    .catch(err => {
      console.warn("Server QR fetch failed, falling back to offline generator:", err);
      try {
        const phone = session?.user?.phone || localStorage.getItem('user_phone') || "+963931112223";
        const timestamp = Date.now();
        const signature = generateOfflineSignature(selectedCardId, phone, timestamp);
        const qrPayload = {
          cardId: selectedCardId,
          userId: phone,
          timestamp,
          signature,
          isOffline: true
        };
        const qrToken = btoa(JSON.stringify(qrPayload));
        setSignedQr(qrToken);
        setQrCountdown(60);
        triggerToast("تم توليد رمز عبور آمن (دون اتصال بالإنترنت)", "success");
      } catch (e) {
        console.error(e);
        triggerToast("فشل توليد الرمز الآمن للبطاقة", "error");
      }
      setLoadingQr(false);
    });
  };

  useEffect(() => {
    let timer: any;
    if (payMode === 'generate') {
      fetchSignedQr();
      timer = setInterval(() => {
        setQrCountdown(prev => {
          if (prev <= 1) {
            fetchSignedQr();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setSignedQr('');
    }
    return () => clearInterval(timer);
  }, [payMode, selectedCardId]);

  // Real-time active polling to detect driver scanning
  useEffect(() => {
    let pollInterval: any;
    if (payMode === 'generate' && payStep === 'scan') {
      pollInterval = setInterval(() => {
        const session = authStore.getSession();
        if (!session?.token) return;

        fetch('/api/dashboard', {
          headers: {
            'Authorization': `Bearer ${session.token}`
          }
        })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error("Failed to poll dashboard");
        })
        .then(data => {
          if (data && Array.isArray(data.transactions)) {
            // Find a pay transaction with timestamp after openedAtRef
            const newPayment = data.transactions.find((tx: any) => 
              tx.type === 'pay' && tx.timestamp > openedAtRef.current
            );

            if (newPayment) {
              playPhysicalBeep();
              if (data.cards) setCards(data.cards);
              if (data.transactions) setTransactions(data.transactions);

              setPaymentDetails({
                amount: Math.abs(newPayment.amount),
                cardName: newPayment.cardName || currentCard?.alias || 'بطاقة شام',
                txId: newPayment.id,
                busName: newPayment.title || 'خصم تعرفة الحافلة من السائق'
              });

              setTimeout(() => {
                setPayStep('done');
                triggerToast('تم خصم تذكرة العبور تلقائياً عبر القارئ بنجاح!', 'success');
              }, 300);
            }
          }
        })
        .catch(err => {
          console.warn("Error polling driver scan status:", err);
        });
      }, 1500);
    }
    return () => clearInterval(pollInterval);
  }, [payMode, payStep, selectedCardId, currentCard]);

  useEffect(() => {
    fetch('/api/buses/locations')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBuses(data);
          if (data.length > 0) {
            setSelectedBusId(data[0].id);
          }
        }
      })
      .catch(err => console.error("Error loading buses in client scan", err));
  }, []);

  const currentBus = buses.find(b => b.id === selectedBusId) || { id: 'bus_M1', ticket_price: 1000, route_name: 'ميكرو البرامكة - المزة جبل (خط داخلي قصير)' };
  const currentBusPrice = currentBus.ticket_price || 1000;

  // Real-time camera & scanner states
  const [cameraState, setCameraState] = useState<'inactive' | 'loading' | 'active' | 'error'>('inactive');
  const [activeCamera, setActiveCamera] = useState<'back' | 'front'>('back');
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [fps, setFps] = useState(30);
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // High-fidelity web audio scanner beep synthesizer (produces realistic physical transit device beep)
  const playPhysicalBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1450, audioCtx.currentTime); // Crisp piercing terminal chirp
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.warn("Audio Context beep not supported directly, skipping sound", e);
    }
  };

  const handlePayment = async (data: string) => {
    try {
        console.log("Scanned QR data:", data);
        const session = authStore.getSession();
        
        let targetTripId = data;
        let targetBusId = undefined;
        try {
          const parsed = JSON.parse(data);
          if (parsed && typeof parsed === 'object') {
            if (parsed.tripId) targetTripId = parsed.tripId;
            if (parsed.busId) targetBusId = parsed.busId;
          }
        } catch (e) {
          // not JSON, use raw data as tripId
        }

        const primaryCard = cards.find(c => c.is_primary) || cards[0];
        if (!primaryCard) {
            triggerToast("لا توجد بطاقات نشطة لإكمال الدفع.", 'error');
            return;
        }

        const response = await fetch('/api/trips/pay-qr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session ? btoa(session.user.phone + '||' + Date.now()) : ''}`
            },
            body: JSON.stringify({ 
                tripId: targetTripId, 
                busId: targetBusId || selectedBusId, 
                cardId: primaryCard.id 
            })
        });
        const result = await response.json();
        if (result.success) {
            playPhysicalBeep();
            triggerToast("تم الدفع بنجاح!", 'success');
            if (result.balance !== undefined) {
                setCards(prev => prev.map(c => c.id === primaryCard.id ? { ...c, balance: result.balance } : c));
            }
            if (result.transaction) {
                setTransactions(prev => [result.transaction, ...prev]);
            }
        } else {
            triggerToast(result.message || "فشل الدفع", 'error');
        }
    } catch (e) {
        triggerToast("خطأ في الاتصال", 'error');
    }
  };

  const handlePaymentRef = useRef(handlePayment);
  useEffect(() => {
    handlePaymentRef.current = handlePayment;
  }, [handlePayment]);

  const startScanner = useCallback(() => {
    try {
      if (!document.getElementById("qr-reader")) {
        console.warn("qr-reader element not found in DOM yet");
        return;
      }
      setCameraState('loading');
      
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch (e) {
          console.warn("Error pre-clearing scanner", e);
        }
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          handlePaymentRef.current(decodedText);
          stopScanner();
        },
        () => {
          // Handle parse error silently
        }
      )
      .then(() => {
        setCameraState('active');
      })
      .catch(() => {
        setCameraState('error');
      });
    } catch (err) {
      console.error("Failed to start QR scanner", err);
      setCameraState('error');
    }
  }, []);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      const scanner = scannerRef.current;
      if (scanner.isScanning) {
        scanner.stop().then(() => {
          scannerRef.current = null;
          setCameraState('inactive');
        }).catch(err => {
          console.error("Error stopping scanner", err);
          scannerRef.current = null;
          setCameraState('inactive');
        });
      } else {
        scannerRef.current = null;
        setCameraState('inactive');
      }
    } else {
      setCameraState('inactive');
    }
  }, []);

  const startCameraStream = async (facing: 'back' | 'front') => {
    setCameraState('loading');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    try {
      // Try exact environment first
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: 'environment' },
            width: { ideal: 480 },
            height: { ideal: 480 }
          }
        });
      } catch (e) {
        // Fallback
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 480 },
            height: { ideal: 480 }
          }
        });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => console.log("Play video error", err));
      }
      setCameraState('active');
    } catch (err) {
      console.warn("Physical camera blocked or unavailable, enabling Damascus Transit high-fidelity digital scanner simulation", err);
      setCameraState('error');
    }
  };

  useEffect(() => {
    let t: any = null;
    if (payMode === 'scan') {
      t = setTimeout(() => {
        startScanner();
      }, 100);
    } else {
      stopScanner();
    }

    // Dynamic FPS oscillation for high realism
    const fpsInterval = setInterval(() => {
      setFps(Math.floor(28 + Math.random() * 4));
    }, 1500);

    return () => {
      if (t) clearTimeout(t);
      clearInterval(fpsInterval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch (e) {
          console.warn("Error clearing scanner on unmount", e);
        }
      }
    };
  }, [activeCamera, payMode, startScanner, stopScanner]);

  const toggleFlashLight = async () => {
    const nextFlashState = !isFlashActive;
    setIsFlashActive(nextFlashState);

    // Attempt hardware flash control via Torch constraints
    try {
      if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = (videoTrack as any).getCapabilities?.() || {};
          if (capabilities.torch) {
            await (videoTrack as any).applyConstraints({
              advanced: [{ torch: nextFlashState }]
            });
          }
        }
      }
    } catch (e) {
      console.log("Hardware torch is unavailable on this system", e);
    }
  };

  const toggleCameraDirection = () => {
    setActiveCamera(prev => prev === 'back' ? 'front' : 'back');
  };

  const triggerSelfScan = () => {
    if (!currentCard) {
      triggerToast('لا تملك بطاقة نشطة حالياً لإكمال الدفع', 'error');
      return;
    }
    
    if (currentCard.balance < currentBusPrice) {
      triggerToast(`الرصيد غير كافٍ لدفع أجرة الباص (${currentBusPrice.toLocaleString()} ل.س). يرجى شحن البطاقة.`, 'error');
      return;
    }

    setIsCapturing(true);

    // Auto trigger hardware stream request if not active
    if (cameraState !== 'active' && payMode === 'scan') {
      startCameraStream(activeCamera).catch(() => {});
    }

    // Play instant focal acquisition beep
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gn = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(950, audioCtx.currentTime);
      gn.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.connect(gn);
      gn.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.06);
    } catch (e) {}

    // Wait exactly 1.2 seconds for realistic optical camera focus scan feedback
    setTimeout(() => {
      setIsScanningActive(false);
      playPhysicalBeep();

      const session = authStore.getSession();
      if (session?.token) {
        fetch('/api/trips/pay-qr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`
          },
          body: JSON.stringify({ cardId: selectedCardId, busId: selectedBusId })
        })
        .then(async res => {
          if (res.ok) {
            const data = await res.json();
            // Update cards and transactions with server-authoritative data
            setCards(prev => prev.map(c => c.id === selectedCardId ? { ...c, balance: data.balance } : c));
            setTransactions(prev => [data.transaction, ...prev]);
            
            setPaymentDetails({
              amount: currentBusPrice,
              cardName: currentCard.alias,
              txId: data.transaction.id,
              busName: currentBus.route_name
            });

            setTimeout(() => {
              setPayStep('done');
              triggerToast('تم خصم أجرة المعبر بنجاح', 'success');
              setIsCapturing(false);
              setIsScanningActive(true);
            }, 300);
          } else {
            const errData = await res.json().catch(() => ({}));
            triggerToast(errData.message || 'فشل خصم الأجرة من الخادم', 'error');
            setIsCapturing(false);
            setIsScanningActive(true);
          }
        })
        .catch(err => {
          // OFFLINE FALLBACK - SYNC LATER
          console.warn("Offline, performing local transit transaction debit");
          const localTxId = 'tx_pay_offline_' + Math.random().toString(36).substr(2, 9);
          
          const newCards = cards.map(c => {
            if (c.id === selectedCardId) {
              return { ...c, balance: c.balance - currentBusPrice };
            }
            return c;
          });
          setCards(newCards);
          
          const offlineTx = {
            id: localTxId,
            cardId: selectedCardId,
            cardName: currentCard.alias,
            type: 'pay',
            title: `تذكرة عبور QR (بدون اتصال) - خط ${currentBus.route_code || 'M1'}`,
            subtitle: currentBus.route_name || 'خصم تعرفة الحافلة',
            amount: -currentBusPrice,
            timestamp: Date.now()
          };
          setTransactions(prev => [offlineTx, ...prev]);
          
          setPaymentDetails({
            amount: currentBusPrice,
            cardName: currentCard.alias,
            txId: localTxId,
            busName: currentBus.route_name
          });
          
          // Save in offline pending sync queue
          const pending = JSON.parse(localStorage.getItem('pending_offline_trips') || '[]');
          pending.push({ cardId: selectedCardId, timestamp: Date.now() });
          localStorage.setItem('pending_offline_trips', JSON.stringify(pending));

          setTimeout(() => {
            setPayStep('done');
            triggerToast('تم الدفع دون اتصال! سيتم المزامنة لاحقاً', 'success');
            setIsCapturing(false);
            setIsScanningActive(true);
          }, 300);
        });
      } else {
        // Fallback for demo guest
        const newCards = cards.map(c => {
          if (c.id === selectedCardId) {
            return {
              ...c,
              balance: c.balance - currentBusPrice
            };
          }
          return c;
        });

        setCards(newCards);
        setTransactions(prev => [
          {
            id: 'tx_pay_' + Math.random().toString(36).substr(2, 9),
            cardId: selectedCardId,
            cardName: currentCard.alias,
            type: 'pay',
            title: `تذكرة عبور QR - خط ${currentBus.route_code || 'M1'}`,
            subtitle: currentBus.route_name || 'خصم تعرفة الحافلة',
            amount: -currentBusPrice,
            timestamp: Date.now()
          },
          ...prev
        ]);

        setPaymentDetails({
          amount: currentBusPrice,
          cardName: currentCard.alias,
          txId: 'TX-' + Math.floor(100000 + Math.random() * 900000),
          busName: currentBus.route_name
        });

        setTimeout(() => {
          setPayStep('done');
          triggerToast('تم خصم أجرة المعبر بنجاح', 'success');
          setIsCapturing(false);
          setIsScanningActive(true);
        }, 300);
      }
    }, 1200);
  };

  useEffect(() => {
    let timeout: any;
    if (cameraState === 'error' && payStep === 'scan' && !isCapturing && payMode === 'scan') {
      // Auto trigger simulation after 3 seconds for smooth preview demo flow
      timeout = setTimeout(() => {
        triggerSelfScan();
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [cameraState, payStep, isCapturing, payMode]);

  if (payStep === 'done' && paymentDetails) {
    return (
      <div className="p-8 pt-24 pb-36 text-center animate-in zoom-in duration-500 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950" dir="rtl">
        <div className="w-32 h-32 bg-emerald-600 rounded-[48px] flex items-center justify-center mx-auto mb-10 shadow-2xl relative">
          <div className="absolute inset-0 bg-emerald-600 rounded-[48px] animate-ping opacity-25"></div>
          <CheckCircle size={64} className="text-white" />
        </div>
        <h2 className="text-4xl font-black dark:text-white mb-2">تم الدفع بنجاح</h2>
        <p className="text-slate-400 font-bold mb-12 px-6">أهلاً بك على متن الباص! تم التحقق من تذكرة العبور الرقمية وتحديث الرصيد</p>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-6 text-right space-y-4 w-full shadow-sm max-w-sm mx-auto mb-12">
          <div className="flex justify-between border-b pb-2 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-bold">رقم العملية</span>
            <span className="text-sm font-mono font-black dark:text-white">{paymentDetails.txId}</span>
          </div>
          <div className="flex justify-between border-b pb-2 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-bold">البطاقة المستخدمة</span>
            <span className="text-sm font-black dark:text-white">{paymentDetails.cardName}</span>
          </div>
          <div className="flex justify-between border-b pb-2 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-bold">الحافلة / الخط</span>
            <span className="text-sm font-black dark:text-white">{paymentDetails.busName || 'ميكرو البرامكة - المزة جبل'}</span>
          </div>
          <div className="flex justify-between pb-2">
            <span className="text-xs text-slate-400 font-bold">قيمة التعرفة</span>
            <span className="text-sm font-black text-emerald-600">{paymentDetails.amount.toLocaleString()} ل.س</span>
          </div>
        </div>

        <button onClick={() => setActiveView('home')} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-6 rounded-[32px] text-xl mt-auto mb-10 shadow-xl">العودة للرئيسية</button>
      </div>
    );
  }

  return (
    <div className="p-8 pt-16 pb-36 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-center" dir="rtl">
      {/* Visual Header */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => setActiveView('home')} className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm"><ArrowLeft className="rotate-180 dark:text-white" /></button>
        <h2 className="text-2xl font-black dark:text-white">تذكرة العبور QR</h2>
        <div className="w-12"></div>
      </div>

      {/* Styled Source Account Selector */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm text-right mb-6">
        <p className="text-[10px] font-black text-slate-400 mb-2 uppercase">محفظة الدفع النشطة</p>
        {cards.length === 1 ? (
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
            <span className="font-extrabold text-xs dark:text-white">{cards[0].alias}</span>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-450">
              {cards[0].balance.toLocaleString()} ل.س
            </span>
          </div>
        ) : (
          <select 
            value={selectedCardId} 
            onChange={(e) => setSelectedCardId(e.target.value)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold text-xs pr-4 dark:text-white outline-none"
          >
            {cards.map(c => (
               <option key={c.id} value={c.id}>{c.alias} ({c.balance.toLocaleString()} ل.س)</option>
            ))}
          </select>
        )}
      </div>

      {payMode === 'generate' ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-6 shadow-md relative overflow-hidden">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">كود عبور مشفر بميزة الحماية الثنائية</p>
            
            {loadingQr ? (
              <div className="w-56 h-56 mx-auto flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Loader2 className="animate-spin text-emerald-600 w-10 h-10 mb-2" />
                <span className="text-[10px] font-bold text-slate-400">جاري التشفير والتوقيع...</span>
              </div>
            ) : signedQr ? (
              <div className="relative bg-white p-4 rounded-2xl w-fit mx-auto shadow-lg border border-slate-100">
                <QRCodeCanvas 
                  value={signedQr} 
                  size={208}
                  level="H"
                />
                <div className="absolute inset-0 m-auto w-10 h-10 bg-slate-950 rounded-xl border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                  <ShieldCheck size={20} />
                </div>
              </div>
            ) : (
              <div className="w-56 h-56 mx-auto flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 rounded-2xl">
                <Loader2 className="text-emerald-500 mb-2" size={32} />
                <span className="text-xs font-bold text-slate-400">فشل في توليد الكود</span>
              </div>
            )}

            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-black dark:text-white">يتغير الكود تلقائياً خلال: <strong className="text-emerald-500 font-mono text-sm">{qrCountdown}ث</strong></span>
            </div>

            <p className="text-[10px] text-slate-400 font-bold mt-4 px-4 leading-normal">
              يحتوي هذا الرمز على توقيع رقمي مشفر وطابع زمني دقيق لمنع النسخ أو التلاعب. اعرضه على قارئ السائق لإتمام الدفع بأمان.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Wallet balance display */}
          <div className="bg-emerald-600/90 border border-emerald-400 p-6 rounded-[24px] mb-6 shadow-2xl flex justify-between items-center w-full">
            <span className="text-white text-[10px] font-black uppercase tracking-wider">الرصيد المتاح</span>
            <span className="text-white text-3xl font-black">{cards[0]?.balance.toLocaleString()} ل.س</span>
          </div>

          {/* 100% REALISTIC QR SCANNER VIEWFINDER */}
          <div 
            id="qr-viewfinder-container"
            className="relative mx-auto w-80 h-80 rounded-[44px] overflow-hidden border-2 border-emerald-500/90 shadow-[0_0_50px_rgba(16,185,129,0.3)] bg-slate-950 mb-6 flex flex-col justify-center items-center group cursor-pointer"
            onClick={() => {
              if (cameraState !== 'active') {
                navigator.mediaDevices.getUserMedia({ video: true })
                  .then(() => startScanner())
                  .catch((err) => {
                    console.error("Camera permission denied", err);
                    alert("يجب السماح بالوصول للكاميرا لاستخدام الماسح الضوئي.");
                    startScanner();
                  });
              }
            }}
          >
            {/* The actual HTML5 Qrcode target container MUST be empty and isolated */}
            <div id="qr-reader" className="absolute inset-0 w-full h-full z-0 overflow-hidden [&>video]:object-cover [&>video]:w-full [&>video]:h-full select-none pointer-events-none"></div>
            
            {/* Soft Ambient Core Pulse */}
            {cameraState !== 'error' && (
              <div className="absolute w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl animate-glow-pulse pointer-events-none z-0"></div>
            )}

            {/* 1. REAL LIVE CAMERA VIEWSTREAM ELEMENT */}
            {cameraState === 'active' ? (
              <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover z-0 select-none pointer-events-none" 
                playsInline 
                muted
                autoPlay
              />
            ) : cameraState === 'loading' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-emerald-400 z-10 select-none pointer-events-none">
                <Loader2 className="animate-spin text-emerald-500 mb-2" size={36} />
                <span className="text-xs font-bold tracking-wider">جاري تشغيل الكاميرا...</span>
              </div>
            ) : (
              /* Clean minimal state if blocked or inactive */
              <div className="absolute inset-0 w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 z-0">
                <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-2 select-none">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    {cameraState === 'error' ? (
                      <CameraOff size={24} className="text-rose-400" />
                    ) : (
                      <Camera size={24} className="text-emerald-400" />
                    )}
                  </div>
                  <p className="text-xs font-black text-slate-200">
                    {cameraState === 'error' ? 'الرجاء السماح بصلاحية الكاميرا' : 'عدسة الكاميرا النشطة'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold max-w-[200px] leading-relaxed">
                    {cameraState === 'error' ? 'يرجى تمكين الكاميرا من إعدادات المتصفح للمسح المباشر.' : 'انقر للدفع أو تمكين الكاميرا'}
                  </p>
                </div>
              </div>
            )}

            {/* 2. DYNAMIC CORNER TARGET BRACKETS */}
            <div className="absolute inset-8 pointer-events-none z-10">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-[4px] border-l-[4px] border-emerald-500 rounded-tl-xl shadow-[0_0_8px_#10b981]"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-[4px] border-r-[4px] border-emerald-500 rounded-tr-xl shadow-[0_0_8px_#10b981]"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[4px] border-l-[4px] border-emerald-500 rounded-bl-xl shadow-[0_0_8px_#10b981]"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[4px] border-r-[4px] border-emerald-500 rounded-br-xl shadow-[0_0_8px_#10b981]"></div>
            </div>

            {/* 3. CENTER GRAPHIC FOCUS BOUNDS */}
            <div className="absolute w-24 h-24 border border-emerald-500/25 rounded-2xl pointer-events-none z-10 flex items-center justify-center animate-pulse">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
            </div>

            {/* 4. SMOOTH LASER SCAN LINE */}
            {isScanningActive && cameraState === 'active' && (
              <div className={`absolute left-[20px] right-[20px] h-[3px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_#10b981,0_0_6px_#34d399] z-20 pointer-events-none ${isCapturing ? 'animate-scan-fast top-[10px]' : 'animate-scan top-[20px]'}`}></div>
            )}

            {/* Simulated Virtual Flash overlay */}
            {isFlashActive && (
              <div className="absolute inset-0 bg-white/20 select-none pointer-events-none z-10 mix-blend-screen transition-all duration-200"></div>
            )}
          </div>

          {/* VIEWFINDER UTILITY RAILS (TORCH / MIRROR CAMERA) */}
          <div className="flex justify-center gap-4 mb-6">
            <button 
              onClick={toggleCameraDirection} 
              className="flex items-center gap-2 px-5 py-3 rounded-full text-xs font-black transition-all bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 active:scale-95"
            >
              <RefreshCw size={14} />
              {activeCamera === 'back' ? 'الكاميرا الأمامية' : 'الكاميرا الخلفية'}
            </button>
          </div>

          <p className="text-slate-400 dark:text-slate-300 font-bold text-xs leading-relaxed px-6 mb-8">
            وجه عدسة الهاتف نحو رمز الاستجابة السريع (QR) المعلق داخل الحافلة أو باص النقل العام ليتم التعرف على معبر التذكرة فوراً.
          </p>
        </>
      )}
    </div>
  );
};

const ActionView = ({ title, subtitle, icon, children, onConfirm, confirmText = "تأكيد العملية", hideConfirm = false, onBack }: any) => (
  <div className="p-8 animate-in slide-in-from-bottom duration-500 pt-16 flex flex-col min-h-screen">
    <button onClick={onBack} className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm mb-8">
      <ArrowLeft className="rotate-180 dark:text-white" />
    </button>
    <div className="flex items-center gap-6 mb-12">
      <div className="w-20 h-20 bg-emerald-600/10 text-emerald-600 rounded-[30px] flex items-center justify-center shrink-0">{icon}</div>
      <div className="text-right">
        <h2 className="text-3xl font-black dark:text-white leading-tight">{title}</h2>
        <p className="text-slate-400 font-bold mt-1 text-sm">{subtitle}</p>
      </div>
    </div>
    <div className="flex-1 space-y-8">{children}</div>
    {!hideConfirm && (
      <div className="mt-12 pb-10">
        <button onClick={onConfirm} className="w-full bg-emerald-600 text-white font-black py-6 rounded-[32px] shadow-2xl active:scale-95 transition-all text-xl">{confirmText}</button>
      </div>
    )}
  </div>
);

const NavTab = ({ active, icon, label, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-1/5 h-12 transition-all ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
    {React.cloneElement(icon, { size: 22 })}
    {active && <span className="text-[8px] font-black mt-1">{label}</span>}
  </button>
);

export default App;
