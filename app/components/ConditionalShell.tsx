'use client'
import { usePathname } from 'next/navigation'

export function ConditionalShell({ nav, footer, children }: {
  nav: React.ReactNode,
  footer: React.ReactNode,
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isPortal = pathname?.startsWith('/partner') || pathname?.startsWith('/ops')
  return (
    <>
      {!isPortal && nav}
      {children}
      {!isPortal && footer}
    </>
  )
}
