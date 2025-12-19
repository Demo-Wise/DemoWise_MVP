import { getCookie, setCookie, eraseCookie } from "./cookieHandler";
import { User, UserSession } from "@/components/types";
import { cookies } from "next/headers";

export async function saveSession(userID:string){
    console.log("Save Session into cookies");
    const sessionData = {
        userID   : userID,
        sessionid: crypto.randomUUID(),
    }

    try{
        const sessionString  = JSON.stringify(sessionData);
        const encodedSession = btoa(sessionString);

        await setCookie(process.env.LOGIN_COOKIE!, encodedSession, 7);
    }catch(e){
        console.error("Failed to save user session", e);
    }
}

export async function clearSession(){
   await eraseCookie(process.env.LOGIN_COOKIE!);
}

export async function restoreSession(){
    console.log("inside restoreSession function");
    const cookieStore = await cookies();

    if (!cookieStore.has(process.env.LOGIN_COOKIE!)) 
    {
        console.log("cookie not present");
        return;
    }
        

    const encodedSession = await getCookie(process.env.LOGIN_COOKIE!);

    if (!encodedSession) return;

    const decodedSession = atob(encodedSession);

    try{
        const sessionData = JSON.parse(decodedSession);
        console.log('try in restoresession: ', decodedSession);
        if(sessionData.userID && sessionData.sessionid){
            console.log("are we returning");

            // fetching user data from database

            const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/database/get/user?userID=${encodeURIComponent(sessionData.userID)}`);
            const data     = await response.json();

            if (!data.user){
                console.log("No user found for the given userID");
                return null;
            }

            const user: User = data.user;

            return user;
        }
    }catch(error){
        console.error("Failed to parse user sessiodn data", error);
        clearSession();
    }

    return null;
    
}