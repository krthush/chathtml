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
            __html: `!function(){let e="faved_affiliate",t="faved_user_id",a=new URLSearchParams(window.location.search);a.get("utm_source"),a.get("utm_medium");let r=a.get("utm_campaign"),n=a.get("utm_content"),o=a.get("from_faved");if(r&&(o||r==="andreashorn"||r==="lyhstudio"||r==="molob10"||r==="rise40"||r==="rise30"||r==="rise20"||r==="rise10"||r==="mattprzegietka"||r==="ashleengradgirlmarketing"||r==="heyjessica"||r==="kamyamarwah"||r==="liana"||r==="alexandralevchuk"||r==="charliehills"||r==="futureai"||r==="chrisdo"||r==="alexzarfati10"||r==="rosssymons"||r==="evanorte"||r==="simonmeyer"||r==="itabayuzzy"||r==="raselahmed"||r==="aisearch20"||r==="erikfadiman"||r==="olivierbrunet"||r==="mateowillis"||r==="pavlelucic"||r==="chriscunningham"||r==="devinreed"||r==="brettdashevsky"||r==="harrietmoser"||r==="uxchrisnguyen"||r==="mikeharvey"||r==="elfriedsamba"||r==="rodolfofanti"||r==="olabinjo"||r==="arfafarheen"||r==="gradgirlmarketing"||r==="tinabrown30"||r==="tinabrown"||r==="emiliemazurek"||r==="fatimakhan"||r==="twist"||r==="mridumousamneog"||r==="mrwhisper"||r==="kirkmihelakos"||r==="danieltech10"||r==="lesfrerespoulain"||r==="rise"||r==="kspmn10"||r==="sauravsinha10"||r==="aleksa"||r==="defendintelligence"||r==="airevolution10"||r==="airevolution"||r==="malvaai50"||r==="malvaai40"||r==="malvaai30"||r==="malvaai20"||r==="malvaai10"||r==="satorigraphics30"||r==="satorigraphics20"||r==="satorigraphics10"||r==="ailabs40"||r==="ailabs30"||r==="ailabs20"||r==="ailabs10"||r==="8bitbrain40"||r==="8bitbrain20"||r==="8bitbrain10"||r==="rwtbr10"||r==="rwtbr20"||r==="techunicorn1"||r==="techunicorn"||r==="aisearch10"||r==="twist2"||r==="brockmesarichaifornontechies30"||r==="brockmesarichaifornontechies"||r==="8bitbrain30"||r==="yuvalaloni"||r==="abhaypsrajawat30"||r==="romainbrunel"||r==="levelupid"||r==="enamalamin30"||r==="enamalamin"||r==="tomsjurjaks"||r==="thiagosmarttipstt"||r==="thiagosmarttipsyt"||r==="photographicinspiration"||r==="chrisbrockhurst"||r==="mattwhoismattjohnson"||r==="davidmanning"||r==="inteligenciaartificial"||r==="brockmesarichai"||r==="rubenscott"||r==="thiagosmarttips"||r==="theinfographicsshow"||r==="kingcharlestv"||r==="photojoseph"||r==="vunguyenletmeshowyou"||r==="michaeltobin"||r==="filmspeak"||r==="gazi"||r==="sauravsinha"||r==="8bitbrain"||r==="creativesuitetutorials"||r==="thedpjourney"||r==="giantfreakinrobot"||r==="sergiomotaacademy"||r==="godago30"||r==="godago"||r==="denisbarbas"||r==="robshocks"||r==="pythonarabiccommunity"||r==="joeyedits"||r==="designwitharash"||r==="csjackie"||r==="alexzarfati"||r==="herokme"||r==="naughtyyjuan"||r==="gallahat"||r==="rafaelludwig"||r==="abhaypsrajawat"||r==="mathieustern30"||r==="mathieustern"||r==="thomaslundstrm"||r==="alejavirivera"||r==="ailabs"||r==="badflashes"||r==="garyscaife"||r==="anna"||r==="lillystechtips"||r==="rwtbr"||r==="lamachinepensante"||r==="cryptomighelle"||r==="molob"||r==="malvaai"||r==="jordan30"||r==="jordan"||r==="anastasiablogger"||r==="satorigraphics"||r==="twist1"||r==="thevandalist"||r==="AIMASTER"||r==="danieltech"||r==="sidneybakergreen"||r==="aisearch"||r==="KSPMN"||r==="nunosilva"||r==="faved-test")){let i,s=((i=localStorage.getItem(t))||(i="user_"+Date.now()+"_"+Math.random().toString(36).substr(2,9),localStorage.setItem(t,i)),i),m={code:r,faved:!0,content:n,sessionId:s,timestamp:Date.now()};localStorage.setItem(e,JSON.stringify(m))}let d=localStorage.getItem(e);if(d)try{let f=JSON.parse(d);Date.now()-f.timestamp<2592e6&&(f.faved||"faved"===f.content)?fetch("https://faved.com/api/affiliate-links/track",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:"prada",code:f.code,sessionId:f.sessionId,referrer:document.referrer,userAgent:navigator.userAgent,timestamp:Date.now(),url:window.location.pathname})}).catch(e=>console.error("Faved tracking error:",e)):localStorage.removeItem(e)}catch(c){console.error("Faved error parsing affiliate data:",c)}}();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}