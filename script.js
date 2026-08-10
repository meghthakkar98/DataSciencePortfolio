(() => {
  'use strict';

  const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

  const viewportPointer = (point, viewport) => ({
    x: clamp(point.clientX, 0, viewport.width),
    y: clamp(point.clientY, 0, viewport.height),
  });

  const pointerOffset = (point, rect, maximum = 12) => ({
    x: clamp(((point.clientX - rect.left) / rect.width - 0.5) * maximum * 2, -maximum, maximum),
    y: clamp(((point.clientY - rect.top) / rect.height - 0.5) * maximum * 2, -maximum, maximum),
  });

  const depthTransform = (offset, depth) => ({ x: offset.x * depth, y: offset.y * depth });

  const shouldEnablePointerMotion = (coarsePointer, reducedMotion) => !coarsePointer && !reducedMotion;

  window.PortfolioMotion = {
    clamp,
    viewportPointer,
    pointerOffset,
    depthTransform,
    shouldEnablePointerMotion,
  };

  const init = () => {
    document.documentElement.classList.add('js');

    const toggle = document.querySelector('[data-menu-toggle]');
    const menu = document.querySelector('[data-menu]');
    const menuLinks = [...document.querySelectorAll('[data-menu] a[href^="#"]')];

    const setMenuOpen = (open) => {
      if (!toggle || !menu) return;
      toggle.setAttribute('aria-expanded', String(open));
      menu.dataset.open = String(open);
    };

    toggle?.addEventListener('click', () => setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    menuLinks.forEach((link) => link.addEventListener('click', () => {
      const wasOpen = toggle?.getAttribute('aria-expanded') === 'true';
      setMenuOpen(false);
      if (wasOpen) setTimeout(() => toggle.focus(), 0);
    }));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
        setMenuOpen(false);
        toggle.focus();
      }
    });

    const root = document.documentElement;
    const hero = document.querySelector('[data-hero]');
    const surface = document.querySelector('[data-spotlight]');
    const layers = [...document.querySelectorAll('[data-parallax]')];
    let latestViewportEvent = null;
    let latestSurfaceEvent = null;
    let frame = 0;

    requestAnimationFrame(() => {
      hero?.classList.add('is-ready');
      setTimeout(() => surface?.classList.add('tags-ready'), 520);
    });

    const syncAmbientMotion = () => root.classList.toggle('motion-paused', document.hidden);
    document.addEventListener('visibilitychange', syncAmbientMotion);
    syncAmbientMotion();

    const coarsePointer = matchMedia('(pointer: coarse)').matches;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (shouldEnablePointerMotion(coarsePointer, reducedMotion)) {
      const renderPointer = () => {
        frame = 0;
        if (latestViewportEvent) {
          const pointer = viewportPointer(latestViewportEvent, { width: innerWidth, height: innerHeight });
          root.style.setProperty('--spotlight-x', `${pointer.x}px`);
          root.style.setProperty('--spotlight-y', `${pointer.y}px`);
        }
        if (surface && latestSurfaceEvent) {
          const offset = pointerOffset(latestSurfaceEvent, surface.getBoundingClientRect(), 12);
          layers.forEach((layer) => {
            const movement = depthTransform(offset, Number(layer.dataset.depth || 0.25));
            layer.style.setProperty('--parallax-x', `${movement.x}px`);
            layer.style.setProperty('--parallax-y', `${movement.y}px`);
          });
        }
      };

      const schedulePointerRender = () => {
        if (!frame) frame = requestAnimationFrame(renderPointer);
      };

      document.addEventListener('pointermove', (event) => {
        latestViewportEvent = event;
        schedulePointerRender();
      }, { passive: true });

      surface?.addEventListener('pointermove', (event) => {
        latestSurfaceEvent = event;
        schedulePointerRender();
      }, { passive: true });

      surface?.addEventListener('pointerleave', () => {
        latestSurfaceEvent = null;
        layers.forEach((layer) => {
          layer.style.setProperty('--parallax-x', '0px');
          layer.style.setProperty('--parallax-y', '0px');
        });
      });

    }

    const revealTargets = document.querySelectorAll('[data-reveal]');
    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12 });
      revealTargets.forEach((target) => revealObserver.observe(target));
    } else {
      revealTargets.forEach((target) => target.classList.add('is-visible'));
    }

    const sections = [...document.querySelectorAll('main section[id]')];
    const linkById = new Map(menuLinks.map((link) => [link.hash.slice(1), link]));
    if ('IntersectionObserver' in window) {
      const sectionObserver = new IntersectionObserver((entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        menuLinks.forEach((link) => link.classList.remove('is-active'));
        linkById.get(visible.target.id)?.classList.add('is-active');
      }, { rootMargin: '-35% 0px -55%', threshold: [0, 0.2, 0.5] });
      sections.forEach((section) => sectionObserver.observe(section));
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
