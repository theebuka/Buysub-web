"use client"

import { usePathname } from "next/navigation"
import Navbar from "./Navbar"
import Footer from "./Footer"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith("/admin")

  return (
    <>
      {!isAdmin && <Navbar />}

      <div
        style={
          isAdmin
            ? {
                minHeight: 'calc(100vh - 120px)',
                background: 'var(--bs-bg-base)'
              }
            : {
                minHeight: 'calc(100vh - 120px)',
                padding: '48px 24px',
                margin: '0 auto'
              }
        }
      >
        {children}
      </div>

      {!isAdmin && <Footer />}
    </>
  )
}