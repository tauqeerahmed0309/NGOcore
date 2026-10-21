import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Respect prefers-reduced-motion
const mm = gsap.matchMedia();

export const fadeUp = (element, delay = 0) => {
  if (!element) return;
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.fromTo(
      element,
      { y: 35, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.85,
        delay,
        ease: 'power3.out',
        scrollTrigger: { trigger: element, start: 'top 88%', once: true }
      }
    );
  });
  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set(element, { opacity: 1, y: 0 });
  });
};

export const staggerCards = (container, cards) => {
  if (!container || !cards || cards.length === 0) return;
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.fromTo(
      cards,
      { y: 40, opacity: 0, scale: 0.97 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.65,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: { trigger: container, start: 'top 84%', once: true }
      }
    );
  });
  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set(cards, { opacity: 1, y: 0, scale: 1 });
  });
};

export const parallax = (element, speed = 0.5) => {
  if (!element) return;
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.to(element, {
      y: () => -80 * speed,
      ease: 'none',
      scrollTrigger: {
        trigger: element,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    });
  });
};

export const countUp = (element, targetValue) => {
  if (!element) return;
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.fromTo(
      element,
      { innerHTML: 0 },
      {
        innerHTML: targetValue,
        duration: 2.2,
        ease: 'power2.out',
        snap: { innerHTML: 1 },
        scrollTrigger: { trigger: element, start: 'top 92%' }
      }
    );
  });
  mm.add('(prefers-reduced-motion: reduce)', () => {
    element.innerHTML = targetValue;
  });
};

export const pageTransition = (element) => {
  if (!element) return;
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.fromTo(
      element,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    );
  });
  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set(element, { opacity: 1, y: 0 });
  });
};

export const floatElement = (element, yDistance = 10, duration = 3.5) => {
  if (!element) return;
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.to(element, {
      y: -yDistance,
      duration,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });
  });
};

export const heroEntrance = ({ badge, headline, subtitle, ctas, showcase }) => {
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    if (badge) {
      tl.fromTo(badge, { opacity: 0, y: -20, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.6 });
    }
    if (headline) {
      tl.fromTo(headline, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.3');
    }
    if (subtitle) {
      tl.fromTo(subtitle, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.7 }, '-=0.5');
    }
    if (ctas) {
      tl.fromTo(ctas, { opacity: 0, y: 20, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.6 }, '-=0.4');
    }
    if (showcase) {
      tl.fromTo(
        showcase,
        { opacity: 0, y: 60, scale: 0.94, rotateX: 6 },
        { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 1.1, ease: 'power4.out' },
        '-=0.3'
      );
    }
  });
};
