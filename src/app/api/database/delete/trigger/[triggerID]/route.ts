import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(req: Request,
    { params } : { params: Promise<{triggerID: string}>}
){
    try {
        const resolvedParams = await params;
        const triggerID      = resolvedParams.triggerID;

        if (!triggerID){
            console.error("Trigger ID is missing in the request");
            return NextResponse.json({error: "bad_request", details: "TriggerID is missing in the request"}, {status: 400});
        }

        const deletedTrigger = await prisma.trigger.delete({
            where: {triggerID: triggerID}
        });

        return NextResponse.json({message: "Trigger deleted successfully", deletedTrigger: deletedTrigger}, {status:200});
    } catch(err:any){
        console.error("Error deleting Trigger: ", err);
        return NextResponse.json({error: "internal server error", details: err.message}, {status:500});
    }
}