import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request){
    try {
        const { searchParams } = new URL(req.url);
        const userID           = searchParams.get("userID");

        const userTriggers = await prisma.trigger.findMany({
            where:{
                userID: userID ?? undefined,
            }
        });

        return NextResponse.json({triggers: userTriggers, ok:true}, {status: 200});
    } catch (err:any){
        console.error("Error fetching Triggers for a user: ", err);
        return NextResponse.json({error: "internal server error", details: err.message}, {status:500});
    }
}