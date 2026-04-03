/**
 * Portal layout — standalone, no site nav/footer.
 * Wraps /partner/* and /ops/* routes.
 */

const BASE_STYLES = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #0F0F0F; font-family: 'Barlow Condensed', sans-serif; color: #e8e8e8; min-height: 100vh; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0a0a0a; }
  ::-webkit-scrollbar-thumb { background: #333; }
  select, input, textarea { color-scheme: dark; }
`

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: BASE_STYLES }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
