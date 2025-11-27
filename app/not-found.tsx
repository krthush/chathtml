import Link from 'next/link';
import Script from 'next/script';

export default function NotFound() {
  return (
    <>
      {/* Inline script that runs before page render */}
      <Script strategy="beforeInteractive">{`(async function(){const p=window.location.pathname.split('/').filter(p=>p)[0];if(!p)return;try{const r=await fetch('https://faved.com/api/affiliate-links/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:'prada',code:p,referrer:document.referrer,userAgent:navigator.userAgent})});const d=await r.json();if(d.success&&d.url){navigator.sendBeacon&&navigator.sendBeacon('https://faved.com/api/affiliate-links/track',JSON.stringify({slug:'prada',code:p}));window.location.replace(d.url);}}catch(e){console.error('Faved:',e);}})();`}</Script>
      
      <div className="flex h-screen w-full flex-col items-center justify-center bg-linear-to-br from-blue-50 to-cyan-50 px-4">
      <div className="text-center max-w-md">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-blue-600 mb-2">404</h1>
          <div className="h-1 w-24 bg-blue-600 mx-auto rounded-full"></div>
        </div>

        {/* Error Message */}
        <h2 className="text-3xl font-bold text-slate-800 mb-4">
          Page Not Found
        </h2>
        <p className="text-lg text-slate-600 mb-8">
          Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Back to Home
          </Link>
          <button
            className="px-6 py-3 bg-white text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-md border border-slate-200"
          >
            Go Back
          </button>
        </div>

        {/* Decorative Element */}
        <div className="mt-12 flex justify-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
      </div>
    </>
  );
}

