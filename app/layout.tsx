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
            __html: `!function(){let e="faved_affiliate",t="faved_user_id",a=new URLSearchParams(window.location.search);a.get("utm_source"),a.get("utm_medium");let r=a.get("utm_campaign"),n=a.get("utm_content"),o=a.get("from_faved");if(r&&(o||n==="andreashorn"||n==="lyhstudio"||n==="molob10"||n==="rise40"||n==="rise30"||n==="rise20"||n==="rise10"||n==="mattprzegietka"||n==="ashleengradgirlmarketing"||n==="heyjessica"||n==="kamyamarwah"||n==="liana"||n==="alexandralevchuk"||n==="charliehills"||n==="futureai"||n==="chrisdo"||n==="alexzarfati10"||n==="rosssymons"||n==="evanorte"||n==="simonmeyer"||n==="itabayuzzy"||n==="raselahmed"||n==="aisearch20"||n==="erikfadiman"||n==="olivierbrunet"||n==="mateowillis"||n==="pavlelucic"||n==="chriscunningham"||n==="devinreed"||n==="brettdashevsky"||n==="harrietmoser"||n==="uxchrisnguyen"||n==="mikeharvey"||n==="elfriedsamba"||n==="rodolfofanti"||n==="olabinjo"||n==="arfafarheen"||n==="gradgirlmarketing"||n==="tinabrown30"||n==="tinabrown"||n==="emiliemazurek"||n==="fatimakhan"||n==="twist"||n==="mridumousamneog"||n==="mrwhisper"||n==="kirkmihelakos"||n==="danieltech10"||n==="lesfrerespoulain"||n==="rise"||n==="kspmn10"||n==="sauravsinha10"||n==="aleksa"||n==="defendintelligence"||n==="airevolution10"||n==="airevolution"||n==="malvaai50"||n==="malvaai40"||n==="malvaai30"||n==="malvaai20"||n==="malvaai10"||n==="satorigraphics30"||n==="satorigraphics20"||n==="satorigraphics10"||n==="ailabs40"||n==="ailabs30"||n==="ailabs20"||n==="ailabs10"||n==="8bitbrain40"||n==="8bitbrain20"||n==="8bitbrain10"||n==="rwtbr10"||n==="rwtbr20"||n==="techunicorn1"||n==="techunicorn"||n==="aisearch10"||n==="twist2"||n==="brockmesarichaifornontechies30"||n==="brockmesarichaifornontechies"||n==="8bitbrain30"||n==="yuvalaloni"||n==="abhaypsrajawat30"||n==="romainbrunel"||n==="levelupid"||n==="enamalamin30"||n==="enamalamin"||n==="tomsjurjaks"||n==="thiagosmarttipstt"||n==="thiagosmarttipsyt"||n==="photographicinspiration"||n==="chrisbrockhurst"||n==="mattwhoismattjohnson"||n==="davidmanning"||n==="inteligenciaartificial"||n==="brockmesarichai"||n==="rubenscott"||n==="thiagosmarttips"||n==="theinfographicsshow"||n==="kingcharlestv"||n==="photojoseph"||n==="vunguyenletmeshowyou"||n==="michaeltobin"||n==="filmspeak"||n==="gazi"||n==="sauravsinha"||n==="8bitbrain"||n==="creativesuitetutorials"||n==="thedpjourney"||n==="giantfreakinrobot"||n==="sergiomotaacademy"||n==="godago30"||n==="godago"||n==="denisbarbas"||n==="robshocks"||n==="pythonarabiccommunity"||n==="joeyedits"||n==="designwitharash"||n==="csjackie"||n==="alexzarfati"||n==="herokme"||n==="naughtyyjuan"||n==="gallahat"||n==="rafaelludwig"||n==="abhaypsrajawat"||n==="mathieustern30"||n==="mathieustern"||n==="thomaslundstrm"||n==="alejavirivera"||n==="ailabs"||n==="badflashes"||n==="garyscaife"||n==="anna"||n==="lillystechtips"||n==="rwtbr"||n==="lamachinepensante"||n==="cryptomighelle"||n==="molob"||n==="malvaai"||n==="jordan30"||n==="jordan"||n==="anastasiablogger"||n==="satorigraphics"||n==="twist1"||n==="thevandalist"||n==="AIMASTER"||n==="danieltech"||n==="sidneybakergreen"||n==="aisearch"||n==="KSPMN"||n==="nunosilva"||n==="faved-test")){let i,s=((i=localStorage.getItem(t))||(i="user_"+Date.now()+"_"+Math.random().toString(36).substr(2,9),localStorage.setItem(t,i)),i),m={code:r,faved:!0,content:n,sessionId:s,timestamp:Date.now()};localStorage.setItem(e,JSON.stringify(m))}let d=localStorage.getItem(e);if(d)try{let f=JSON.parse(d);Date.now()-f.timestamp<2592e6&&(f.faved||"faved"===f.content)?fetch("https://faved.com/api/affiliate-links/track",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:"prada",code:f.code,sessionId:f.sessionId,referrer:document.referrer,userAgent:navigator.userAgent,timestamp:Date.now(),url:window.location.pathname})}).catch(e=>console.error("Faved tracking error:",e)):localStorage.removeItem(e)}catch(c){console.error("Faved error parsing affiliate data:",c)}}();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}