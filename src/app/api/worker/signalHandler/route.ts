import { NextResponse } from "next/server";
import { scheduleComputeJob, deleteComputeEvent } from "@/lib/scheduler";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { google } from "googleapis";
import { oauth2ClientFromRefreshToken } from "@/lib/google";

const BodySchema = z.object({
    userID            : z.string().uuid(),
    triggerID         : z.string().uuid(),
    signalID          : z.string().uuid(),
    computeID         : z.string().uuid(),
    triggerWord       : z.string(),
    triggerName       : z.string(),
    startOffsetMinutes: z.number(),
    stopOffsetMinutes : z.number()
})

async function googleCalendarHandler(
    signal             : any,
    triggerWord        : string,
    userID             : string,
    signalID           : string,
    computeID          : string,
    triggerID          : string,
    startOffsetMinutes : number,
    stopOffsetMinutes  : number
){
    const signalConfig = JSON.parse(signal.config);
    const refreshToken = signalConfig.refresh_token;

    // fetching last 6 months of events
    const fetchResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/getEvents?signalID=${encodeURIComponent(signal.signalID)}&days=${encodeURIComponent(180)}`);
    const body          = await fetchResponse.json().catch(() => null);

    if(!body.ok){
        console.log("Error while getting the events for the next 6 months");
        throw new Error("Error while getting the events of the user for the next 6 months(180 days)");
    }

    const fetchedEvents = body.events;
    const nextSyncToken = body.nextSyncToken;
    let jobScheduled    = 0;

    for (const event of fetchedEvents){
        console.log(`Syncing up: ${event.summary} - ${triggerWord}`)
        if (event.summary?.toLowerCase().includes(triggerWord.toLowerCase())){
            const start = event.start;
            const end   = event.end;

            const startMessageID = await scheduleComputeJob(
                event.id!,
                event.summary,
                event.description,
                event.start,
                event.end,
                userID,
                signalID,
                computeID,
                triggerID,
                "START",
                new Date(start.getTime() - startOffsetMinutes* 60000)
            );

            const stopMessageID = await scheduleComputeJob(
                event.id!,
                event.summary,
                event.description,
                event.start,
                event.end,
                userID,
                signalID,
                computeID,
                triggerID,
                "STOP",
                new Date(start.getTime() + stopOffsetMinutes* 60000)
            );

            jobScheduled++;
        }
    }


    // creating a google webhook to get new events
    if (signalConfig.channelID){
        return jobScheduled;
    }

    const oauth         = oauth2ClientFromRefreshToken(refreshToken);
    const calendar      = google.calendar({version: "v3",  auth: oauth});

    const channelID     = signalID;
    const watchResponse = await calendar.events.watch({
        calendarId : "primary",
        requestBody: {
            id     : channelID,
            type   : "web_hook",
            address: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/webhookHandler`,
        }
    });

    if (watchResponse.data){
        await prisma.signal.update({
            where: {signalID: signal.signalID},
            data : {
                config : JSON.stringify({
                    refresh_token : refreshToken,
                    channelID    : watchResponse.data.id,
                    resourceID   : watchResponse.data.resourceId,
                    lastSyncToken: nextSyncToken,
                })
            }
        });
    }

    console.log("Successfully synced all the events of the user");
    return jobScheduled;
}

export async function POST(req: Request){
    try {
        const body = await req.json().catch(()=> null);

        if (!body){
            return NextResponse.json({error: "invalid json"}, {status:400});
        }

        const parsedData = BodySchema.safeParse(body);

        if (!parsedData.success){
            return NextResponse.json({error: "invalid data", details: parsedData.error}, {status: 400});
        }

        const response     = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/database/get/signal/fromID?signalID=${encodeURIComponent(parsedData.data.signalID)}`);
        const data         = await response.json();

        if(!data){
            console.log("no signal was found for the signalID");
            return NextResponse.json({error: "No signal found for the SignalID"}, {status:400});
        }

        const signal     = data.signal;
        let jobScheduled = 0;
         
        if (signal.platform === "GOOGLE_CALENDAR"){
            jobScheduled = await googleCalendarHandler(
                signal,
                parsedData.data.triggerWord,
                parsedData.data.userID,
                parsedData.data.signalID,
                parsedData.data.computeID,
                parsedData.data.triggerID,
                parsedData.data.startOffsetMinutes,
                parsedData.data.stopOffsetMinutes
            );
        }

        return NextResponse.json({success: true, jobScheduled: jobScheduled}, {status: 200});
    
    } catch(err:any){
        console.log('Error while syncing all the events of the user', err.message);
        return NextResponse.json({error: "internal server error", details: err.message}, {status: 500});

    }
}