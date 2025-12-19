import { NextResponse } from 'next/server';
import { getTokenfromCode } from '@/lib/google';
import { decryptData } from "@/lib/encryption";

export async function GET(req: Request){
    const url   = new URL(req.url);
    const code  = url.searchParams.get("code")!;
    const state = url.searchParams.get("state") || 'demo_user';
    const base  = url.origin;

    const signalData = JSON.parse(decryptData(state, process.env.ENCRYPTION_KEY!)); // decrypt the state variable and json parse

    if (!code) NextResponse.json({error: "Missing Code"}, {status:403});

    try{
        const tokens = await getTokenfromCode(code, false);
        console.log("received tokens: ", tokens);
        
        if(tokens.refresh_token){
            const createdSignal = await fetch(`${base}/api/database/create/signal`, {
                method : "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userID    : signalData.userID,
                    platform  : signalData.signalType,
                    signalName: signalData.signalName,
                    config    : JSON.stringify({refresh_token: tokens.refresh_token})
                })
            });

            console.log("Created Signal: ", createdSignal);
            
        } else {
            console.log("No refresh token received");
        }

        const redirect = `${base}/auth/complete?connected=true&state=${encodeURIComponent(state)}`;
        return NextResponse.redirect(redirect);

    }catch(err:any)
    {
        console.error("Token Exchange failed", err);
        return NextResponse.json({error: "Error Token Exchange"}, {status: 500});
    }
}