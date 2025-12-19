"use client";

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// 1. ISOLATE CONTENT: Move your logic into a separate inner component
function LoginAuthCompleteContent() {
    const params = useSearchParams();

    useEffect(() => {
        const connected = params.get('connected') === 'true';
        const state     = params.get('state') || null;

        try {
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                    type: "GOOGLE_LOGIN_AUTH_COMPLETE", 
                    connected, 
                    state
                }, window.location.origin);
            }
        } catch (e) {
            console.warn("Error in post Message", e);
        }

        setTimeout(() => window.close(), 300);
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
                    Signed-in using your Google Account.
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

// 2. EXPORT PAGE: Wrap the content in Suspense
export default function LoginAuthComplete() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                {/* A simple invisible or minimal fallback while params load */}
                <div className="animate-pulse w-full max-w-sm h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
            </div>
        }>
            <LoginAuthCompleteContent />
        </Suspense>
    );
}