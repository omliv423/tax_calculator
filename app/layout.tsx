import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "年収手取りシミュレーター",
  description: "年収から手取りを簡単に計算",
  manifest: "/manifest.json",
  themeColor: "#f9fafb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "手取り計算",
  },
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      style={{ height: '100%' }}
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function shouldRedirect() {
                  if (window.location.pathname === '/') return false;
                  var t = Number(sessionStorage.getItem('nav_time') || 0);
                  return Date.now() - t > 3000;
                }
                if (shouldRedirect()) {
                  document.documentElement.style.visibility = 'hidden';
                  window.location.replace('/');
                }
                window.addEventListener('pageshow', function(e) {
                  if (e.persisted && shouldRedirect()) {
                    document.documentElement.style.visibility = 'hidden';
                    window.location.replace('/');
                  }
                });
                document.addEventListener('visibilitychange', function() {
                  if (document.visibilityState === 'visible' && shouldRedirect()) {
                    document.documentElement.style.visibility = 'hidden';
                    window.location.replace('/');
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className="h-full overflow-hidden" style={{ backgroundColor: '#f9fafb' }}>
        {children}
      </body>
    </html>
  );
}
