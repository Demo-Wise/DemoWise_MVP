import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {z} from "zod";

const BodySchema = z.object({
    userID      : z.string().uuid(),
    signalID    : z.string().uuid(),
    computeID   : z.string().uuid(),
    triggerWord : z.string().min(1),
    triggerName : z.string().min(1),
    startOffsetMinutes: z.number().min(0).optional(),
    stopOffsetMinutes : z.number().min(0).optional()
});


async function createTrigger(data: {
    userID?            : string | null,
    signalID?          : string | null,
    computeID?         : string | null,
    triggerWord?       : string | null,
    triggerName?       : string | null,
    startOffsetMinutes : number | null,
    stopOffsetMinutes  : number | null
}){
    const MAX_RETRIES = 5;

    for (let attempt = 0; attempt< MAX_RETRIES; attempt ++){
        const triggerID = crypto.randomUUID();

        try {
            const createdTrigger = await prisma.trigger.create({
                data: {
                    triggerID        : triggerID,
                    user: {
                        connect: {userID: data.userID!}
                    },
                    signal: {
                        connect: {signalID: data.signalID!}
                    },
                    compute: {
                        connect: {computeID: data.computeID!}
                    },
                    triggerWord       : data.triggerWord!,
                    triggerName       : data.triggerName!,
                    startOffsetMinutes: data.startOffsetMinutes!,
                    stopOffsetMinutes : data.startOffsetMinutes!
                }
            });
            console.log("Created trigger: ", createdTrigger);
            return createdTrigger;

        } catch (err:any){
            console.log("Error creating trigger entry: ", err);
            if (err.code === "P2002"){
                const backoff = Math.min(100, 2**attempt * 10);
                await new Promise((r) => setTimeout(r, backoff));
                continue;
            }

            throw err;
        }
    }

    throw new Error("Failed to create unique triggerID after retries");

}

export async function POST(req:Request){
    try {
        const body = await req.json().catch(() => null);

        if (!body){
            return NextResponse.json({error: "invalid json"}, {status: 400});
        }

        const parsedData = BodySchema.safeParse(body);

        if (!parsedData.success){
            return NextResponse.json({error: "invalid data", details: parsedData.error}, {status: 400});
        }

        const createdTrigger = await createTrigger({
            userID            : parsedData.data.userID,
            signalID          : parsedData.data.signalID,
            computeID         : parsedData.data.computeID,
            triggerWord       : parsedData.data.triggerWord,
            triggerName       : parsedData.data.triggerName,
            startOffsetMinutes: parsedData.data.startOffsetMinutes || null,
            stopOffsetMinutes : parsedData.data.stopOffsetMinutes || null
        });

        // Signal Handling for the trigger (google Calendar - especially initial sync and watch events set up)
        const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/worker/signalHandler`,
            {
                method : "POST",
                headers: {"Content-Type": "application/json"},
                body   : JSON.stringify({
                    userID            : createdTrigger.userID,
                    triggerID         : createdTrigger.triggerID,
                    signalID          : createdTrigger.signalID,
                    computeID         : createdTrigger.computeID,
                    triggerWord       : createdTrigger.triggerWord,
                    triggerName       : createdTrigger.triggerName,
                    startOffsetMinutes: createdTrigger.startOffsetMinutes,
                    stopOffsetMinutes : createdTrigger.stopOffsetMinutes
                })
            }
        );

        const syncBody  = await syncResponse.json();
        
        return NextResponse.json({trigger: createdTrigger, ok:true}, {status: 200});


    } catch(err:any){
        return NextResponse.json({error: "internal server error", details: err.message}, {status:500});
    }
}
