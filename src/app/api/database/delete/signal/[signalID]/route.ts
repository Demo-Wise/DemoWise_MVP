import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function DELETE(req: Request,
    { params }: {params: Promise<{signalID: string}>}
){
    try {
         const resolvedParams = await params;
         const signalId = resolvedParams.signalID;
         console.log("Deleting signal with ID: ", signalId);
        //  console.log("Context params: ", context.params);

         if (!signalId) {
            console.error('Signal Id is misisng in the request');
            return NextResponse.json({error:"bad_request", details:"Signal ID is required"}, {status:400});
         }

         const deletedSignal = await prisma.signal.delete({
            where: {signalID: signalId}
         });

        return NextResponse.json({message: "Signal deleted successfully", deletedSignal:deletedSignal}, {status:200});
    } catch(err:any){
        console.error("Error deleting signal: ", err);
        return NextResponse.json({error:"internal server error", details: err.message}, {status:500});
    }

}