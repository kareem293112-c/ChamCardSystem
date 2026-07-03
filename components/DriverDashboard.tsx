import React, { useState, useEffect, useRef } from 'react';
import { Bus, Users, DollarSign, Volume2, VolumeX, Shield, Play, ArrowRight, Bell, Clock, RefreshCw } from 'lucide-react';

export const DriverDashboard: React.FC = () => {
  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>('bus_M1');
  const [status, setStatus] = useState<any>({
    bus: { routeName: 'ميكرو البرامكة - المزة جبل', routeCode: 'M1', ticketPrice: 1000 },
    totalPassengersToday: 0,
    totalRevenueToday: 0,
    recentPayments: []
  });
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  const [activeAlert, setActiveAlert] = useState<{ amount: number; passengerName: string; timestamp: number } | null>(null);

  const seenPaymentIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef<boolean>(true);

  // Load available buses
  useEffect(() => {
    fetch('/api/buses/locations')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setBuses(data);
          // Set initial selected bus if present
          if (data.some(b => b.id === 'bus_M1')) {
            setSelectedBusId('bus_M1');
          } else {
            setSelectedBusId(data[0].id);
          }
        }
      })
      .catch(err => console.error("Error loading buses", err));
  }, []);

  // Fetch driver status (polling)
  const fetchStatus = () => {
    if (!selectedBusId) return;
    fetch(`/api/driver/status?busId=${selectedBusId}`)
      .then(res => res.json())
      .then(data => {
        setStatus(data);

        // Check for new payments to trigger audio-visual alert
        if (data.recentPayments && data.recentPayments.length > 0) {
          const newest = data.recentPayments[0];

          // If this is the first load, populate the seen payments list without triggering notifications
          if (isFirstLoadRef.current) {
            data.recentPayments.forEach((p: any) => seenPaymentIdsRef.current.add(p.id));
            isFirstLoadRef.current = false;
            setLastPaymentId(newest.id);
            return;
          }

          // Trigger alert if we haven't seen this payment ID before
          if (!seenPaymentIdsRef.current.has(newest.id)) {
            seenPaymentIdsRef.current.add(newest.id);
            setLastPaymentId(newest.id);
            triggerAlert(newest);
          }
        } else {
          isFirstLoadRef.current = false;
        }
      })
      .catch(err => console.error("Error loading driver status", err))
      .finally(() => setIsLoading(false));
  };

  // Poll server for updates
  useEffect(() => {
    fetchStatus();
    isFirstLoadRef.current = true; // reset first load when bus selection changes
    seenPaymentIdsRef.current.clear();

    const interval = setInterval(() => {
      if (isLiveActive) {
        fetchStatus();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [selectedBusId, isLiveActive]);

  // Audio terminal beep synthesizer
  const playTerminalBeep = () => {
    if (!isAudioEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // High-pitch dual-frequency terminal chip sound
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1450, audioCtx.currentTime);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(2900, audioCtx.currentTime); // overtone for crispness

      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 0.2);
      osc2.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      console.warn("Audio Context beep error", e);
    }
  };

  // Speech synthesis notification
  const speakNotification = (passengerName: string, amount: number) => {
    if (!isAudioEnabled) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Cancel any ongoing speech
        const text = `تم دفع ${amount} ليرة سورية من الراكب ${passengerName}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-SA';
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn("Speech synthesis error", e);
    }
  };

  // Trigger alert sequence
  const triggerAlert = (payment: any) => {
    setActiveAlert({
      amount: payment.amount,
      passengerName: payment.passengerName,
      timestamp: payment.timestamp
    });

    playTerminalBeep();
    
    // Play sound and then speak after a brief 150ms delay
    setTimeout(() => {
      speakNotification(payment.passengerName, payment.amount);
    }, 150);

    // Auto dismiss alert screen after 5 seconds
    const timer = setTimeout(() => {
      setActiveAlert(null);
    }, 5500);

    return () => clearTimeout(timer);
  };

  // Manual trigger simulation helper for convenient testing right from the dashboard
  const simulateLocalScan = async () => {
    setIsLoading(true);
    try {
      const demoNames = [
        "سليمان أحمد", "نور الهدى", "كرم المرعي", "ميسون حداد", 
        "فادي العلي", "ريم الشامي", "باسل خوري", "زينب سليمان"
      ];
      const randomName = demoNames[Math.floor(Math.random() * demoNames.length)];
      
      const paymentId = "pm_sim_" + Math.random().toString(36).substr(2, 9);
      const simulatedPayment = {
        id: paymentId,
        busId: selectedBusId,
        amount: status.bus.ticketPrice || 1000,
        passengerName: randomName,
        timestamp: Date.now()
      };

      // We send simulated request to server or add locally then reload
      // Let's create a special helper route in server OR directly post a payment to a mock API
      // Since we already support real QR pay on the passenger site, let's create a simulator endpoint!
      // This is incredibly robust!
      const res = await fetch('/api/driver/simulate-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulatedPayment)
      });
      
      if (res.ok) {
        fetchStatus();
      }
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedBus = buses.find(b => b.id === selectedBusId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden" dir="rtl">
      
      {/* Background Matrix/Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-25"></div>

      {/* Driver HUD Header */}
      <header className="relative z-10 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <Bus size={24} />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block">شاشة حافلات شام كرت</span>
            <h1 className="text-lg font-black text-white">محاكي لوحة السائق الذكية</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio toggle */}
          <button 
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className={`p-3 rounded-xl border transition-all flex items-center justify-center ${isAudioEnabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
            title={isAudioEnabled ? "الصوت مفعّل" : "الصوت مكتوم"}
          >
            {isAudioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          {/* Connection status */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>بث حيّ متصل</span>
          </div>

          <a 
            href="/"
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-bold transition-all"
          >
            <span>بوابة الركاب</span>
            <ArrowRight size={14} className="rotate-180" />
          </a>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="relative z-10 flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
        
        {/* Left Control Column */}
        <section className="lg:col-span-1 space-y-6">
          
          {/* Bus Selector Card */}
          <div className="bg-slate-900/40 border border-slate-900 backdrop-blur-md rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-slate-300">تخصيص شاشة الحافلة</h2>
              <Clock className="text-amber-500" size={16} />
            </div>
            
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              اختر الحافلة الحالية لمراقبة صعود الركاب والإيرادات بشكل مباشر. أي دفع عبر QR لهذه الحافلة سيصدر تنبيهاً فورياً هنا.
            </p>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 block uppercase">الحافلة النشطة ومسارها</label>
              <select 
                value={selectedBusId}
                onChange={(e) => {
                  setSelectedBusId(e.target.value);
                  setIsLoading(true);
                }}
                className="w-full p-4 bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-2xl font-bold text-sm text-white outline-none transition-all cursor-pointer"
              >
                {buses.length > 0 ? buses.map(b => (
                  <option key={b.id} value={b.id} className="bg-slate-950 text-white">
                    {b.route_name} ({b.ticket_price} ل.س)
                  </option>
                )) : (
                  <option value="bus_M1" className="bg-slate-950">ميكرو البرامكة - المزة جبل (1,000 ل.س)</option>
                )}
              </select>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-900 flex justify-between text-xs text-slate-400">
              <span>طول الخط / التعرفة:</span>
              <span className="font-bold text-white">
                {status.bus?.ticketPrice === 2500 ? 'خط طويل (2,500 ل.س)' : 'خط قصير (1,000 ل.س)'}
              </span>
            </div>
          </div>

          {/* Passenger Simulator Panel */}
          <div className="bg-slate-900/40 border border-slate-900 backdrop-blur-md rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full"></div>
            
            <h2 className="text-sm font-black text-slate-300 mb-2 relative z-10">لوحة محاكاة الركاب والسكانر</h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed relative z-10">
              لتسهيل التجربة دون الحاجة لجهازين، اضغط على زر المحاكاة أدناه لتوليد راكب عشوائي يقوم بمسح QR وصعود الباص فوراً.
            </p>

            <button
              onClick={simulateLocalScan}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-black py-4 px-5 rounded-2xl shadow-xl hover:from-amber-500 hover:to-amber-400 active:scale-95 transition-all text-xs flex items-center justify-center gap-2 relative z-10 disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Play size={16} fill="currentColor" />
              )}
              <span>محاكاة صعود راكب جديد (Scan QR)</span>
            </button>
            
            <p className="text-[10px] text-slate-500 text-center mt-3">
              يقوم باحتساب التعرفة ({status.bus?.ticketPrice || 1000} ل.س) ديناميكياً حسب نوع الخط المحدد.
            </p>
          </div>

        </section>

        {/* Right Dashboard Counters & Payments */}
        <section className="lg:col-span-2 space-y-6">
          
          {/* Quick HUD Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Passengers counter */}
            <div className="bg-slate-900/50 border border-slate-900 rounded-3xl p-6 relative overflow-hidden flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">إجمالي ركاب اليوم</span>
                <span className="text-4xl font-black text-white font-sans tabular-nums block">
                  {status.totalPassengersToday.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold block">محدث تلقائياً قبل ثوانٍ</span>
              </div>
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                <Users size={32} />
              </div>
            </div>

            {/* Revenue counter */}
            <div className="bg-slate-900/50 border border-slate-900 rounded-3xl p-6 relative overflow-hidden flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">إجمالي إيرادات اليوم</span>
                <span className="text-4xl font-black text-amber-400 font-sans tabular-nums block">
                  {status.totalRevenueToday.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 font-bold block">ليرة سورية (شام كاش)</span>
              </div>
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-400">
                <DollarSign size={32} />
              </div>
            </div>

          </div>

          {/* Recent Payments Board */}
          <div className="bg-slate-900/40 border border-slate-900 backdrop-blur-md rounded-3xl p-6">
            <h2 className="text-sm font-black text-slate-300 mb-4 flex items-center gap-2">
              <Bell size={16} className="text-amber-500" />
              <span>قائمة الركاب الصاعدين مؤخراً (البث الحيّ)</span>
            </h2>

            {status.recentPayments && status.recentPayments.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {status.recentPayments.map((p: any) => (
                  <div 
                    key={p.id}
                    className="p-4 bg-slate-950 border border-slate-900 hover:border-slate-850 rounded-2xl flex items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 border border-slate-850 text-xs font-black">
                        QR
                      </div>
                      <div>
                        <span className="font-bold text-sm text-white block">{p.passengerName}</span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-sans">
                          {new Date(p.timestamp).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400 block">+{p.amount.toLocaleString()} ل.س</span>
                      <span className="text-[9px] text-slate-500 block">مدفوع ومؤكد</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 border-2 border-dashed border-slate-900 rounded-3xl">
                <Users size={40} className="mx-auto mb-3 text-slate-700 animate-pulse" />
                <p className="text-xs font-bold">لا يوجد صعود ركاب مسجل لليوم حتى الآن</p>
                <p className="text-[10px] text-slate-600 mt-1">بانتظار مسح QR من أحد الركاب أو صعود محاكى</p>
              </div>
            )}
          </div>

        </section>

      </main>

      {/* GIANT INSTANT DRIVER NOTIFICATION ALERT PORTAL */}
      {activeAlert && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          
          {/* Animated visual ring pulses */}
          <div className="relative mb-10 w-48 h-48 bg-amber-500/10 border-2 border-amber-500/40 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(245,158,11,0.2)] animate-pulse">
            <div className="absolute inset-4 bg-amber-500/20 rounded-full animate-ping opacity-30"></div>
            <div className="w-24 h-24 bg-amber-500 rounded-[36px] flex items-center justify-center text-slate-950 shadow-2xl relative z-10">
              <Bus size={48} className="animate-bounce" />
            </div>
          </div>

          <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase mb-4 animate-pulse">
            تم الدفع وتأكيد الصعود الآن
          </span>

          <h2 className="text-3xl font-black text-slate-400 mb-2">أجرة الحافلة مسجلة</h2>
          
          <div className="text-white text-5xl font-black mb-6 tracking-tight">
            تم دفع <span className="text-amber-400">{activeAlert.amount.toLocaleString()}</span> ل.س
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl px-8 py-4 text-center max-w-md shadow-2xl mb-8">
            <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">الراكب</span>
            <span className="text-2xl font-black text-white">{activeAlert.passengerName}</span>
          </div>

          <p className="text-xs text-slate-500 font-medium">شاشة السائق الآلية - شام كرت دمشق</p>

          <button 
            onClick={() => setActiveAlert(null)}
            className="mt-8 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 px-6 py-2.5 rounded-xl text-xs font-black transition-all"
          >
            إغلاق التنبيه
          </button>
        </div>
      )}

    </div>
  );
};
