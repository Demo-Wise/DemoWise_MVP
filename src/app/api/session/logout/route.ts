import { clearSession } from "@/lib/sessionHandler";
import { NextResponse } from "next/server";

export async function POST(req: Request){
    await clearSession();

    return NextResponse.json({success: true});
}