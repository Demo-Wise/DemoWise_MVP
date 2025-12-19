import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {z} from "zod";

const BodySchema = z.object({
    userID  : z.string().uuid(),
    platform: z.enum(['GOOGLE_CALENDAR', "AWS", "GCP", "SLACK", "AZURE"]),
    signalName: z.string().min(1),
    config: z.string().refine((val) => {
        try{ 
            JSON.parse(val);
            return true;
        }catch{
            return false;
        }
    },{
        message: "config must be a valid JSON string"
    }),
});


async function createSignal(data: {
    userID?    : string | null,
    platform?  : 'GOOGLE_CALENDAR' | "AWS" | "GCP" | "SLACK" | "AZURE",
    signalName?: string | null,
    config?    : string | null
}){
    const MAX_RETRIES = 5;

    for (let attempt = 0; attempt< MAX_RETRIES; attempt ++){
        const signalID = crypto.randomUUID();

        try {
            const createdSignal = await prisma.signal.create({
                data: {
                    signalID  : signalID,
                    platform  : data.platform!,
                    signalName: data.signalName ?? null,
                    user: {
                        connect: { userID: data.userID! }
                    },
                    config : data.config ?? "{}",
                }
            });
            console.log("Created signal: ", createdSignal);
            return createdSignal;

        } catch (err:any){
            console.log("Error creating signal entry: ", err);
            if (err.code === "P2002"){
                const backoff = Math.min(100, 2**attempt * 10);
                await new Promise((r) => setTimeout(r, backoff));
                continue;
            }

            throw err;
        }
    }

    throw new Error("Failed to create unique signaID after retries");

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

        const createdSignal = await createSignal({
            userID     : parsedData.data.userID,
            platform   : parsedData.data.platform,
            signalName : parsedData.data.signalName,
            config     : parsedData.data.config
        });

        return NextResponse.json({signal: createdSignal, ok:true}, {status: 200});


    } catch(err:any){
        return NextResponse.json({error: "internal server error", details: err.message}, {status:500});
    }
}
