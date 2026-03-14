'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Get a Quote', href: '/#intake-form' },
  { label: 'About', href: '/about' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
];

export default function HamburgerNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function handleQuoteClick(e: React.MouseEvent) {
    e.preventDefault();
    setOpen(false);
    if (pathname === '/') {
      document.getElementById('intake-form')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push('/#intake-form');
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeInNav {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .nav-overlay { animation: fadeInNav 200ms ease both; }
      `}</style>

      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="fixed top-5 right-6 z-50 flex flex-col gap-[5px] cursor-pointer"
      >
        <span className="block w-6 h-0.5 bg-brand-gold" />
        <span className="block w-6 h-0.5 bg-brand-gold" />
        <span className="block w-6 h-0.5 bg-brand-gold" />
      </button>

      {/* Full-screen overlay */}
      {open && (
        <div
          className="nav-overlay fixed inset-0 z-50 bg-brand-bg"
          onClick={() => setOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="absolute top-5 right-6 text-brand-gold text-2xl leading-none cursor-pointer"
          >
            &#x2715;
          </button>

          {/* Nav links */}
          <nav
            className="flex flex-col gap-8 px-6 pt-24"
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_LINKS.map(({ label, href }) =>
              href === '/#intake-form' ? (
                <button
                  key={href}
                  onClick={handleQuoteClick}
                  className="text-left text-brand-gray text-3xl font-bold hover:text-brand-gold transition-colors"
                >
                  {label}
                </button>
              ) : (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="text-brand-gray text-3xl font-bold hover:text-brand-gold transition-colors"
                >
                  {label}
                </Link>
              )
            )}
          </nav>
        </div>
      )}
    </>
  );
}
