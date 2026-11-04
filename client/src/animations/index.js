import { gsap } from 'gsap';

const motionIsReduced = () => typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const cleanupTween = (tween, targets, finalState) => () => {
  tween?.scrollTrigger?.kill();
  tween?.kill();
  if (targets && finalState) gsap.set(targets, finalState);
};

const withScrollTrigger = (createAnimation) => {
  let cancelled = false;
  let cleanup = () => {};
  import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
    gsap.registerPlugin(ScrollTrigger);
    if (!cancelled) cleanup = createAnimation(ScrollTrigger);
  });
  return () => {
    cancelled = true;
    cleanup();
  };
};

const getScrollTrigger = (setting, element, defaults = {}) => {
  if (!setting) return undefined;
  if (setting === true) {
    return { trigger: element, start: 'top 88%', once: true, ...defaults };
  }
  return { trigger: element, start: 'top 88%', once: true, ...defaults, ...setting };
};

export function fadeUp(element, options = {}) {
  if (!element) return () => {};
  const { duration = 0.38, delay = 0, distance = 14, scrollTrigger, ease = 'power2.out' } = options;
  if (motionIsReduced()) {
    gsap.set(element, { autoAlpha: 1, y: 0 });
    return () => {};
  }
  const createTween = () => {
    const tween = gsap.fromTo(
      element,
      { autoAlpha: 0, y: distance },
      {
        autoAlpha: 1,
        y: 0,
        duration,
        delay,
        ease,
        immediateRender: false,
        ...(scrollTrigger ? { scrollTrigger: getScrollTrigger(scrollTrigger, element) } : {})
      }
    );
    return cleanupTween(tween, element, { autoAlpha: 1, y: 0 });
  };
  return scrollTrigger
    ? withScrollTrigger(createTween)
    : createTween();
}

export function staggerCards(selector, options = {}) {
  const elements = typeof selector === 'string'
    ? gsap.utils.toArray(selector, options.root || document)
    : gsap.utils.toArray(selector || []);
  if (!elements.length) return () => {};
  const {
    duration = 0.3,
    stagger = 0.045,
    distance = 10,
    scrollTrigger,
    ease = 'power2.out'
  } = options;
  if (motionIsReduced()) {
    gsap.set(elements, { autoAlpha: 1, y: 0 });
    return () => {};
  }
  const createTween = () => {
    const tween = gsap.fromTo(
      elements,
      { autoAlpha: 0, y: distance },
      {
        autoAlpha: 1,
        y: 0,
        duration,
        stagger,
        ease,
        immediateRender: false,
        ...(scrollTrigger ? { scrollTrigger: getScrollTrigger(scrollTrigger, elements[0]) } : {})
      }
    );
    return cleanupTween(tween, elements, { autoAlpha: 1, y: 0 });
  };
  return scrollTrigger ? withScrollTrigger(createTween) : createTween();
}

export function countUp(element, targetValue, duration = 0.8, options = {}) {
  if (!element) return () => {};
  const target = Number(targetValue);
  if (!Number.isFinite(target)) return () => {};
  const decimals = options.decimals ?? Number(element.dataset.countDecimals || 0);
  const prefix = options.prefix ?? element.dataset.countPrefix ?? '';
  const suffix = options.suffix ?? element.dataset.countSuffix ?? '';
  const formatter = new Intl.NumberFormat('en', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  const render = (value) => {
    element.textContent = `${prefix}${formatter.format(value)}${suffix}`;
  };
  if (motionIsReduced()) {
    render(target);
    return () => {};
  }

  let tween;
  const start = () => {
    const value = { count: 0 };
    tween = gsap.to(value, {
      count: target,
      duration,
      ease: 'power2.out',
      onUpdate: () => render(value.count)
    });
  };

  if (options.whenVisible) {
    render(0);
    return withScrollTrigger((ScrollTrigger) => {
      const trigger = ScrollTrigger.create({
        trigger: options.trigger || element,
        start: options.start || 'top 88%',
        once: true,
        onEnter: start
      });
      return () => {
        trigger.kill();
        tween?.kill();
      };
    });
  }

  start();
  return () => tween?.kill();
}

export function animateBars(root, selector = '[data-chart-bar]') {
  if (!root) return () => {};
  const bars = root.querySelectorAll(selector);
  if (motionIsReduced()) {
    bars.forEach((bar) => gsap.set(bar, { scaleX: Number(bar.dataset.targetScale || 1) }));
    return () => {};
  }
  const tween = gsap.fromTo(
    bars,
    { scaleX: 0 },
    {
      scaleX: (index, bar) => Number(bar.dataset.targetScale || 1),
      duration: 0.38,
      stagger: 0.045,
      ease: 'power2.out',
      transformOrigin: 'left center'
    }
  );
  return () => {
    tween?.kill();
    bars.forEach((bar) => gsap.set(bar, { scaleX: Number(bar.dataset.targetScale || 1) }));
  };
}

export function tiltOnHover(element) {
  if (!element || motionIsReduced()) return () => {};
  let activeTween;
  const onMove = (event) => {
    if (event.pointerType === 'touch') return;
    const bounds = element.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    activeTween?.kill();
    activeTween = gsap.to(element, {
      rotationY: x * 5,
      rotationX: y * -5,
      y: -3,
      scale: 1.012,
      transformPerspective: 900,
      duration: 0.22,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  };
  const onLeave = () => {
    activeTween?.kill();
    activeTween = gsap.to(element, {
      rotationX: 0,
      rotationY: 0,
      y: 0,
      scale: 1,
      duration: 0.26,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  };
  element.addEventListener('pointermove', onMove);
  element.addEventListener('pointerleave', onLeave);
  return () => {
    element.removeEventListener('pointermove', onMove);
    element.removeEventListener('pointerleave', onLeave);
    activeTween?.kill();
    gsap.set(element, { rotationX: 0, rotationY: 0, y: 0, scale: 1 });
  };
}

export function pageTransition(element, options = {}) {
  if (!element || motionIsReduced()) return () => {};
  const tween = gsap.fromTo(
    element,
    { autoAlpha: 0, y: 7 },
    {
      autoAlpha: 1,
      y: 0,
      duration: options.duration ?? 0.28,
      ease: 'power2.out',
      clearProps: 'visibility'
    }
  );
  return cleanupTween(tween, element, { autoAlpha: 1, y: 0 });
}

export function parallax(element, strength = 12) {
  if (!element || motionIsReduced()) return () => {};
  const eventRoot = element.closest('[data-parallax-root]') || element.parentElement || element;
  const moveX = gsap.quickTo(element, 'x', { duration: 0.45, ease: 'power2.out' });
  const moveY = gsap.quickTo(element, 'y', { duration: 0.45, ease: 'power2.out' });
  const onMove = (event) => {
    if (event.pointerType === 'touch') return;
    const bounds = eventRoot.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    moveX(x * strength);
    moveY(y * strength);
  };
  const onLeave = () => {
    moveX(0);
    moveY(0);
  };
  eventRoot.addEventListener('pointermove', onMove);
  eventRoot.addEventListener('pointerleave', onLeave);
  return () => {
    eventRoot.removeEventListener('pointermove', onMove);
    eventRoot.removeEventListener('pointerleave', onLeave);
    gsap.set(element, { x: 0, y: 0 });
  };
}

export function floatElement(element, options = {}) {
  if (!element || motionIsReduced()) return () => {};
  const tween = gsap.to(element, {
    y: options.distance ?? -12,
    duration: options.duration ?? 4,
    delay: options.delay ?? 0,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true
  });
  return cleanupTween(tween, element, { x: 0, y: 0 });
}

export function revealTimeline(element, options = {}) {
  if (!element) return () => {};
  if (motionIsReduced()) {
    gsap.set(element, { scaleY: 1 });
    return () => {};
  }
  const createTween = () => {
    const tween = gsap.fromTo(
      element,
      { scaleY: 0, transformOrigin: 'top center' },
      {
        scaleY: 1,
        duration: options.duration ?? 0.72,
        ease: 'power2.out',
        transformOrigin: 'top center',
        scrollTrigger: getScrollTrigger(options.scrollTrigger, element)
      }
    );
    return cleanupTween(tween, element, { scaleY: 1 });
  };
  return withScrollTrigger(createTween);
}
