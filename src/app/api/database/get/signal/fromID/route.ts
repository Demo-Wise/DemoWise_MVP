import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request){
    try{
        const { searchParams } = new URL(req.url);
        const signalID         = searchParams.get("signalID");

        if (!signalID){
            return NextResponse.json({error: "Missing signalID from Request"}, {status:400});
        }

        const signal  = await prisma.signal.findUnique({
            where: {
                signalID: signalID
            }
        });

        console.log(`Signal fetched for id ${signalID}`, signal);
        return NextResponse.json({signal: signal, ok:true}, {status:200});
    } catch(err:any){
        console.log("Error trying to fetch the signal using the ID from DB");
        return NextResponse.json({error:"internal_server_error", details: err.message}, {status:500});
    }
}