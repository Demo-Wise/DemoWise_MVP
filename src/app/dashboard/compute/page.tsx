"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/components/types";
import { ComputePage } from "@/components/dashboard/compute";



export default function ComputePageClient() {
    const [ user, setUser ] = useState<User | null>(null);
    const [ loading, setLoading ] = useState(true);
    const router = useRouter();

    useEffect(() => {
        setLoading(true);

        async function checkSession(){
        const r = await fetch("/api/session/getUser", {
            method: "GET",
            credentials: "include",
        });

        if(!r.ok){
            console.log("No cookie data from getUser, redirecting to main page");
            setUser(null);
            router.push('/');
            return;
        }

        const data = await r.json();
        const userData: User = data.user;
        setUser(userData);
        setLoading(false);
        }

        checkSession();
        

    }, [router]);

    useEffect( () => {
        if (!loading && !user){
            router.push("/");
        }
    }, [loading, user, router]);

    const clearSession = async () => {
        try{
            await fetch("/api/session/logout", { method: "POST", credentials:"include" });
        } catch (err){
            console.warn("Logout API failed")
        }
        setUser(null);
    };


    const handleLogout = async() => {
        await clearSession();
        router.push("/");
    };

    if (loading) {
        return (
        <div className="flex items-center justify-center h-screen bg-[#061418] text-[#E8E4D9] font-mono">
        <div className="text-lg animate-pulse">
            Loading<span className="animate-bounce inline-block">...</span>
        </div>
        </div>
    );
    }
    
    
    if (!user) {
        return null;
    }
    
    return <ComputePage user={user} onLogout={handleLogout} />; 

}