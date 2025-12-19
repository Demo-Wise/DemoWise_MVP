import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(req:Request){
    try {
        const body = await req.json().catch(() => null);

        if (!body){
            return NextResponse.json({error:"invalid json"}, {status:400});
        }

        const computeID = body.computeID;

        const row = await prisma.compute.findUnique({
            where: {
                computeID: computeID
            }
        });

        if (!row) {
            return NextResponse.json({error: "compute not found"}, {status:404});
        }

        const updatedRow = await prisma.compute.update({
            where: {computeID: computeID},
            data: {active: !row.active ? true : false}
        })

        console.error("Updated compute connection: ", updatedRow);
        return NextResponse.json({compute: updatedRow, ok:true}, {status:200});

    } catch(err:any){
        console.error("Error updating the compute Connection: ", err);
        return NextResponse.json({error: "internal server error", details: err.message}, {status:500});
    }
}