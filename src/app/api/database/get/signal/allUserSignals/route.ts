import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userID           = searchParams.get("userID");

        const userSignals = await prisma.signal.findMany({
            where: {
                userID : userID ?? undefined,
            }
        });

        return NextResponse.json({signals: userSignals, ok:true}, {status:200});

    } catch(err:any){
        console.error('Error fetching all user signals: ', err);
        return NextResponse.json({error: "internal server error", details:err.message}, {status:500});
    }
}