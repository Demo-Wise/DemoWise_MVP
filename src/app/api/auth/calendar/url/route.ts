import { NextResponse } from "next/server";
import { generateAuthURl } from "@/lib/google";
import { encryptData } from "@/lib/encryption";

export async function GET (response: Request){
    const { searchParams } = new URL(response.url);

    const signalData  = {
        userID    : searchParams.get("userID"),
        signalName: searchParams.get("signalName"),
        signalType: searchParams.get('signalType')
    };


    const state = encryptData(JSON.stringify(signalData), process.env.ENCRYPTION_KEY!);
    const url   = generateAuthURl(state);
    return NextResponse.json({url, state});
}