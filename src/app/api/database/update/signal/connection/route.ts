import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(req:Request){
    try {
        const body = await req.json().catch(() => null);

        if (!body){
            return NextResponse.json({error:"invalid json"}, {status:400});
        }

        const signalID = body.signalID;

        const row = await prisma.signal.findUnique({
            where: {
                signalID: signalID
            }
        });

        if (!row) {
            return NextResponse.json({error: "signal not found"}, {status:404});
        }

        const updatedRow = await prisma.signal.update({
            where: {signalID: signalID},
            data: {active: !row.active ? true : false}
        })

        console.error("Updated Signal connection: ", updatedRow);
        return NextResponse.json({signal: updatedRow, ok:true}, {status:200});

    } catch(err:any){
        console.error("Error updating the signal Connection: ", err);
        return NextResponse.json({error: "internal server error", details: err.message}, {status:500});
    }
}