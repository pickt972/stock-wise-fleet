import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes en millisecondes

export function useAutoLogout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (user) {
      timeoutRef.current = setTimeout(async () => {
        toast.info('Déconnexion automatique pour inactivité');
        await signOut();
        navigate('/auth');
      }, INACTIVITY_TIMEOUT);
    }
  };

  useEffect(() => {
    if (!user) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Événements qui réinitialisent le timer d'inactivité
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Initialiser le timer
    resetTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user]);
}
