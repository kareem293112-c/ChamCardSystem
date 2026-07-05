import React, { useState, useEffect, useRef } from 'react';
import { Bus, Shield, Play, LogOut, AlertTriangle, CheckCircle, RefreshCw, Lock, Key, Info, ShieldCheck } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

export const DriverDashboard: React.FC = () => {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [tripCode, setTripCode] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Active Trip states
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [tripStatus, setTripStatus] = useState<any>({
    totalPassengersToday: 0,
    totalRevenueToday: 0,
    recentPayments: []
  });

  // UI/Feedback states
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  const [activeFeedback, setActiveFeedback] = useState<{
    status: 'success' | 'failed';
    amount: number;
    passengerName: string;
    balanceLeft?: number;
    errorReason?: string;
    timestamp: number;
  } | null>(null);

  // Developer Simulation Panel state
  const [showSimPanel, setShowSimPanel] = useState<boolean>(false);
  const [simName, setSimName] = useState<string>('مجد الشامي');
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [passengerTokenInput, setPassengerTokenInput] = useState<string>('');
  const [scanResultToast, setScanResultToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Dynamic QR High-entropy nonce
  const [qrNonce, setQrNonce] = useState<number>(Date.now());

  useEffect(() => {
    if (!isLoggedIn || !activeTrip) return;
    const interval = setInterval(() => {
      setQrNonce(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn, activeTrip]);

  // Bus Offline Queue State
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    const saved = localStorage.getItem('pending_offline_trips');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('pending_offline_trips', JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    if (!navigator.onLine) return;

    try {
      const res = await fetch('/api/driver/sync-offline-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: activeTrip?.id,
          busId: activeTrip?.routeId,
          queue: offlineQueue
        })
      });

      if (res.ok) {
        setOfflineQueue([]);
        setScanResultToast({ message: "تمت مزامنة جميع تذاكر العبور دون اتصال بنجاح سحابياً!", type: 'success' });
        setTimeout(() => setScanResultToast(null), 4000);
        fetchTripStatus();
      }
    } catch (err) {
      console.warn("Failed to sync offline queue", err);
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeTrip && offlineQueue.length > 0 && navigator.onLine) {
      syncOfflineQueue();
    }
  }, [isLoggedIn, activeTrip, offlineQueue.length]);

  useEffect(() => {
    const handleOnline = () => {
      if (isLoggedIn && activeTrip && offlineQueue.length > 0) {
        syncOfflineQueue();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isLoggedIn, activeTrip, offlineQueue]);

  const seenPaymentIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef<boolean>(true);

  // Check if driver has an existing active session on mount
  useEffect(() => {
    fetch('/api/driver/active-trip')
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        throw new Error("No active session");
      })
      .then(data => {
        if (data && data.status === 'active') {
          setActiveTrip(data);
          setIsLoggedIn(true);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch active trip status & transactions (polling)
  const fetchTripStatus = () => {
    if (!activeTrip) return;
    setIsPolling(true);
    fetch(`/api/driver/status?tripId=${activeTrip.id}&busId=${activeTrip.routeId}`)
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Failed to load status");
      })
      .then(data => {
        setTripStatus(data);

        // Check for new payments to trigger audio-visual reaction
        if (data.recentPayments && data.recentPayments.length > 0) {
          const newest = data.recentPayments[0];

          // On first load, populate seen payment IDs to avoid retroactive alerts
          if (isFirstLoadRef.current) {
            data.recentPayments.forEach((p: any) => seenPaymentIdsRef.current.add(p.id));
            isFirstLoadRef.current = false;
            setLastPaymentId(newest.id);
            return;
          }

          // Trigger feedback if we haven't processed this payment ID before
          if (!seenPaymentIdsRef.current.has(newest.id)) {
            seenPaymentIdsRef.current.add(newest.id);
            setLastPaymentId(newest.id);
            triggerFeedback(newest);
          }
        } else {
          isFirstLoadRef.current = false;
        }
      })
      .catch(err => console.error("Error loading active trip status", err))
      .finally(() => setIsPolling(false));
  };

  // Poll server for updates when logged in
  useEffect(() => {
    if (!isLoggedIn || !activeTrip) return;
    
    fetchTripStatus();
    isFirstLoadRef.current = true;
    seenPaymentIdsRef.current.clear();

    const interval = setInterval(() => {
      if (isLiveActive) {
        fetchTripStatus();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isLoggedIn, activeTrip, isLiveActive]);

  // Audio Context Ref (Pre-init)
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSuccessBeep = () => {
    initAudio();
    try {
      const audioCtx = audioCtxRef.current!;
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1450, audioCtx.currentTime); // Crisp electronic terminal beep
      gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    } catch (e) {
      console.warn("AudioContext success beep error", e);
    }
  };

  const playFailureBuzzer = () => {
    initAudio();
    try {
      const audioCtx = audioCtxRef.current!;
      
      const playBuzz = (delay: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime + delay); // Warning buzzer pitch
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.25);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.3);
      };

      playBuzz(0);
      playBuzz(0.15); // Double beep warning
    } catch (e) {
      console.warn("AudioContext failure buzzer error", e);
    }
  };

  const getLocationWithTimeout = (): Promise<{ lat: number, lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      const timeout = setTimeout(() => {
        resolve(null);
      }, 2000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeout);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          clearTimeout(timeout);
          resolve(null);
        }
      );
    });
  };

  // Trigger feedback overlay
  const triggerFeedback = (payment: any) => {
    setActiveFeedback({
      status: payment.status === 'failed' ? 'failed' : 'success',
      amount: payment.amount,
      passengerName: payment.passengerName,
      balanceLeft: payment.balanceLeft,
      errorReason: payment.errorReason,
      timestamp: payment.timestamp
    });

    if (payment.status === 'failed') {
      playFailureBuzzer();
    } else {
      playSuccessBeep();
    }

    // Auto-dismiss after 4.5 seconds
    const timer = setTimeout(() => {
      setActiveFeedback(null);
    }, 4500);

    return () => clearTimeout(timer);
  };

  // Handle Driver login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    // Initialize Audio on gesture
    initAudio();

    try {
      const res = await fetch('/api/driver/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripCode: tripCode.trim(), password: password.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        setActiveTrip(data.trip);
        setIsLoggedIn(true);
      } else {
        setAuthError(data.message || "خطأ في الاتصال بالخادم السحابي.");
      }
    } catch (err) {
      setAuthError("فشل الاتصال بالإنترنت. يرجى مراجعة إعدادات الشبكة.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Trip Logout (Frees QR and deactivates trip)
  const handleLogout = async () => {
    if (!activeTrip) return;

    // Explicit trip deactivation triggers automatic flush/clear of local offline queues
    if (offlineQueue.length > 0) {
      if (navigator.onLine) {
        try {
          await syncOfflineQueue();
        } catch (err) {
          console.warn("Could not flush offline queue before logout deactivation", err);
          setScanResultToast({ message: "فشل مزامنة تذاكر العبور. لا يمكن إنهاء الرحلة حالياً. يرجى الاتصال بالإنترنت.", type: 'error' });
          return;
        }
      } else {
        setScanResultToast({ message: "لا يوجد اتصال بالإنترنت لمزامنة تذاكر العبور. لا يمكن إنهاء الرحلة حالياً.", type: 'error' });
        return;
      }
      setOfflineQueue([]);
      localStorage.removeItem('pending_offline_trips');
    }

    try {
      await fetch('/api/driver/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: activeTrip.id })
      });
    } catch (err) {
      console.warn("Failed to notify logout to backend", err);
    }

    // Reset state locally
    setIsLoggedIn(false);
    setActiveTrip(null);
    setTripStatus({ totalPassengersToday: 0, totalRevenueToday: 0, recentPayments: [] });
    setTripCode('');
    setPassword('');
    setLastPaymentId(null);
    setActiveFeedback(null);
  };

  // Simulate passenger payment scan
  const triggerSimulateScan = async (status: 'success' | 'failed', errorReason?: string) => {
    if (!activeTrip) return;
    setSimLoading(true);
    try {
      const payload = {
        busId: activeTrip.routeId,
        tripId: activeTrip.id,
        amount: activeTrip.ticketPrice || 1000,
        passengerName: simName.trim() || "راكب عشوائي",
        status: status,
        errorReason: errorReason || "",
        balanceLeft: status === 'success' ? Math.floor(Math.random() * 50000) + 1500 : 0
      };

      const res = await fetch('/api/driver/simulate-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchTripStatus();
      }
    } catch (err) {
      console.error("Simulation error", err);
    } finally {
      setSimLoading(false);
    }
  };

  // Real-time reverse scanning handler for passenger cryptographically signed QR
  const handleScanPassengerSignedQr = async (token: string) => {
    if (!activeTrip) return;
    if (!token.trim()) {
      setScanResultToast({ message: "الرجاء إدخال الرمز المشفر للراكب", type: 'error' });
      setTimeout(() => setScanResultToast(null), 3000);
      return;
    }
    setSimLoading(true);

    const isOffline = !navigator.onLine;

    // Async GPS fetch with timeout
    const location = await getLocationWithTimeout();
    const gpsLog = location || { lat: 33.5110, lng: 36.2750 }; // Default
    const location_status = location ? "active" : "compromised_offline";

    if (isOffline) {
      try {
        const decoded = atob(token.trim());
        const qrPayload = JSON.parse(decoded);
        const { cardId, userId, timestamp, signature } = qrPayload;

        if (!cardId || !userId || !timestamp || !signature) {
          throw new Error("Missing token payload parts");
        }

        const now = Date.now();
        // Allow up to 10 minutes drift for offline clocks
        if (Math.abs(now - timestamp) > 600000) {
          setScanResultToast({ message: "كود العبور قديم جداً أو تم التلاعب بالوقت للراكب", type: 'error' });
          playFailureBuzzer();
          setSimLoading(false);
          return;
        }

        const ticketPrice = activeTrip.ticketPrice || 1000;
        const localPayment = {
          cardId,
          userId,
          timestamp,
          signature,
          amount: ticketPrice,
          isOffline: true,
          gpsLog,
          location_status
        };

        setOfflineQueue(prev => [...prev, localPayment]);

        setPassengerTokenInput('');
        setScanResultToast({ message: "تم تسجيل التذكرة محلياً في طابور المزامنة للباص!", type: 'success' });
        
        setActiveFeedback({
          status: 'success',
          amount: ticketPrice,
          passengerName: "عبور مؤقت (دون اتصال)",
          balanceLeft: 0,
          timestamp: now
        });
        playSuccessBeep();

      } catch (e) {
        setScanResultToast({ message: "رمز العبور غير صالح أو تالف", type: 'error' });
        playFailureBuzzer();
      } finally {
        setSimLoading(false);
        setTimeout(() => setScanResultToast(null), 5000);
      }
      return;
    }

    try {
      const res = await fetch('/api/trips/pay-signed-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken: token.trim(),
          busId: activeTrip.routeId,
          tripId: activeTrip.id,
          gpsLog,
          location_status
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPassengerTokenInput('');
        setScanResultToast({ message: "تم التحقق من التوقيع الرقمي وصلاحية الوقت وخصم الرصيد بنجاح!", type: 'success' });
        fetchTripStatus();

        setActiveFeedback({
          status: 'success',
          amount: data.amount || activeTrip.ticketPrice || 1000,
          passengerName: data.passengerName || "راكب بطاقة رقمية",
          balanceLeft: data.balance,
          timestamp: Date.now()
        });
        playSuccessBeep();
      } else {
        setScanResultToast({ message: data.message || "فشل التحقق من الرمز الرقمي", type: 'error' });

        setActiveFeedback({
          status: 'failed',
          amount: activeTrip.ticketPrice || 1000,
          passengerName: "راكب مرفوض",
          errorReason: data.message || "رصيد غير كافٍ أو بطاقة مجمدة",
          timestamp: Date.now()
        });
        playFailureBuzzer();
      }
    } catch (err) {
      console.warn("Fetch failed, fallback to offline local queuing", err);
      try {
        const decoded = atob(token.trim());
        const qrPayload = JSON.parse(decoded);
        const { cardId, userId, timestamp, signature } = qrPayload;

        if (!cardId || !userId || !timestamp || !signature) {
          throw new Error("Missing token parts");
        }

        const ticketPrice = activeTrip.ticketPrice || 1000;
        const localPayment = {
          cardId,
          userId,
          timestamp,
          signature,
          amount: ticketPrice,
          isOffline: true
        };

        setOfflineQueue(prev => [...prev, localPayment]);
        setPassengerTokenInput('');
        setScanResultToast({ message: "فشل الاتصال! تم تسجيل التذكرة محلياً في طابور المزامنة.", type: 'success' });

        setActiveFeedback({
          status: 'success',
          amount: ticketPrice,
          passengerName: "عبور مؤقت (دون اتصال)",
          balanceLeft: 0,
          timestamp: Date.now()
        });
        playSuccessBeep();
      } catch (e) {
        setScanResultToast({ message: "خطأ بالاتصال بالخادم ورمز العبور غير صالح", type: 'error' });
        playFailureBuzzer();
      }
    } finally {
      setSimLoading(false);
      setTimeout(() => setScanResultToast(null), 5000);
    }
  };

  // Main UI Render
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden" dir="rtl">
      
      {/* Background Matrix/Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] opacity-20 pointer-events-none"></div>

      {/* Screen 1: Driver Authentication Gate */}
      {!isLoggedIn ? (
        <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
          <div className="w-full max-w-md bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl"></div>
            
            <div className="text-center space-y-4 mb-8">
              <div className="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
                <Bus size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white">بطاقة الشام الرقمية</h1>
                <p className="text-xs text-slate-400 mt-1">بوابة تفعيل رحلات السائقين والحافلات</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 block flex items-center gap-2">
                  <Lock size={14} className="text-emerald-500" />
                  <span>رمز الرحلة (16 رقم)</span>
                </label>
                <input 
                  type="text" 
                  maxLength={16}
                  required
                  placeholder="0000 0000 0000 0000"
                  value={tripCode}
                  onChange={(e) => setTripCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl p-4 text-center font-mono text-sm tracking-[0.15em] text-white outline-none transition-all placeholder:tracking-normal placeholder:text-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 block flex items-center gap-2">
                  <Key size={14} className="text-emerald-500" />
                  <span>كلمة السر للرحلة (10 أرقام)</span>
                </label>
                <input 
                  type="password" 
                  maxLength={10}
                  required
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl p-4 text-center font-mono text-sm tracking-[0.25em] text-white outline-none transition-all placeholder:tracking-normal placeholder:text-slate-700"
                />
              </div>

              {authError && (
                <div className="bg-red-950/40 border border-red-500/20 text-red-400 text-xs font-bold p-4 rounded-2xl text-right flex items-start gap-2.5">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl text-xs transition duration-150 shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                <span>تفعيل كود الرحلة والإقلاع</span>
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800/40 flex items-center gap-2 text-[10px] text-slate-500 font-semibold leading-relaxed">
              <Info size={14} className="text-slate-400 shrink-0" />
              <span>يتم توليد الرموز السرية من لوحة المشرفين بعد إدخال مواصفات الباص ونمرة السيارة لتوفير أقصى درجات الأمان ومحاربة التزوير.</span>
            </div>
          </div>
        </div>
      ) : (
        
        /* Screen 2: Highly Polished Passenger Facing QR Terminal View */
        <div className="min-h-screen flex flex-col justify-between p-6 relative z-10">
          
          {/* Top minimal status bar */}
          <div className="flex justify-between items-center w-full max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shadow-sm">
                <Bus size={20} />
              </div>
              <div className="text-right">
                {activeTrip && (
                  <>
                    <span className="text-[10px] text-slate-400 font-bold block">{activeTrip.routeName}</span>
                    <span className="text-[9px] text-slate-500 font-semibold block">لوحة رقم: {activeTrip.plateNumber}</span>
                  </>
                )}
              </div>
            </div>

            {offlineQueue.length > 0 && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-xl text-[10px] font-black animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping animate-infinite"></span>
                <span>بانتظار المزامنة: {offlineQueue.length} تذاكر</span>
                {navigator.onLine && (
                  <button 
                    onClick={syncOfflineQueue}
                    className="mr-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-2 py-0.5 rounded-md text-[9px] transition"
                  >
                    مزامنة الآن
                  </button>
                )}
              </div>
            )}


          </div>

          {/* Secure Signed QR Processing Toast Banner */}
          {scanResultToast && (
            <div className={`w-full max-w-sm mx-auto mt-4 p-4 rounded-2xl border text-center text-xs font-black animate-bounce ${
              scanResultToast.type === 'success' ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' : 'bg-red-950/80 border-red-500 text-red-300'
            }`}>
              {scanResultToast.message}
            </div>
          )}

          {/* Centered Beautiful QR Scan Card */}
          <div className="my-auto flex flex-col items-center">
            <div className="w-full max-w-sm bg-slate-900/40 border border-slate-800/80 rounded-[40px] p-8 shadow-2xl relative overflow-hidden text-center space-y-6">
              
              {/* Decorative side blurs */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl"></div>
              
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">بطاقة الشام الرقمية</span>
                <h2 className="text-2xl font-black text-white">ادفع تعرفة العبور هنا</h2>
                <p className="text-[11px] text-slate-400">امسح كود الـ QR من تطبيقك لدفع تذكرة الركوب</p>
              </div>

              {/* Dynamic QR Code Container */}
              <div className="bg-white p-5 rounded-[32px] w-fit mx-auto shadow-2xl border border-slate-800/20 relative">
                {activeTrip && (
                  <QRCodeCanvas 
                    value={JSON.stringify({ 
                      tripId: activeTrip.id,
                      tripCode: activeTrip.tripCode || activeTrip.id,
                      busId: activeTrip.busId || activeTrip.routeId,
                      ticketPrice: activeTrip.ticketPrice || 1000,
                      nonce: qrNonce
                    })}
                    size={192}
                    level="H"
                  />
                )}
                
                {/* Embedded Logo Badge in QR */}
                <div className="absolute inset-0 m-auto w-10 h-10 bg-slate-950 rounded-xl border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                  <Bus size={18} />
                </div>
              </div>

              {/* Ticket Price HUD */}
              <div className="bg-slate-950/80 rounded-2xl py-3 px-6 w-fit mx-auto border border-slate-800/60">
                <span className="text-[10px] text-slate-500 block font-bold">تعرفة الركوب والعبور الموحدة</span>
                <span className="text-lg font-black text-emerald-400">{(activeTrip?.ticketPrice || 1000).toLocaleString()} ل.س</span>
              </div>

              <div className="text-[10px] text-slate-500 font-semibold flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>بوابة مسح سريعة نشطة آمنة</span>
              </div>
            </div>
          </div>

          {/* Minimal Footnote / Developer Drawer Trigger */}
          <div className="w-full max-w-2xl mx-auto flex justify-between items-center pt-4 border-t border-slate-900">
            <span className="text-[10px] text-slate-600 font-medium">الجمهورية العربية السورية - منظومة النقل الداخلي الرقمية</span>
            
            <button 
              onClick={() => setShowSimPanel(!showSimPanel)}
              className="text-[9px] font-black text-slate-500 hover:text-amber-500 transition border border-slate-800 px-2.5 py-1 rounded-lg"
            >
              {showSimPanel ? 'إخفاء لوحة تجربة المطورين' : 'إظهار لوحة تجربة المطورين (المحاكي)'}
            </button>
          </div>

          {/* Developer quick simulation panel (drawer) */}
          {showSimPanel && (
            <div className="w-full max-w-md mx-auto mt-6 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-xs font-black text-amber-500">لوحة تجربة واختبار المطورين</h3>
                <span className="text-[9px] text-slate-500">صممت لتسهيل تجربة الدفع والرد على شاشة واحدة</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-black text-slate-400">اسم الراكب للتجربة</label>
                  <input 
                    type="text" 
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    placeholder="مثال: منير الأحمد"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>

                <button 
                  onClick={() => triggerSimulateScan('success')}
                  disabled={simLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 rounded-lg text-[10px] transition"
                >
                  محاكاة: دفع ناجح (طوط)
                </button>

                <button 
                  onClick={() => triggerSimulateScan('failed', 'الرصيد غير كافٍ!')}
                  disabled={simLoading}
                  className="bg-red-900 hover:bg-red-800 text-white font-black py-2 rounded-lg text-[10px] transition"
                >
                  محاكاة: رصيد غير كافٍ
                </button>

                <button 
                  onClick={() => triggerSimulateScan('failed', 'البطاقة محظورة ومجمدة!')}
                  disabled={simLoading}
                  className="bg-red-950 hover:bg-red-900 text-red-400 font-black py-2 rounded-lg text-[10px] transition col-span-2"
                >
                  محاكاة: بطاقة مجمدة ومحظورة
                </button>
              </div>

              {/* Secure Reverse QR Scanning Input Block */}
              <div className="border-t border-slate-800 pt-3 space-y-2">
                <label className="text-[9px] font-black text-amber-400 block text-right">محاكاة مسح كود راكب مشفر (Signed QR Base64)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={passengerTokenInput}
                    onChange={(e) => setPassengerTokenInput(e.target.value)}
                    placeholder="ضع هنا كود الـ Base64 المنسوخ من شاشة الراكب"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] text-white outline-none focus:border-amber-500"
                  />
                  <button 
                    onClick={() => handleScanPassengerSignedQr(passengerTokenInput)}
                    disabled={simLoading}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-black px-4 rounded-lg text-[10px] transition shrink-0"
                  >
                    تحقق ومسح الرمز الآمن
                  </button>
                </div>
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span>ركاب اليوم بالبث: <strong className="text-white">{tripStatus.totalPassengersToday}</strong></span>
                <span>الإيراد التراكمي: <strong className="text-amber-400">{tripStatus.totalRevenueToday.toLocaleString()} ل.س</strong></span>
              </div>
            </div>
          )}

          {/* GIANT REAL-TIME AUDIO-VISUAL REACTION FEEDBACK OVERLAY */}
          {activeFeedback && (
            <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200 ${
              activeFeedback.status === 'success' ? 'bg-emerald-950 text-white' : 'bg-red-950 text-white'
            }`}>
              
              {/* Visual Ring Icons */}
              {activeFeedback.status === 'success' ? (
                <div className="mb-8 w-44 h-44 bg-emerald-500/10 border-4 border-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(16,185,129,0.3)] animate-bounce">
                  <CheckCircle size={72} className="text-emerald-400" />
                </div>
              ) : (
                <div className="mb-8 w-44 h-44 bg-red-500/10 border-4 border-red-500 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(239,68,68,0.3)] animate-bounce">
                  <AlertTriangle size={72} className="text-red-400 animate-pulse" />
                </div>
              )}

              {/* Status Header */}
              {activeFeedback.status === 'success' ? (
                <div className="space-y-4">
                  <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-6 py-2 rounded-full text-xs font-black tracking-widest uppercase mb-4 animate-pulse">
                    عملية دفع تذكرة ناجحة
                  </span>
                  <h2 className="text-4xl font-extrabold text-white">تم قبول العملية بنجاح</h2>
                  
                  <div className="text-5xl font-black my-6 text-emerald-300">
                    - {activeFeedback.amount.toLocaleString()} ل.س
                  </div>

                  <div className="bg-slate-950/40 border border-emerald-500/15 rounded-3xl px-8 py-5 text-center max-w-sm mx-auto shadow-2xl">
                    <span className="text-[11px] text-emerald-400 font-bold block mb-1">الراكب</span>
                    <span className="text-2xl font-black text-white block mb-3">{activeFeedback.passengerName}</span>
                    
                    <div className="border-t border-emerald-500/10 pt-3 flex justify-between text-xs text-slate-300 font-black">
                      <span>الرصيد المتبقي (الباقي):</span>
                      <span className="font-mono text-emerald-400">{activeFeedback.balanceLeft?.toLocaleString() || '0'} ل.س</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <span className="bg-red-500/20 border border-red-400/30 text-red-300 px-6 py-2 rounded-full text-xs font-black tracking-widest uppercase mb-4 animate-pulse">
                    فشل خصم الأجرة
                  </span>
                  <h2 className="text-4xl font-extrabold text-white">العملية مرفوضة!</h2>
                  
                  <div className="text-2xl font-black text-red-300 bg-slate-950/40 border border-red-500/15 rounded-2xl py-3 px-6 my-4 w-fit mx-auto">
                    {activeFeedback.errorReason || "رصيد غير كافٍ أو بطاقة محظورة"}
                  </div>

                  <div className="bg-slate-950/40 border border-red-500/15 rounded-3xl px-8 py-5 text-center max-w-sm mx-auto shadow-2xl">
                    <span className="text-[11px] text-red-400 font-bold block mb-1">الراكب</span>
                    <span className="text-xl font-black text-white">{activeFeedback.passengerName}</span>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-400 font-semibold mt-10">شاشة العبور الموحدةFacing Terminal - شام كرت</p>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
