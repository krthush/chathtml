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
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(){let e="faved_affiliate",t="faved_user_id",r=new URLSearchParams(window.location.search);r.get("utm_source"),r.get("utm_medium");let a=r.get("utm_campaign"),n=r.get("utm_content"),o=r.get("from_faved");if(a&&(o||a==="andreashorn"||a==="lyhstudio"||a==="molob10"||a==="rise40"||a==="rise30"||a==="rise20"||a==="rise10"||a==="mattprzegietka"||a==="ashleengradgirlmarketing"||a==="heyjessica"||a==="kamyamarwah"||a==="liana"||a==="alexandralevchuk"||a==="charliehills"||a==="futureai"||a==="chrisdo"||a==="alexzarfati10"||a==="rosssymons"||a==="evanorte"||a==="simonmeyer"||a==="itabayuzzy"||a==="raselahmed"||a==="aisearch20"||a==="erikfadiman"||a==="olivierbrunet"||a==="mateowillis"||a==="pavlelucic"||a==="chriscunningham"||a==="devinreed"||a==="brettdashevsky"||a==="harrietmoser"||a==="uxchrisnguyen"||a==="mikeharvey"||a==="elfriedsamba"||a==="rodolfofanti"||a==="olabinjo"||a==="arfafarheen"||a==="gradgirlmarketing"||a==="tinabrown30"||a==="tinabrown"||a==="emiliemazurek"||a==="fatimakhan"||a==="twist"||a==="mridumousamneog"||a==="mrwhisper"||a==="kirkmihelakos"||a==="danieltech10"||a==="lesfrerespoulain"||a==="rise"||a==="kspmn10"||a==="sauravsinha10"||a==="aleksa"||a==="defendintelligence"||a==="airevolution10"||a==="airevolution"||a==="malvaai50"||a==="malvaai40"||a==="malvaai30"||a==="malvaai20"||a==="malvaai10"||a==="satorigraphics30"||a==="satorigraphics20"||a==="satorigraphics10"||a==="ailabs40"||a==="ailabs30"||a==="ailabs20"||a==="ailabs10"||a==="8bitbrain40"||a==="8bitbrain20"||a==="8bitbrain10"||a==="rwtbr10"||a==="rwtbr20"||a==="techunicorn1"||a==="techunicorn"||a==="aisearch10"||a==="twist2"||a==="brockmesarichaifornontechies30"||a==="brockmesarichaifornontechies"||a==="8bitbrain30"||a==="yuvalaloni"||a==="abhaypsrajawat30"||a==="romainbrunel"||a==="levelupid"||a==="enamalamin30"||a==="enamalamin"||a==="tomsjurjaks"||a==="thiagosmarttipstt"||a==="thiagosmarttipsyt"||a==="photographicinspiration"||a==="chrisbrockhurst"||a==="mattwhoismattjohnson"||a==="davidmanning"||a==="inteligenciaartificial"||a==="brockmesarichai"||a==="rubenscott"||a==="thiagosmarttips"||a==="theinfographicsshow"||a==="kingcharlestv"||a==="photojoseph"||a==="vunguyenletmeshowyou"||a==="michaeltobin"||a==="filmspeak"||a==="gazi"||a==="sauravsinha"||a==="8bitbrain"||a==="creativesuitetutorials"||a==="thedpjourney"||a==="giantfreakinrobot"||a==="sergiomotaacademy"||a==="godago30"||a==="godago"||a==="denisbarbas"||a==="robshocks"||a==="pythonarabiccommunity"||a==="joeyedits"||a==="designwitharash"||a==="csjackie"||a==="alexzarfati"||a==="herokme"||a==="naughtyyjuan"||a==="gallahat"||a==="rafaelludwig"||a==="abhaypsrajawat"||a==="mathieustern30"||a==="mathieustern"||a==="thomaslundstrm"||a==="alejavirivera"||a==="ailabs"||a==="badflashes"||a==="garyscaife"||a==="anna"||a==="lillystechtips"||a==="rwtbr"||a==="lamachinepensante"||a==="cryptomighelle"||a==="molob"||a==="malvaai"||a==="jordan30"||a==="jordan"||a==="anastasiablogger"||a==="satorigraphics"||a==="twist1"||a==="thevandalist"||a==="AIMASTER"||a==="danieltech"||a==="sidneybakergreen"||a==="aisearch"||a==="KSPMN"||a==="nunosilva"||a==="faved-test")){let i,s=((i=localStorage.getItem(t))||(i="user_"+Date.now()+"_"+Math.random().toString(36).substr(2,9),localStorage.setItem(t,i)),i),m={code:a,faved:!0,content:n,sessionId:s,timestamp:Date.now()};localStorage.setItem(e,JSON.stringify(m))}let d=localStorage.getItem(e);if(d)try{let f=JSON.parse(d);Date.now()-f.timestamp<31536e6&&(f.faved||"faved"===f.content)?fetch("https://faved.com/api/affiliate-links/track",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:"luma-ai",code:f.code,sessionId:f.sessionId,referrer:document.referrer,userAgent:navigator.userAgent,timestamp:Date.now(),url:window.location.pathname})}).catch(e=>console.error("Faved tracking error:",e)):localStorage.removeItem(e)}catch(c){console.error("Faved error parsing affiliate data:",c)}}();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}