'use client'

import { usePathname } from 'next/navigation'
import HamburgerNav from './HamburgerNav'
import Footer from './Footer'

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/partner') || pathname.startsWith('/ops')

  return (
    <>
      {!isPortal && <HamburgerNav />}
      <main>{children}</main>
      {!isPortal && <Footer />}
    </>
  )
}
