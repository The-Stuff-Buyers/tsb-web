'use client';

export default function FooterEmail() {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        window.location.href = 'mailto:' + 'blake' + '@' + 'thestuffbuyers.com';
      }}
      className="hover:text-brand-gold transition-colors"
    >
      blake@thestuffbuyers.com
    </a>
  );
}
