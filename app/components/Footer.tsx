import Link from 'next/link';
import FooterEmail from './FooterEmail';

export default function Footer() {
  return (
    <footer className="border-t border-brand-gold px-6 md:px-12 lg:px-24 py-10">
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-0 mb-4">
        <Link href="/privacy" className="text-brand-gold text-sm hover:underline md:pr-4">
          Privacy Policy
        </Link>
        <span className="hidden md:inline text-brand-gray text-sm pr-4">|</span>
        <Link href="/terms" className="text-brand-gold text-sm hover:underline md:pr-4">
          Terms of Service
        </Link>
        <span className="hidden md:inline text-brand-gray text-sm pr-4">|</span>
        <span className="text-brand-gold text-sm md:pr-4">
          <FooterEmail />
        </span>
        <span className="hidden md:inline text-brand-gray text-sm pr-4">|</span>
        <span className="text-brand-gray text-sm">(314) 358-5293</span>
      </div>
      <p className="text-brand-gray text-sm mb-1">448 Cobblestone Way, Mt Juliet, TN 37122</p>
      <p className="text-brand-gray text-sm">&copy; 2026 The Stuff Buyers LLC. All rights reserved.</p>
    </footer>
  );
}
