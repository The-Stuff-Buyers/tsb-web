'use client';
import { useEffect } from 'react';

export function ScrollFade() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-fade]');
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1 }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
