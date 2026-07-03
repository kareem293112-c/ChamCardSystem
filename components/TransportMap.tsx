import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  LocateFixed, CheckCircle, Navigation2, 
  X, Loader2, MapPin, Navigation,
  Plus, Search, ArrowLeft,
  Sparkles, ChevronRight, MapPinned, Flag, Compass, Signal, Bus, Train, Bookmark, Share2, ClipboardList
} from 'lucide-react';
import { getPlaceSuggestions } from '../services/geminiService';

// Standard marker icon used across Leaflet maps
const CENTRAL_MARKER_ICON = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const BUS_MARKER_ICON = L.divIcon({
  html: `<div class="bg-emerald-600 text-white p-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center animate-pulse">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bus"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
         </div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

interface TransportMapProps {
  onSaveRoute?: (from: string, to: string) => void;
  isAlreadySaved?: (from: string, to: string) => boolean;
  initialRoute?: { from: string, to: string } | null;
}

// Preset Syrian public transport lines like Istanbulkart (Metro, Bus, Tram)
const PRESET_LINES = [
  {
    id: 'M1',
    lineName: 'M1 | مترو دمشق الغربي',
    type: 'metro',
    color: '#dc2626',
    path: [
      [33.5110, 36.2750], // البرامكة
      [33.5140, 36.2620], // ساحة الأمويين
      [33.5120, 36.2480], // المزة الشيخ سعد
      [33.5080, 36.2300], // أوتستراد المزة
      [33.4980, 36.2150]  // كراجات السومرية
    ] as L.LatLngExpression[],
    stations: ['ساحة البرامكة', 'الأمويين', 'الشيخ سعد', 'أوتستراد المزة', 'السومرية']
  },
  {
    id: 'B2',
    lineName: 'B2 | باص الدائري الشمالي',
    type: 'bus',
    color: '#059669',
    path: [
      [33.5180, 36.2780], // جسر الرئيس
      [33.5260, 36.2950], // شارع بغداد
      [33.5220, 36.3120], // باب توما
      [33.5150, 36.3200], // القصاع
      [33.5040, 36.3150]  // العباسيين
    ] as L.LatLngExpression[],
    stations: ['جسر الرئيس', 'شارع بغداد', 'باب توما', 'ساحة القصاع', 'الشرقي / العباسيين']
  },
  {
    id: 'T3',
    lineName: 'T3 | ترام المهاجرين التراثي',
    type: 'tram',
    color: '#d97706',
    path: [
      [33.5120, 36.2800], // المرجة
      [33.5190, 36.2830], // الصالحية وبوابة الصالحية
      [33.5250, 36.2740], // العفيف
      [33.5290, 36.2650]  // حي المهاجرين
    ] as L.LatLngExpression[],
    stations: ['حي المرجة', 'الصالحية', 'حديقة العفيف', 'المهاجرين']
  }
];

const POPULAR_HUBS = [
  'ساحة البرامكة - تجمع الباصات',
  'جسر الرئيس - محور النقل العام',
  'حي باب توما - موقف السرفيس',
  'أوتستراد المزة - مشفى المواساة',
  'ساحة الميسات - اتجاه المهاجرين',
  'ساحة العباسيين - كراجات الشرق',
  'حي الشعلان - تقاطع السوق الرئيسي'
];

const TransportMap: React.FC<TransportMapProps> = ({ 
  onSaveRoute, 
  isAlreadySaved,
  initialRoute 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userMarker = useRef<L.Marker | null>(null);
  const routeLayer = useRef<L.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const busMarkersRef = useRef<Record<string, L.Marker>>({});

  const [from, setFrom] = useState('موقعي الحالي');
  const [to, setTo] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeField, setActiveField] = useState<'from' | 'to' | null>(null);
  const [isRouteSelected, setIsRouteSelected] = useState(false);
  const [isPathDrawn, setIsPathDrawn] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<'idle' | 'tracking' | 'error' | 'permission'>('idle');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  
  const [remainingTime, setRemainingTime] = useState(12);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTransitLine, setSelectedTransitLine] = useState<string | null>(null);

  // Load Initial Route from Profile / Quick action if present
  useEffect(() => {
    if (initialRoute) {
      setFrom(initialRoute.from);
      setTo(initialRoute.to);
      setIsRouteSelected(true);
      setIsExpanded(false);
    }
  }, [initialRoute]);

  // Leaflet initialization
  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([33.5138, 36.2765], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);
    }

    const startTracking = () => {
      if (!navigator.geolocation) {
        setTrackingStatus('error');
        return;
      }

      if (watchIdRef.current !== null) return;

      setTrackingStatus('permission');
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy: acc } = pos.coords;
          setTrackingStatus('tracking');
          setAccuracy(acc);
          
          if (mapInstance.current) {
            if (!userMarker.current) {
              userMarker.current = L.marker([latitude, longitude], { icon: CENTRAL_MARKER_ICON }).addTo(mapInstance.current);
            } else {
              userMarker.current.setLatLng([latitude, longitude]);
            }
            
            if (isNavigating) {
              mapInstance.current.flyTo([latitude, longitude], 17, { animate: true });
            }
          }
        },
        (err) => {
          setTrackingStatus('error');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    };

    startTracking();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [isNavigating]);

  // Live Bus Location Polling from Firestore backend
  useEffect(() => {
    const fetchBuses = () => {
      fetch('/api/buses/locations')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((buses: any[]) => {
        if (!mapInstance.current) return;
        buses.forEach(bus => {
          const latlng: L.LatLngExpression = [bus.location.lat, bus.location.lng];
          if (busMarkersRef.current[bus.id]) {
            busMarkersRef.current[bus.id].setLatLng(latlng);
          } else {
            const marker = L.marker(latlng, { icon: BUS_MARKER_ICON })
              .addTo(mapInstance.current!)
              .bindPopup(`<b>حافلة: ${bus.route_name}</b><br/>الخط: ${bus.route_code}<br/>التعرفة: ${bus.ticket_price} ل.س`);
            busMarkersRef.current[bus.id] = marker;
          }
        });
      })
      .catch(err => console.warn("Live bus coordinates currently unavailable or server seeding pending."));
    };

    fetchBuses();
    const interval = setInterval(fetchBuses, 5000);

    return () => {
      clearInterval(interval);
      Object.values(busMarkersRef.current).forEach((marker: any) => marker.remove());
      busMarkersRef.current = {};
    };
  }, [isNavigating]);

  // Fetch AI suggestion when 'To' field is modified
  useEffect(() => {
    const fetchTimer = setTimeout(async () => {
      if (to && to.length >= 2 && to !== 'موقعي الحالي' && activeField === 'to') {
        setIsLoading(true);
        try {
          const results = await getPlaceSuggestions(to);
          setSuggestions(results);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(fetchTimer);
  }, [to, activeField]);

  const handleSelectLine = (lineId: string) => {
    setSelectedTransitLine(lineId);
    const line = PRESET_LINES.find(l => l.id === lineId);
    if (!line || !mapInstance.current) return;

    setFrom(line.stations[0]);
    setTo(line.stations[line.stations.length - 1]);
    setIsRouteSelected(true);
    setIsExpanded(false);

    // Draw preset path
    if (routeLayer.current) routeLayer.current.remove();
    routeLayer.current = L.polyline(line.path, { 
      color: line.color, 
      weight: 7, 
      opacity: 0.95,
      lineJoin: 'round'
    }).addTo(mapInstance.current);

    // Zoom and highlight stations
    mapInstance.current.fitBounds(routeLayer.current.getBounds(), { padding: [60, 60] });
    
    // Set mock arrival minutes
    setRemainingTime(9 + Math.floor(Math.random() * 8));
    setIsPathDrawn(true);
  };

  const handleDrawRoute = () => {
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      setIsPathDrawn(true);
      if (mapInstance.current) {
        // Generate pseudo random path to mimic real transit lines
        const startPoint: L.LatLngExpression = [33.5138, 36.2765]; // Al Baramkeh
        const endPoint: L.LatLngExpression = [33.5220, 36.2850]; // President's Bridge / Baghdad St / etc
        
        const demoPath: L.LatLngExpression[] = [
          startPoint,
          [33.5160, 36.2720],
          [33.5210, 36.2790],
          endPoint,
          [33.5250, 36.2920]
        ];
        
        if (routeLayer.current) routeLayer.current.remove();
        routeLayer.current = L.polyline(demoPath, { 
          color: '#059669', 
          weight: 6, 
          opacity: 0.9,
          lineJoin: 'round'
        }).addTo(mapInstance.current);
        
        // Mark destination station
        L.marker(endPoint, { icon: CENTRAL_MARKER_ICON })
          .addTo(mapInstance.current)
          .bindPopup(`<b>المحطة والوجهة المبرمجة:</b><br/>${to}`)
          .openPopup();
        
        mapInstance.current.fitBounds(routeLayer.current.getBounds(), { padding: [50, 50] });
      }
    }, 1200);
  };

  const startNavigationWalk = () => {
    setIsNavigating(true);
    // Simulating moving along the line
    let count = 0;
    const navInterval = setInterval(() => {
      if (!isNavigating || count > 5) {
        clearInterval(navInterval);
        return;
      }
      setRemainingTime(prev => Math.max(0, prev - 2));
      count++;
    }, 4000);
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setIsRouteSelected(false);
    setIsPathDrawn(false);
    setSelectedTransitLine(null);
    if (routeLayer.current) routeLayer.current.remove();
    routeLayer.current = null;
  };

  const centerOnUser = () => {
    if (userMarker.current && mapInstance.current) {
      mapInstance.current.flyTo(userMarker.current.getLatLng(), 17);
    }
  };

  const isSaved = from && to && isAlreadySaved?.(from, to);

  return (
    <div className="absolute inset-0 w-full h-full bg-slate-100 dark:bg-slate-950 overflow-hidden flex flex-col font-sans" dir="rtl">
      <div className="flex-1 relative">
        <div ref={mapRef} id="map" className="w-full h-full"></div>
        
        {/* Signal & Accuracy Indicators */}
        <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
           <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 backdrop-blur-md border ${
             trackingStatus === 'tracking' ? 'bg-emerald-600/95 text-white border-emerald-400/20 shadow-lg' : 
             trackingStatus === 'error' ? 'bg-rose-500/90 text-white border-rose-400/20 shadow-lg' : 'bg-slate-800/90 text-white border-white/10 shadow-md'
           }`}>
              <Signal size={12} className={trackingStatus === 'tracking' ? 'animate-pulse' : ''} />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                {trackingStatus === 'tracking' ? `تتبع مباشر (دقة ${Math.round(accuracy || 0)}م)` : 
                 trackingStatus === 'error' ? 'GPS مغلق' : 'جاري تفعيل الـ GPS...'}
              </span>
           </div>
        </div>

        {/* Floating Quick Action Overlays (preset lines on left) */}
        {!isExpanded && !isNavigating && (
          <div className="absolute top-20 right-6 z-20 flex flex-col gap-2 max-w-[200px]">
            <div className="bg-white/95 dark:bg-slate-900/95 p-3 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800">
              <p className="text-[9px] font-black text-rose-500 mb-2 leading-none uppercase tracking-widest text-right">شبكة الملاحة والشام كارت</p>
              <div className="space-y-1.5">
                {PRESET_LINES.map(line => (
                  <button
                    key={line.id}
                    onClick={() => handleSelectLine(line.id)}
                    className={`w-full text-right p-2 rounded-xl text-[10px] font-black flex items-center gap-2 transition active:scale-95 border ${
                      selectedTransitLine === line.id 
                        ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400' 
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: line.color }} />
                    <span className="truncate flex-1">{line.lineName}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isExpanded && !isNavigating && (
          <div className="absolute top-6 right-6 z-20 flex flex-col gap-3">
            <button onClick={centerOnUser} className="w-12 h-12 bg-white dark:bg-slate-800 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-700 active:scale-95 transition-all">
              <LocateFixed size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Modern Istanbulkart-like search widget */}
      {!isExpanded && !isRouteSelected && !isNavigating && (
        <div className="absolute bottom-28 left-6 right-6 z-40">
          <button 
            onClick={() => { setIsExpanded(true); setActiveField('to'); }} 
            className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl h-20 p-2 shadow-[0_25px_50px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800 flex items-center active:scale-[0.98] transition-all"
          >
             <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl flex items-center justify-center shadow-md"><Sparkles size={22} className="animate-pulse" /></div>
             <div className="flex-1 text-right pr-4">
               <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-0.5">مساعد شام الجغرافي</p>
               <p className="text-base font-black text-slate-800 dark:text-white">إلى أين الوجهة اليوم؟</p>
             </div>
             <div className="pl-4 text-slate-300 dark:text-slate-600"><ChevronRight size={18} className="rotate-180" /></div>
          </button>
        </div>
      )}

      {/* Destination Selection drawer / Fullscreen overlay like Istanbulkart route planning */}
      {isExpanded && (
        <div className="absolute inset-0 bg-white dark:bg-slate-950 z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
          {/* Header */}
          <div className="p-6 pt-12 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <MapPinned size={20} />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-800 dark:text-white">تخطيط رحلة النقل</h3>
                <p className="text-[9px] font-bold text-slate-400 tracking-wider">احسب مسارك فوراً وبدقة</p>
              </div>
            </div>
            <button 
              onClick={() => setIsExpanded(false)} 
              className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-300 active:scale-90 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Fields inputs */}
          <div className="p-6 space-y-4 bg-slate-50 dark:bg-slate-900">
            {/* From Input */}
            <div className="space-y-1.5 text-right relative">
              <label className="text-[10px] font-black text-slate-400 uppercase mr-1">نقطة الانطلاق</label>
              <div className="relative">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><Flag size={16} /></div>
                <input 
                  type="text" 
                  value={from} 
                  onChange={(e) => setFrom(e.target.value)}
                  onFocus={() => setActiveField('from')}
                  className="w-full bg-white dark:bg-slate-800 rounded-2xl py-4 pr-12 pl-4 text-sm font-bold border border-slate-100 dark:border-slate-750 focus:ring-2 focus:ring-emerald-500 outline-none text-right dark:text-white"
                  placeholder="من أين ستنطلق؟"
                />
              </div>
            </div>

            {/* To Input */}
            <div className="space-y-1.5 text-right relative">
              <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase mr-1">الوجهة أو الموقف المراد</label>
              <div className="relative">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600"><Compass size={16} /></div>
                <input 
                  type="text" 
                  value={to} 
                  onChange={(e) => setTo(e.target.value)}
                  onFocus={() => setActiveField('to')}
                  className="w-full bg-white dark:bg-slate-800 rounded-2xl py-4 pr-12 pl-4 text-sm font-bold border border-emerald-100 dark:border-emerald-950 focus:ring-2 focus:ring-emerald-500 outline-none text-right dark:text-white"
                  placeholder="ابحث عن موقف، شارع، أو ساحة..."
                  autoFocus
                />
                {to && (
                  <button 
                    onClick={() => setTo('')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Suggestions or Hub list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="animate-spin text-emerald-600 w-8 h-8" />
                <p className="text-xs text-slate-400 font-bold">جاري البحث جغرافياً عبر شام الذكي...</p>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase text-right mr-1">المحطات المقترحة</p>
                <div className="divide-y divide-slate-100 dark:divide-slate-900 border border-slate-100 dark:border-slate-900 rounded-[24px] overflow-hidden bg-white dark:bg-slate-900">
                  {suggestions.map((place, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setTo(place);
                        setSuggestions([]);
                        setIsRouteSelected(true);
                        setIsExpanded(false);
                      }}
                      className="w-full text-right px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition"
                    >
                      <MapPin size={16} className="text-emerald-500" />
                      <span className="text-xs font-black text-slate-700 dark:text-slate-200">{place}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Popular Stations preset list */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase text-right mr-1">مواقف النقل الكبرى بدمشق سورياً</p>
                  <div className="grid grid-cols-1 gap-2">
                    {POPULAR_HUBS.map((hub, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setTo(hub);
                          setIsRouteSelected(true);
                          setIsExpanded(false);
                        }}
                        className="text-right p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 hover:text-emerald-600 border border-slate-100 dark:border-slate-800 flex items-center gap-3 transition group active:scale-[0.98]"
                      >
                        <Bus size={16} className="text-slate-400 group-hover:text-emerald-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{hub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Active Route Navigation Panel */}
      {isRouteSelected && !isExpanded && (
        <div className="absolute bottom-28 left-6 right-6 z-40 animate-in slide-in-from-bottom duration-500">
           <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-[36px] p-6 shadow-[0_35px_80px_rgba(0,0,0,0.3)] border border-white/50 dark:border-slate-800">
              {/* Route Summary */}
              <div className="flex justify-between items-center mb-6">
                 <div className="text-right">
                    <p className="text-sm font-black text-slate-800 dark:text-white max-w-[200px] truncate">إلى: {to}</p>
                    <p className="text-[9px] font-black text-slate-450 uppercase mt-1">من: {from}</p>
                 </div>
                 <div className="bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                   <Bookmark size={12} className={isSaved ? 'text-emerald-600 fill-emerald-600' : 'text-slate-400'} />
                   <span 
                     onClick={() => !isSaved && onSaveRoute?.(from, to)}
                     className="text-[9px] font-black text-emerald-600 cursor-pointer"
                   >
                     {isSaved ? 'تم الحفظ' : 'احفظ المسار'}
                   </span>
                 </div>
              </div>

              {/* Transit Details (ETA and Fare) */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl mb-6">
                <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-2">
                  <p className="text-[10px] font-bold text-slate-400">وقت الوصول المقدر</p>
                  <p className="text-xl font-black text-slate-850 dark:text-white mt-0.5">{remainingTime} دقائق</p>
                </div>
                <div className="text-right pr-2">
                  <p className="text-[10px] font-bold text-slate-400">تكلفة العبور المقدرة</p>
                  <p className="text-xl font-black text-emerald-600 mt-0.5">1,000 ل.س</p>
                </div>
              </div>

              <div className="flex gap-3">
                 <button 
                   onClick={isPathDrawn ? (isNavigating ? stopNavigation : startNavigationWalk) : handleDrawRoute} 
                   className={`flex-1 font-black py-4.5 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2.5 text-base shadow-xl ${
                     isCalculating ? 'bg-slate-300 cursor-wait' :
                     isNavigating ? 'bg-rose-600 text-white shadow-rose-500/20' :
                     isPathDrawn ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 
                     'bg-blue-600 text-white shadow-blue-500/20'
                   }`}
                 >
                    {isCalculating ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>جاري التحليل الجغرافي...</span>
                      </>
                    ) : (
                      <>
                        <Navigation2 size={18} />
                        <span>{isNavigating ? "إنهاء الرحلة والملاحة" : (isPathDrawn ? "بدء الملاحة الحية" : "رسم مسار العبور")}</span>
                      </>
                    )}
                 </button>
                 {!isNavigating && (
                   <button 
                     onClick={stopNavigation} 
                     className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200 dark:border-slate-700"
                   >
                     <X size={20} />
                   </button>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Navigation Walk Overlay */}
      {isNavigating && (
        <div className="absolute top-24 left-6 right-6 z-40 bg-emerald-650 text-white rounded-[32px] p-5 shadow-2xl flex items-center justify-between border-2 border-white/20 animate-bounce">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Compass className="animate-spin text-emerald-100" size={20} />
            </div>
            <div className="text-right">
              <p className="text-xs font-black">جاري مرافقة رحلتك بالحافلة...</p>
              <p className="text-[10px] opacity-90 mt-0.5">البطاقة جاهزة للتمرير عند البوابة</p>
            </div>
          </div>
          <button onClick={stopNavigation} className="text-xs font-black bg-white/10 px-4 py-2 rounded-xl border border-white/20">إنهاء</button>
        </div>
      )}
    </div>
  );
};

export default TransportMap;
