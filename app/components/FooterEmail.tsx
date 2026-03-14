'use client';

export default function FooterEmail() {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        window.location.href = 'mailto:' + 'quotes' + '@' + 'thestuffbuyers.com';
      }}
      className="hover:text-brand-gold transition-colors"
    >
      quotes@thestuffbuyers.com
    </a>
  );
}
