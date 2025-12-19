import { NextResponse } from "next/server";
import { getTokenfromCode } from "@/lib/google";
import { saveSession } from "@/lib/sessionHandler";
import { User } from "@/components/types"

async function fetchUserProfile(accessToken:string){
    try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        });
        const profile = await res.json();
        
        const newUser: User = {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        avatar: profile.picture
        };

        const res_db  = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/database/get/user?email=${encodeURIComponent(profile.email)}`);
        const data_db = await res_db.json();
        let userID: string;

        if (!data_db.isPresent){
            const res_create = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/database/create/user`, {
                method: "POST",
                headers:{
                    "Content-Type" : "application/json"
                },
                body: JSON.stringify({
                    name  : profile.name,
                    email : profile.email,
                    avatar: profile.picture
                })
            });

            const data_create = await res_create.json();
            userID = data_create.userID;

        } else{
            userID = data_db.user.userID;
        }

        await saveSession(userID);
    } catch (error) {
        console.error("Failed to fetch user profile", error);
    }
}


export async function GET(req:Request){
    const url   = new URL(req.url);
    const code  = url.searchParams.get("code")!;
    const state = url.searchParams.get('state') || "demo_user";
    const base  = url.origin;
    
    if(!code) NextResponse.json({error: "Missing Code"}, {status:403});

    try{
        const tokens = await getTokenfromCode(code, true);
        if (tokens.access_token){
            await fetchUserProfile(tokens.access_token);
        }
        const redirect = `${process.env.NEXT_PUBLIC_APP_URL}/auth/login/complete?connected=true&state=${encodeURIComponent(state)}`;
        return NextResponse.redirect(redirect);
    } catch(err:any)
    {
        console.error("Token Exchange failed", err)
        return NextResponse.json({error: "Error token exchange"}, {status:500});
    }
}