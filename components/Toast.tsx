
import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[600] w-[90%] max-w-sm animate-in slide-in-from-top duration-500">
      <div className={`flex items-center gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-md border ${
        type === 'success' 
          ? 'bg-emerald-600/90 border-emerald-400/20 text-white' 
          : 'bg-red-600/90 border-red-400/20 text-white'
      }`}>
        {type === 'success' ? (
          <CheckCircle className="w-6 h-6 shrink-0" />
        ) : (
          <AlertCircle className="w-6 h-6 shrink-0" />
        )}
        <p className="flex-1 font-bold text-sm leading-tight">{message}</p>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
