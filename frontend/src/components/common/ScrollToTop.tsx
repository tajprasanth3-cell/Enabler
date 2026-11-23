import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop: React.FC = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // Instant scroll to the absolute top of the page on route/path/query change
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  }, [pathname, search, hash]);

  // When clicking any tab, filter switch, or navigation item, scroll to top
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const clickable = target.closest('a, button, [role="tab"], [data-tab], [data-tab-strip] button');
      if (clickable) {
        // If clicking a tab, button, or link, ensure top of viewport is visible
        const isTabOrNav =
          clickable.getAttribute('role') === 'tab' ||
          clickable.hasAttribute('data-tab') ||
          clickable.closest('[data-tab-strip]') !== null ||
          clickable.closest('nav') !== null ||
          clickable.classList.contains('tab-item');

        if (isTabOrNav) {
          window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          document.body.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          const mainEl = document.querySelector('main');
          if (mainEl) {
            mainEl.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          }
        }
      }
    };

    window.addEventListener('click', handleGlobalClick, { capture: true });

    // When any modal or drawer appears in the DOM, ensure it opens scrolled to the top
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            const modal = node.classList?.contains('modal-panel')
              ? node
              : node.querySelector?.('.modal-panel');
            if (modal) {
              modal.scrollTop = 0;
            }
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('click', handleGlobalClick, { capture: true });
      observer.disconnect();
    };
  }, []);

  return null;
};

export default ScrollToTop;
