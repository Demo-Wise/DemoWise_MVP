import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {z} from "zod";

const BodySchema = z.object({
    userID     : z.string().uuid(),
    computeID  : z.string().uuid(),
    platform   : z.enum(['GOOGLE_CALENDAR', "AWS", "GCP", "SLACK", "AZURE"]),
    computeName: z.string().min(1),
    config     : z.string().refine((val) => {
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


async function createCompute(data: {
    userID?    : string | null,
    computeID? : string | null,
    platform?  : 'GOOGLE_CALENDAR' | "AWS" | "GCP" | "SLACK" | "AZURE",
    computeName?: string | null,
    config?    : string | null
}){

    try {
        const createdCompute = await prisma.compute.create({
            data: {
                computeID  : data.computeID!,
                platform   : data.platform!,
                provider   : data.platform!,
                computeName: data.computeName ?? null,
                user: {
                    connect: { userID: data.userID! }
                },
                config : data.config ?? "{}",
            }
        });
        console.log("Created compute: ", createdCompute);
        return createdCompute;

    } catch (err:any){
        console.log("Error creating compute entry: ", err);
        
        throw err;
    }

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

        const createdCompute = await createCompute({
            userID     : parsedData.data.userID,
            computeID  : parsedData.data.computeID,
            platform   : parsedData.data.platform,
            computeName: parsedData.data.computeName,
            config     : parsedData.data.config
        });

        return NextResponse.json({compute: createdCompute, ok:true}, {status: 200});


    } catch(err:any){
        return NextResponse.json({error: "internal server error", details: err.message}, {status:500});
    }
}
