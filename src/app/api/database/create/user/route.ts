import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import z from "zod";


const BodySchema = z.object({
    name  : z.string().min(1).optional(),
    email : z.email().optional(),
    avatar: z.url().optional()
});


async function createUser(data: {
    name?   : string | null,
    email?  : string | null,
    avatar? : string | null
}){
    const MAX_RETRIES = 5;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt ++){
        const userID = crypto.randomUUID()

        try{
            const createdUser = await prisma.user.create(
                {
                    data: {
                        userID: userID,
                        name  : data.name?? null,
                        email : data.email ?? null,
                        avatar: data.avatar ?? null
                    },
                }
            );

            return createdUser;
        } catch(err: any){
            if (err.code=== "P2002") {
            // Collision on userID (astronomical improbable), retry
            const backoff = Math.min(1000, 2 ** attempt * 10);
            await new Promise((r) => setTimeout(r, backoff));
            continue;
        }
        // Other errors bubble up
        throw err;
        }
    }

    throw new Error("Failed to create unique userID after retries");
}

export async function POST(req: Request){
    try {
        const body = await req.json().catch(() => (null));
        
        if (!body){
            return NextResponse.json({error: "invalid json"}, {status: 400});
        }

        const parsedData = BodySchema.safeParse(body);

        if (!parsedData.success){
            return NextResponse.json({error: "invalid_input", details: parsedData.error.format()}, {status: 400});
        }

        const { name, email, avatar } = parsedData.data;

        const user = await createUser({
            name,
            email,
            avatar
        });

        return NextResponse.json({ok:true, userID: user.userID}, {status: 200});

    } catch(err: any){

        console.error("Create user failed:", err);
        return NextResponse.json({error: "internal_error", details: err}, {status:500});

    }


}