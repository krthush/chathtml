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
            __html: `!function(){let e="faved_affiliate",t="faved_user_id",a=new URLSearchParams(window.location.search);a.get("utm_source"),a.get("utm_medium");let r=a.get("utm_campaign"),n=a.get("utm_content"),o=a.get("from_faved");if(r&&o){let i,s=((i=localStorage.getItem(t))||(i="user_"+Date.now()+"_"+Math.random().toString(36).substr(2,9),localStorage.setItem(t,i)),i),m={code:r,faved:!0,content:n,sessionId:s,timestamp:Date.now()};localStorage.setItem(e,JSON.stringify(m))}let d=localStorage.getItem(e);if(d)try{let f=JSON.parse(d);Date.now()-f.timestamp<2592e6&&(f.faved||"faved"===f.content||f.code==="andreashorn"||f.code==="lyhstudio"||f.code==="molob10"||f.code==="rise40"||f.code==="rise30"||f.code==="rise20"||f.code==="rise10"||f.code==="mattprzegietka"||f.code==="ashleengradgirlmarketing"||f.code==="heyjessica"||f.code==="kamyamarwah"||f.code==="liana"||f.code==="alexandralevchuk"||f.code==="charliehills"||f.code==="futureai"||f.code==="chrisdo"||f.code==="alexzarfati10"||f.code==="rosssymons"||f.code==="evanorte"||f.code==="simonmeyer"||f.code==="itabayuzzy"||f.code==="raselahmed"||f.code==="aisearch20"||f.code==="erikfadiman"||f.code==="olivierbrunet"||f.code==="mateowillis"||f.code==="pavlelucic"||f.code==="chriscunningham"||f.code==="devinreed"||f.code==="brettdashevsky"||f.code==="harrietmoser"||f.code==="uxchrisnguyen"||f.code==="mikeharvey"||f.code==="elfriedsamba"||f.code==="rodolfofanti"||f.code==="olabinjo"||f.code==="arfafarheen"||f.code==="gradgirlmarketing"||f.code==="tinabrown30"||f.code==="tinabrown"||f.code==="emiliemazurek"||f.code==="fatimakhan"||f.code==="twist"||f.code==="mridumousamneog"||f.code==="mrwhisper"||f.code==="kirkmihelakos"||f.code==="danieltech10"||f.code==="lesfrerespoulain"||f.code==="rise"||f.code==="kspmn10"||f.code==="sauravsinha10"||f.code==="aleksa"||f.code==="defendintelligence"||f.code==="airevolution10"||f.code==="airevolution"||f.code==="malvaai50"||f.code==="malvaai40"||f.code==="malvaai30"||f.code==="malvaai20"||f.code==="malvaai10"||f.code==="satorigraphics30"||f.code==="satorigraphics20"||f.code==="satorigraphics10"||f.code==="ailabs40"||f.code==="ailabs30"||f.code==="ailabs20"||f.code==="ailabs10"||f.code==="8bitbrain40"||f.code==="8bitbrain20"||f.code==="8bitbrain10"||f.code==="rwtbr10"||f.code==="rwtbr20"||f.code==="techunicorn1"||f.code==="techunicorn"||f.code==="aisearch10"||f.code==="twist2"||f.code==="brockmesarichaifornontechies30"||f.code==="brockmesarichaifornontechies"||f.code==="8bitbrain30"||f.code==="yuvalaloni"||f.code==="abhaypsrajawat30"||f.code==="romainbrunel"||f.code==="levelupid"||f.code==="enamalamin30"||f.code==="enamalamin"||f.code==="tomsjurjaks"||f.code==="thiagosmarttipstt"||f.code==="thiagosmarttipsyt"||f.code==="photographicinspiration"||f.code==="chrisbrockhurst"||f.code==="mattwhoismattjohnson"||f.code==="davidmanning"||f.code==="inteligenciaartificial"||f.code==="brockmesarichai"||f.code==="rubenscott"||f.code==="thiagosmarttips"||f.code==="theinfographicsshow"||f.code==="kingcharlestv"||f.code==="photojoseph"||f.code==="vunguyenletmeshowyou"||f.code==="michaeltobin"||f.code==="filmspeak"||f.code==="gazi"||f.code==="sauravsinha"||f.code==="8bitbrain"||f.code==="creativesuitetutorials"||f.code==="thedpjourney"||f.code==="giantfreakinrobot"||f.code==="sergiomotaacademy"||f.code==="godago30"||f.code==="godago"||f.code==="denisbarbas"||f.code==="robshocks"||f.code==="pythonarabiccommunity"||f.code==="joeyedits"||f.code==="designwitharash"||f.code==="csjackie"||f.code==="alexzarfati"||f.code==="herokme"||f.code==="naughtyyjuan"||f.code==="gallahat"||f.code==="rafaelludwig"||f.code==="abhaypsrajawat"||f.code==="mathieustern30"||f.code==="mathieustern"||f.code==="thomaslundstrm"||f.code==="alejavirivera"||f.code==="ailabs"||f.code==="badflashes"||f.code==="garyscaife"||f.code==="anna"||f.code==="lillystechtips"||f.code==="rwtbr"||f.code==="lamachinepensante"||f.code==="cryptomighelle"||f.code==="molob"||f.code==="malvaai"||f.code==="jordan30"||f.code==="jordan"||f.code==="anastasiablogger"||f.code==="satorigraphics"||f.code==="twist1"||f.code==="thevandalist"||f.code==="AIMASTER"||f.code==="danieltech"||f.code==="sidneybakergreen"||f.code==="aisearch"||f.code==="KSPMN"||f.code==="nunosilva"||f.code==="faved-test")?fetch("https://faved.com/api/affiliate-links/track",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:"prada",code:f.code,sessionId:f.sessionId,referrer:document.referrer,userAgent:navigator.userAgent,timestamp:Date.now(),url:window.location.pathname})}).catch(e=>console.error("Faved tracking error:",e)):localStorage.removeItem(e)}catch(c){console.error("Faved error parsing affiliate data:",c)}}();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}