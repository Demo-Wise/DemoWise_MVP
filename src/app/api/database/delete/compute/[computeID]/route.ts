import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function DELETE(req: Request,
    { params }: {params: Promise<{computeID: string}>}
){
    try {
         const resolvedParams = await params;
         const computeId = resolvedParams.computeID;
         console.log("Deleting compute with ID: ", computeId);
        //  console.log("Context params: ", context.params);

         if (!computeId) {
            console.error('Compute Id is misisng in the request');
            return NextResponse.json({error:"bad_request", details:"Compute ID is required"}, {status:400});
         }

         const deletedCompute = await prisma.compute.delete({
            where: {computeID: computeId}
         });

        return NextResponse.json({message: "Compute deleted successfully", deletedCompute:deletedCompute}, {status:200});
    } catch(err:any){
        console.error("Error deleting compute: ", err);
        return NextResponse.json({error:"internal server error", details: err.message}, {status:500});
    }

}