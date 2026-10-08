import './globals.css';
import { CSS_VARS } from '@/lib/constants';
import AppShell from '../components/AppShell'
import ThemedToaster from '../components/ThemedToaster'
import TawkWidget from '../components/TawkWidget'

export const metadata = {
  title: 'BuySub — Digital Subscription Marketplace',
  description: 'Explore and purchase digital subscriptions and plans at the best prices.',
  // A static file, not app/icon.svg: next-on-pages treats app/icon.* as a
  // route that must be edge, and fails the Pages build.
  icons: { icon: { url: '/brand/logomark-on-brand.svg', type: 'image/svg+xml' } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Stops mobile browsers running data detectors over prices, order refs
          and dates and wrapping them in their own <a>, which then paints them
          the UA link colour. Prevention only — it changes no styling.
        */}
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
        {/*
          Sets data-theme before first paint so light-mode users do not see a
          dark flash. Everything is inside try/catch: localStorage throws in
          Safari private mode, and an uncaught throw in a head script blocks
          render. Light unless the visitor chose dark (stored 'dark'), including
          when storage is blocked. System preference is deliberately ignored. Every route is
          themeable since the storefront rebuild; see isThemeableRoute in
          lib/theme.ts.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{" +
                            "if(localStorage.getItem('bs_admin_theme')!=='dark')" +
              "document.documentElement.setAttribute('data-theme','light');" +
              "}catch(e){document.documentElement.setAttribute('data-theme','light');}})();",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,400..700;1,400..700&display=swap"
          rel="stylesheet"
        />
        {/* Tokens only. The reset, keyframes and utilities are in globals.css. */}
        <style dangerouslySetInnerHTML={{ __html: CSS_VARS }} />
      </head>
      <body>
        <AppShell>
          {children}
        </AppShell>

        <ThemedToaster />
        {/*
          Was an inline script here, which loaded the chat widget on every route
          including the whole back office. This file is a server component and
          cannot read the pathname, so the route gate lives in the client
          component — the same reason ThemedToaster exists.
        */}
        <TawkWidget />
      </body>
    </html>
  );
}
