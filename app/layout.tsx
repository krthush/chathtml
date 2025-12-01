import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "chathtml - AI-Powered HTML Editor",
  description: "An intuitive AI-powered HTML editor designed for non-technical users to build beautiful landing pages, newsletters, and email templates.",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          id="faved-tracking"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){const k='faved_affiliate',uk='faved_user_id',d=2592000000;function getSid(){let s=localStorage.getItem(uk);if(!s){s='user_'+Date.now()+'_'+Math.random().toString(36).substr(2,9);localStorage.setItem(uk,s);}return s;}const u=new URLSearchParams(window.location.search),c=u.get('utm_campaign');if(c){const sid=getSid();localStorage.setItem(k,JSON.stringify({code:c,sessionId:sid,timestamp:Date.now()}));}const a=localStorage.getItem(k);if(a){try{const p=JSON.parse(a);if(Date.now()-p.timestamp<d){fetch('https://faved.com/api/affiliate-links/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:'prada',code:p.code,sessionId:p.sessionId,referrer:document.referrer,userAgent:navigator.userAgent,timestamp:Date.now(),url:window.location.pathname})}).catch(e=>console.error('Faved tracking error:',e));}else{localStorage.removeItem(k);}}catch(e){console.error('Faved error parsing affiliate data:',e);}}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}