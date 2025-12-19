import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { oauth2ClientFromRefreshToken } from "@/lib/google";
import { deleteComputeEvent, scheduleComputeJob } from "@/lib/scheduler";


export async function POST(request: Request){
    const channelID     = request.headers.get('x-goog-channel-id');
    const resourceState = request.headers.get('x-goog-resource-state');
    
    if (resourceState === "sync"){
        console.log(`Webhook registered for channel ID: ${channelID}`);
        return NextResponse.json({success:true}, {status:200});
    }

    if(!channelID){
        return NextResponse.json({error: "missing channel ID"}, {status: 404});
    }

    try{
        
        const signal = await prisma.signal.findUnique({
            where  : {signalID: channelID},
            include: {
                triggers: true,
            } 
        });

        if (!signal){
            console.log("Couldnt find the corresponding Signal for the channelID");
            return NextResponse.json({error: `Couldn't find the corresponding Signal for the Channel ID: ${channelID}`}, {status:404});
        }

        const signalConfig = JSON.parse(signal.config);
        const refreshToken = signalConfig.refresh_token;

        const oAuthClient = oauth2ClientFromRefreshToken(refreshToken);
        const calendar    = google.calendar({version: "v3", auth: oAuthClient});

        let events = [];
        let nextSyncToken = '';

        try{
            console.log("Last Sync Token: ", signalConfig.lastSyncToken);
            const response = await calendar.events.list(
                {
                    calendarId   : "primary",
                    syncToken    : signalConfig.lastSyncToken,
                    maxResults   : 2500,
                    singleEvents : true
                }
            );

            events        = response.data.items || [];
            nextSyncToken = response.data.nextSyncToken || "";
            console.log("Next sync token: ", nextSyncToken);

        } catch(err:any){
            if (err.code === 410){
                console.warn("Sync token expired, Performing full sync recovery.......");

                const now    = new Date();
                const future = new Date();

                future.setMonth(now.getMonth() + 6);

                const fullResponse = await calendar.events.list({
                    calendarId   : "primary",
                    timeMin      : now.toISOString(),
                    timeMax      : future.toISOString(),
                    singleEvents : true
                });

                events        = fullResponse.data.items || [];
                nextSyncToken = fullResponse.data.nextSyncToken || '';
            } else {
                throw err;
            }
        }

        console.log(`Processing events, length: ${events.length}`);

        // processing the events
        for (const event of events){
            const eventID = event.id!;
            const summary =  event.summary?.toLowerCase() || "";
            const status  = event.status;

            for(const trigger of signal.triggers){
                const keyword = trigger.triggerWord.toLowerCase() || "";
                const isMatch = summary.includes(keyword);


                const existingJob = await prisma.eventLogger.findFirst({
                    where: {
                        eventID  : eventID,
                        signalID : channelID
                    }
                });
                

                // cancelled or events where the keyword is removed from teh title
                if (status === 'cancelled' || !isMatch){
                    if(existingJob){
                        console.log(`Removing the event: ${eventID}}`);
                        deleteComputeEvent(eventID);
                        await prisma.eventLogger.deleteMany({
                            where : {
                                eventID: eventID
                            }
                        });
                    }
                }


                // events which are not cancelled and as a match
                if (status !== 'cancelled' && isMatch){
                    if(existingJob){
                        console.log(`Reschedulling the event: ${eventID}`);
                        deleteComputeEvent(eventID);
                        await prisma.eventLogger.deleteMany({where:{eventID:eventID}});
                    }

                    const start    = new Date(event.start?.dateTime || event.start?.date || "");
                    const runStart = new Date(start.getTime() - trigger.startOffsetMinutes*60000); 
                    const end      = new Date(event.end?.dateTime || event.end?.date || "");
                    const runEnd   = new Date(end.getTime() + trigger.stopOffsetMinutes * 60000);



                    const startMsgId = scheduleComputeJob(eventID, event.summary!, event.description || "", start, end, trigger.userID, trigger.signalID!, trigger.computeID!, trigger.triggerID!, "START", runStart);
                    const stopMsgId  = scheduleComputeJob(eventID, event.summary!, event.description || "", start, end, trigger.userID, trigger.signalID!, trigger.computeID!, trigger.triggerID!, "STOP",  runEnd);
                }
            }
        }

        if (nextSyncToken){
            await prisma.signal.update({
                where: {signalID: channelID},
                data : { config: JSON.stringify({
                    ...signalConfig, lastSyncToken: nextSyncToken
                })}
            });
        }

        console.log("Successfully processed the events");
        return NextResponse.json({success:true}, {status:200});


    } catch(err:any){
        console.log("error occured while handling the new event from webhook", err.message);
        return NextResponse.json({error: "internal server error", details: err.message}, {status:500});
    }
}