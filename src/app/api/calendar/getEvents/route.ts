import { NextResponse } from "next/server";
import { oauth2ClientFromRefreshToken } from "@/lib/google";
import { google } from "googleapis";
import dayjs from "dayjs";

export async function GET(req: Request){
    try{
        const { searchParams } = new URL(req.url);
        const signalID         = searchParams.get('signalID');
        const days             = Number(searchParams.get("days"));
        const sync             = Boolean(searchParams.get('sync'));

        console.log(`signalID: ${signalID} days: ${days}`);

        if (!signalID){
            console.log("Signal ID is missing from the Request");
            return NextResponse.json({error: "Missing signal ID"}, {status: 400});
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/database/get/signal/fromID?signalID=${encodeURIComponent(signalID)}`);
        const data     = await response.json().catch(() => null);

        if (!response.ok || response.status !== 200){
            console.log("Error while fetching the signal from DB using the ID", data);
            return NextResponse.json({error: "Error while fetching from DB", details: data}, {status:401});
        }

        const signal        = data.signal;
        const refresh_token = JSON.parse(signal.config).refresh_token;
        const oAuthClient   = oauth2ClientFromRefreshToken(refresh_token);

        const calendar      = google.calendar({version: "v3", auth: oAuthClient});
        const timeMin       = dayjs().toISOString();
        const timeMax       = dayjs().add(days, 'day').toISOString();

        let resp;

        if(sync){
            console.log("Inside sync block");
            resp          = await calendar.events.list({
            calendarId  : "primary",
            timeMin     : timeMin,
            singleEvents: true,
            // orderBy     : "startTime",
            maxResults  : 2500
            });
        } else {
            resp          = await calendar.events.list({
            calendarId  : "primary",
            timeMin     : timeMin,
            timeMax     : timeMax,
            singleEvents: true,
            orderBy     : "startTime",
            maxResults  : 2500
            });
        }

        const events       = resp.data.items || [];
        const nextSyncToken= resp.data.nextSyncToken;

        console.log("NextSyncToken: ", resp.data.nextSyncToken, resp.data.nextPageToken);

        const cleaned      =  events.map(ev => ({
            id          : ev.id,
            summary     : ev.summary || "",
            description : ev.description || "",
            location    : ev.location || "",
            start       : new Date(ev.start?.dateTime || ev.start?.date || ""),
            end         : new Date(ev.end?.dateTime || ev.end?.date || ""),
            isAllDay    : !!ev.start?.date,
            htmlLink    : ev.htmlLink,
            attendees   : ev.attendees
        }))

        return NextResponse.json({events: cleaned, ok:true, nextSyncToken:nextSyncToken}, {status:200});


    } catch(err:any)
    {
        console.log("Error while fetching the events from GCalendar", err.message);
        return NextResponse.json({error:"internal_server_error", details:err.message}, {status:500});
    }   

}