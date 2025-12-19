import { Client } from "@upstash/qstash";
import { prisma } from "@/lib/prisma";

// Choose local dev values when running in development, otherwise use production envs.
const qstash_url = process.env.NODE_ENV === "development"
    ? process.env.QSTASH_URL_LOCAL ?? process.env.QSTASH_URL
    : process.env.QSTASH_URL;

const qstash_token = process.env.NODE_ENV === "development"
    ? process.env.QSTASH_TOKEN_LOCAL ?? process.env.QSTASH_TOKEN
    : process.env.QSTASH_TOKEN;

if (!qstash_token) {
    throw new Error("Missing QSTASH token. Set QSTASH_TOKEN or QSTASH_TOKEN_LOCAL in env.");
}

const stash = new Client({
    token: qstash_token
});

export async function scheduleComputeJob(
    eventID   : string,
    eventName : string,
    eventDesc : string,
    eventStart: Date,
    eventEnd  : Date,
    userID    : string,
    signalID  : string,
    computeID : string,
    triggerID : string,
    action    : "START" | "STOP",
    runAt     : Date
){
    const job  = await prisma.eventLogger.create({
        data: {
            eventID      : eventID,
            user         : {
                connect  : {userID : userID}
            },
            signal       : {
                connect  : {signalID : signalID}
            },
            compute      : {
                connect  : {computeID : computeID}
            },
            trigger      : {
                connect  : {triggerID: triggerID}
            },
            eventName    : eventName,
            eventDesc    : eventDesc,
            eventStart   : eventStart,
            eventEnd     : eventEnd,
            action       : action,
            scheduledAt  : runAt,
            status       : "PENDING"
        }
    });
    
    const delay  = Math.round((runAt.getTime() - Date.now()) /  1000);

    if (delay < 0) return;
    
    const qstashJob = await stash.publishJSON(
        {
            url  : `${process.env.NEXT_PUBLIC_APP_URL}/api/worker/awsHandler`,
            body : {jobID: job.id},
            delay: delay
        }
    );

    const scheduleID = qstashJob.messageId;

    await prisma.eventLogger.update({where: {id: job.id}, data: {qstashId: scheduleID}});

    console.log(`Successfully scheduled ${action} Instance: ${computeID} at ${runAt.toISOString()}`)

    return scheduleID;
}

export async function deleteComputeJob( messageID: string){
    try {
        await stash.messages.delete(messageID);
        console.log("Successfully deleted the Qstash job: ", messageID);
    } catch (err: any){
        console.log("Error while cancelling qstash job: ", err.message);
    }
}

export async function deleteComputeEvent( eventID: string){
    try{
        const eventStart = await prisma.eventLogger.findFirst({where: {eventID: eventID, action: "START"}});
        const eventStop  = await prisma.eventLogger.findFirst({where: {eventID: eventID, action: "STOP"}});

        await deleteComputeJob(eventStart?.qstashId!);
        await deleteComputeJob(eventStop?.qstashId!);

    } catch (err: any){ 
        console.log("Error while deleting the compute jobs for the event", err.message);
    }
}