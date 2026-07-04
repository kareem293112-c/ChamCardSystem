import { useEffect, useRef } from 'react';

interface UseAdminIdleTimeoutProps {
  onTimeout: () => void;
  timeoutMs?: number;
}

export function useAdminIdleTimeout({ onTimeout, timeoutMs = 5 * 60 * 1000 }: UseAdminIdleTimeoutProps) {
  const timeoutRef = useRef<any>(null);
  const onTimeoutRef = useRef(onTimeout);

  // Keep the latest callback reference to avoid stale closures
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onTimeoutRef.current();
      }, timeoutMs);
    };

    // Initialize timer
    resetTimer();

    // Listen to mouse movement and other interactions
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup listeners and timer on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [timeoutMs]);
}
