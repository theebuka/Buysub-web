import { CSS_VARS } from '@/lib/constants';

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
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
