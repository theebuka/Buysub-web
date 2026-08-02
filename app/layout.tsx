import { CSS_VARS } from '@/lib/constants';
import AppShell from '../components/AppShell'
import { Toaster } from 'sonner';

export const metadata = {
  title: 'BuySub — Digital Subscription Marketplace',
  description: 'Explore and purchase digital subscriptions and plans at the best prices.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {

  return (
    <html lang="en">
      <head>
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
