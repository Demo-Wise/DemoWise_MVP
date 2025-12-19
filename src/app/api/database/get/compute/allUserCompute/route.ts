import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userID           = searchParams.get("userID");

        const userCompute = await prisma.compute.findMany({
            where: {
                userID : userID ?? undefined,
            }
        });

        return NextResponse.json({compute: userCompute, ok:true}, {status:200});

    } catch(err:any){
        console.error('Error fetching all user compute: ', err);
        return NextResponse.json({error: "internal server error", details:err.message}, {status:500});
    }
}