export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />
      <div style={{ background: '#0F0F0F', minHeight: '100vh', fontFamily: "'Barlow Condensed', sans-serif", color: '#e8e8e8' }}>
        {children}
      </div>
    </>
  )
}
