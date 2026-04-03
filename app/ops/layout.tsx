import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ops Dashboard — The Stuff Buyers',
}

const BASE_STYLES = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #0F0F0F; font-family: 'Barlow Condensed', sans-serif; color: #e8e8e8; min-height: 100vh; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0a0a0a; } ::-webkit-scrollbar-thumb { background: #333; }
  select, input, textarea { color-scheme: dark; }
  .header { position: sticky; top: 0; z-index: 100; background: #111; border-bottom: 2px solid #C9A84C; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
`

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: BASE_STYLES }} />
      {children}
    </>
  )
}
