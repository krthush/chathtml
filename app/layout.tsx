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
  description:
    "An intuitive AI-powered HTML editor designed for non-technical users to build beautiful landing pages, newsletters, and email templates.",
  icons: {
    icon: "/favicon.ico",
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
        {/* Faved Affiliate Tracking Script */}
        <Script
          id="faved-tracking"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(){let e="faved_affiliate",t="faved_user_id",r=new URLSearchParams(window.location.search);r.get("utm_source"),r.get("utm_medium");let a=r.get("utm_campaign"),n=r.get("utm_content"),o=r.get("from_faved");if(a&&o){let i,s=((i=localStorage.getItem(t))||(i="user_"+Date.now()+"_"+Math.random().toString(36).substr(2,9),localStorage.setItem(t,i)),i),m={code:a,faved:!0,content:n,sessionId:s,timestamp:Date.now()};localStorage.setItem(e,JSON.stringify(m))}let d=localStorage.getItem(e);if(d)try{let f=JSON.parse(d);Date.now()-f.timestamp<31536e6&&(f.faved||"faved"===f.content)?fetch("https://faved.com/api/affiliate-links/track",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:"prada",code:f.code,sessionId:f.sessionId,referrer:document.referrer,userAgent:navigator.userAgent,timestamp:Date.now(),url:window.location.pathname})}).catch(e=>console.error("Faved tracking error:",e)):localStorage.removeItem(e)}catch(c){console.error("Faved error parsing affiliate data:",c)}}();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
