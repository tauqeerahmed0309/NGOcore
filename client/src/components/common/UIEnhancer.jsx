import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fadeUp, staggerCards, tiltOnHover } from '../../animations';

export default function UIEnhancer() {
  const { pathname } = useLocation();

  useEffect(() => {
    const root = document.querySelector('.layout-root');
    if (!root) return undefined;
    return staggerCards(root.querySelectorAll('.app-sidebar, .app-header'), {
      duration: 0.24,
      stagger: 0.06,
      distance: 6
    });
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    document.documentElement.dataset.motion = reducedMotion.matches ? 'reduced' : 'full';

    const root = document.querySelector('.layout-root');
    if (!root) return undefined;

    const cleanups = [];

    const pageHeader = root.querySelector('.page-header');
    if (pageHeader) cleanups.push(fadeUp(pageHeader, { duration: 0.28, distance: 6 }));

    const dashboardCards = root.querySelectorAll('.dash-quick-stats > .quick-stat-card');
    if (dashboardCards.length) {
      cleanups.push(staggerCards(dashboardCards, {
        duration: 0.28,
        stagger: 0.055,
        distance: 8
      }));
    }

    const profileCard = root.querySelector('.profile-card');
    if (profileCard) cleanups.push(fadeUp(profileCard, { duration: 0.28, delay: 0.06, distance: 7 }));

    root.querySelectorAll('[data-motion-tilt], .quick-stat-card').forEach((element) => {
      cleanups.push(tiltOnHover(element));
    });

    return () => cleanups.reverse().forEach((cleanup) => cleanup());
  }, [pathname]);

  return null;
}
