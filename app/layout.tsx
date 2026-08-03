import { CSS_VARS } from '@/lib/constants';
import AppShell from '../components/AppShell'
import { Toaster } from 'sonner';

export const metadata = {
  title: 'BuySub — Digital Subscription Marketplace',
  description: 'Explore and purchase digital subscriptions and plans at the best prices.',
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
          render. The attribute is only ever set, never cleared, so an absent
          key, a garbage value, a throw, or a /shop pathname all fall through
          to :root, which is dark. System preference is deliberately ignored.

          /shop is excluded because components/Marketplace.tsx is dark-only by
          construction and off-limits for edits. See lib/theme.ts and
          REFACTOR.md before changing this.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{" +
              "var p=location.pathname;" +
              "if(p==='/shop'||p.indexOf('/shop/')===0)return;" +
              "if(localStorage.getItem('bs_admin_theme')==='light')" +
              "document.documentElement.setAttribute('data-theme','light');" +
              "}catch(e){}})();",
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: `
          ${CSS_VARS}
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: var(--bs-bg-base);
            color: var(--bs-text-primary);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          a { color: inherit; text-decoration: none; }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
          @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
          @keyframes fadeIn { from{opacity:0} to{opacity:1} }
          .hide-scrollbar::-webkit-scrollbar { display:none }
          .hide-scrollbar { -ms-overflow-style:none; scrollbar-width:none }
          @keyframes scroll {
            from { transform: translateX(100%) }
            to { transform: translateX(-100%) }
          }
        `}} />
      </head>
      <body>
        <AppShell>
          {children}
        </AppShell>

        <Toaster richColors position="top-right" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
              (function(){
                var s1=document.createElement("script"),
                s0=document.getElementsByTagName("script")[0];
                s1.async=true;
                s1.src='https://embed.tawk.to/69fef29b952ab91c389cfc77/1jo5u7clb';
                s1.charset='UTF-8';
                s1.setAttribute('crossorigin','*');
                s0.parentNode.insertBefore(s1,s0);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
