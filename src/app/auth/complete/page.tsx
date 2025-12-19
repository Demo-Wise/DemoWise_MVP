"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// 1. Isolate the logic that needs search params into its own component
function AuthCompleteContent() {
    const params = useSearchParams();

    useEffect(() => {
        const connected = params.get('connected') === "true";
        const state     = params.get('state') || null;

        try {
            if(window.opener && !window.opener.closed){
                // Post message back to the opener window
                window.opener.postMessage({
                    type: "GOOGLE_AUTH_COMPLETE", 
                    connected, 
                    state
                }, window.location.origin);
            }
        } catch(e) {
            console.warn("Error in postMessage", e);
        }

        // Close the popup window shortly after the message is posted
        setTimeout(() => window.close(), 500);
    }, [params]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-500 p-4">
            <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-2xl text-center max-w-sm w-full transform hover:scale-[1.01] transition-all duration-500 ease-out border border-gray-100 dark:border-gray-700">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white dark:bg-gray-900 border-4 border-transparent ring-4 ring-green-400/50 flex items-center justify-center text-green-500 text-4xl font-extrabold animate-bounce-once">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                
                <h2 className="text-3xl font-extrabold mb-3 text-gray-900 dark:text-white">
                    Connection Successful!
                </h2>
                
                <p className="text-lg text-gray-500 dark:text-gray-400 mb-6">
                    Your Google account is now securely linked.
                </p>

                <div className="relative pt-1">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                        Closing window automatically...
                    </p>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                        <div style={{ width: "100%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500 animate-pulse-short"></div>
                    </div>
                </div>

                <div className="text-xs text-gray-400 dark:text-gray-600 mt-4">
                    Powered by YourApp
                </div>
            </div>
        </div>
    );
}

// 2. Export the main page component wrapped in Suspense
export default function AuthComplete() {
    return (
        // The fallback is what shows while the URL params are being parsed
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-gray-500">Completing authentication...</div>
            </div>
        }>
            <AuthCompleteContent />
        </Suspense>
    );
}