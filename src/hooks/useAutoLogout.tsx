import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes en millisecondes
const THROTTLE_DELAY = 1000; // Évite de réinitialiser le timer trop souvent

export function useAutoLogout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    // Throttle: ne réinitialise le timer que si au moins 1 seconde s'est écoulée
    const now = Date.now();
    if (now - lastActivityRef.current < THROTTLE_DELAY) {
      return;
    }
    lastActivityRef.current = now;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (user) {
      timeoutRef.current = setTimeout(async () => {
        toast.info('Déconnexion automatique pour inactivité de 5 minutes');
        await signOut();
        navigate('/auth');
      }, INACTIVITY_TIMEOUT);
    }
  }, [user, signOut, navigate]);

  useEffect(() => {
    if (!user) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Événements significatifs d'activité utilisateur
    const events = ['mousedown', 'keydown', 'touchstart', 'click'];

    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Initialiser le timer
    resetTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [user, resetTimer]);
}
