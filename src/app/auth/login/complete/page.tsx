"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LoginAuthComplete(){
    const params = useSearchParams();

    useEffect(() => {
        const connected = params.get('connected')==='true';
        const state     = params.get('state') || null;

        try{
            if (window.opener && !window.opener.closed){
                window.opener.postMessage({type: "GOOGLE_LOGIN_AUTH_COMPLETE", connected, state}, window.location.origin);
            }
        } catch (e){
            console.warn("Error in post Message", e);

        }

        setTimeout(() =>  window.close(), 300);
    }, [params]);


    return (
   // Enhanced Background: Use a subtle pattern or a very light gradient for depth.
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-500 p-4">
            {/* Enhanced Card: Added subtle hover effect, deeper shadow, and rounded corners */}
            <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-2xl text-center max-w-sm w-full transform hover:scale-[1.01] transition-all duration-500 ease-out border border-gray-100 dark:border-gray-700">
                {/* Enhanced Icon: Larger, more vibrant gradient ring, subtle animation on load.
                  Added `animate-spin-slow` (assuming you have a custom keyframe for a slow spin) or just `animate-pulse` for effect.
                */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white dark:bg-gray-900 border-4 border-transparent ring-4 ring-green-400/50 flex items-center justify-center text-green-500 text-4xl font-extrabold animate-bounce-once">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                
                {/* Refined Typography: Slightly larger heading, use a more distinct font weight. */}
                <h2 className="text-3xl font-extrabold mb-3 text-gray-900 dark:text-white">
                    Connection Successful!
                </h2>
                
                {/* Body Text: Clearer, slightly softer color for contrast. */}
                <p className="text-lg text-gray-500 dark:text-gray-400 mb-6">
                    Signed-in using your Google Account.
                </p>

                {/* Call to Action/Instruction: Add a subtle loading/progress indicator */}
                <div className="relative pt-1">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                        Closing window automatically...
                    </p>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                        {/* Use a simple moving bar animation for a sense of process */}
                        <div style={{ width: "100%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500 animate-pulse-short"></div>
                    </div>
                </div>

                {/* Optional: Add a subtle logo or brand element */}
                <div className="text-xs text-gray-400 dark:text-gray-600 mt-4">
                    Powered by YourApp
                </div>
            </div>
        </div>

  );
}