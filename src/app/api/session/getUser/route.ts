import { User } from "@/components/types";
import { restoreSession } from "@/lib/sessionHandler";
import { NextResponse } from "next/server";

export async function GET(req:Request){
    const user = await restoreSession();

    if (user){
        return NextResponse.json({
            user: user
        }, {status: 200});

    } else {
        console.log("restore Session: ", user);
        return NextResponse.json({
            error: "Error retrieving the user data"
        }, {status: 404});
    }
}