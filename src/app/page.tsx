"use client";

import React, { useState, useEffect, useRef } from 'react';
import { User, UserSession } from '@/components/types';
import { useRouter } from 'next/navigation';
import { BACKGROUND_IMAGE } from '@/components/constants';
import { ArrowRight } from 'lucide-react';
import { Url } from 'next/dist/shared/lib/router/router';

declare global {
  interface Window {
    google: any;
  }
}

type SessionResponse = 
| {
  restored:Boolean,
  user    : User,
}
| {
   restored: Boolean,
   url: string,
   state   : string,
}


export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
 
  const router = useRouter();

  const handleGoogleLogin = async() => {
    setLoading(true);
    console.log('inside handle google login function');

    const r = await fetch('/api/auth/login/url',{
      method: "GET",
      credentials: "include"
    });

    if(!r.ok){
      setLoading(false);
      return;
    }

    const sessionData:SessionResponse = await r.json();
    console.log("here is the session data", sessionData);

    if (sessionData.restored && 'user' in sessionData){
      console.log('the user has a session and its getting restored');
      setUser(sessionData.user);
      setMounted(true);
      setLoading(false);
      return;
    } else if ('url' in sessionData) {
      console.log('here is the pop-up flow');
      const width = 600,  height= 650;
      const left  = window.screenX + (window.innerWidth - width) / 2;
      const top   = window.screenY + (window.innerHeight - height) / 2;
      
      const popup = window.open(sessionData.url, "google_auth", `width=${width},height=${height},left=${left},top=${top}`);

      if (!popup){
        console.error("Popup is blocked")
        return;
      }

      return new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          window.removeEventListener('message', handler);
          reject(new Error("Auth timed out"));
        }, 2*60*1000);
        
        const handler = async(ev:MessageEvent) => {
          if (ev.origin !== window.location.origin) return;
          const data = ev.data;

          if (data?.type === "GOOGLE_LOGIN_AUTH_COMPLETE"){
            window.clearTimeout(timeout);
            window.removeEventListener('message', handler);

            console.log('user connected status', data.connected);

            if (data.connected){
              console.log('handler user connected');
              resolve();
              
              // retrieving the user data from the cookie
              const r = await fetch("/api/session/getUser", {
                method: "GET",
                credentials: "include",
              });
              
              if (!r.ok){
                console.error("Error retrieving user data from cookie");
                reject(new Error("Unable to retrieve User data"));
                return;
              }

              const data = await r.json();
              const userData: User = data.user;
              setUser(userData);

            } else{
              reject(new Error("User not connected"));
            }

          }

        }

        window.addEventListener('message', handler)
      });

    }

  };


  useEffect(() => {
    if (user) {
      // navigate after render
      router.push("/dashboard");
    }
  }, [user, router]);

  // Decide which handler to use: If ID is present, try real login. If not, use mock.
  const loginHandler = handleGoogleLogin

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#061418] text-[#E8E4D9] font-serif selection:bg-[#C9A66B] selection:text-[#061418]">
      
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        {/* Heavy Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#061418]/60 via-[#061418]/40 to-[#061418]/90 z-10" />
        <div className="absolute inset-0 bg-black/30 z-10" />
        
        {/* Grain/Texture Overlay */}
        <div className="absolute inset-0 z-20 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

        <img 
          src={BACKGROUND_IMAGE}
          alt="Atmospheric Background" 
          className="w-full h-full object-cover opacity-90 scale-105"
        />
      </div>

      {/* Main Content Layer */}
      <div className="relative z-30 h-full w-full max-w-[1600px] mx-auto p-6 md:p-12 flex flex-col justify-between">
        
        {/* Header Section */}
        <header className="flex justify-between items-start animate-fade-in">
          {/* Logo Group */}
          <div className="group cursor-pointer">
            <div className="w-12 h-12 bg-[#E8E4D9]/10 backdrop-blur-md border border-[#E8E4D9]/20 flex items-center justify-center text-2xl italic font-bold rounded-lg mb-2 text-[#E8E4D9] transition-all group-hover:bg-[#E8E4D9] group-hover:text-[#061418]">
              d
            </div>
            <div className="leading-tight">
              <h1 className="text-2xl font-serif tracking-tight">Demo</h1>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-60 pl-4">Wise</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col items-end gap-3 font-mono text-sm tracking-wide">
            <button 
              onClick={loginHandler}
              className="px-5 py-2 bg-[#1A3E44]/60 hover:bg-[#E8E4D9] hover:text-[#061418] backdrop-blur-md border border-[#E8E4D9]/10 rounded transition-all duration-300 mb-2"
            >
              sign in
            </button>
          </nav>
        </header>

        {/* Center Hero Section */}
        <main className="flex flex-col items-center text-center gap-10 md:gap-14 animate-fade-in">
          <h2 className="text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight text-[#E8E4D9] drop-shadow-2xl max-w-5xl mx-auto">
            Orchestrate compute <br />
            <span className="italic text-[#C9A66B]">from your calendar</span>
          </h2>
          
          <div className="bg-[#061418]/60 backdrop-blur-xl border border-[#E8E4D9]/10 p-8 md:p-10 rounded-2xl max-w-2xl mx-auto shadow-2xl transform transition-transform hover:scale-[1.01]">
            <p className="font-mono text-xs md:text-sm text-[#E8E4D9]/90 leading-relaxed uppercase tracking-wider">
              Automated resource scaling triggered by Workstream Signals.
              <br className="hidden md:block" />
              Start Compute deployments 15 min before your Demo.
            </p>
          </div>
        </main>

        {/* Footer Action */}
        <div className="flex justify-center pb-8 animate-fade-in min-h-[80px]">
          <button 
            onClick={loginHandler}
            disabled={loading}
            className="group relative bg-[#E8E4D9] text-[#061418] font-mono text-lg px-8 py-4 rounded-sm hover:bg-white transition-all duration-300 flex items-center gap-4 shadow-[0_0_40px_rgba(232,228,217,0.1)] hover:shadow-[0_0_60px_rgba(232,228,217,0.3)] hover:-translate-y-1"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                {/* Custom Google G Icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="tracking-wide">Sign in with Google</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}