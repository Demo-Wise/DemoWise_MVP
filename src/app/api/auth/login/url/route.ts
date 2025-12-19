import { NextResponse } from "next/server";
import { generateLoginAuthURL } from "@/lib/google";
import { cookies } from "next/headers";
import { UserSession, User } from "@/components/types";
import { restoreSession } from "@/lib/sessionHandler";


export async function GET(response: Request){
    const cookieStore    = await cookies();
    // Check whether the cookie is present or not
    const isPresent = cookieStore.has(process.env.LOGIN_COOKIE!);
    if (!isPresent){
        const state = crypto.randomUUID();
        const url   = generateLoginAuthURL(state);
        return NextResponse.json({
            restored: false,
            url: url,
            state   : state
        });
        
    }

    const restoreUser : User | null | undefined = await restoreSession(); 

    if (restoreUser) {
        return NextResponse.json({
        restored: true,
        user    : restoreUser,
    });
    }
   
    else{
        const state = crypto.randomUUID();
        const url   = generateLoginAuthURL(state);
        return NextResponse.json({
            retored : false,
            url: url,
            state   : state 
        });
    }
    
}