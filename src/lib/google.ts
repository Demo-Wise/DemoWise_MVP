import { google } from "googleapis";

export function createOAuthClient(login: Boolean){

    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        login ? process.env.GOOGLE_LOGIN_REDIRECT_URI : process.env.GCALENDAR_REDIRECT_URI
    );

    return client;
}

export function generateAuthURl(state?:string){
    const client = createOAuthClient(false);

    console.log("OAuth redirect URI:", process.env.GCALENDAR_REDIRECT_URI);

    return client.generateAuthUrl({
        access_type: "offline",
        prompt     : "consent",
        scope      : (process.env.CALENDAR_SCOPES || "").split(/\s+/).filter(Boolean),
        state,
    });
}

export function generateLoginAuthURL(state?:string){
    const client = createOAuthClient(true);
    return client.generateAuthUrl({
        prompt: "consent",
        scope : (process.env.LOGIN_SCOPES || "").split(/\s+/).filter(Boolean),
        state,
    });
}

export async function getTokenfromCode(code:string, login:Boolean){
    const client = createOAuthClient(login);
    const { tokens } = await client.getToken(code);
    return tokens;
}

// Authenticated Google Client which will auto-refresh using refreshToken
export function oauth2ClientFromRefreshToken (refreshToken: string){
    const client = createOAuthClient(false);
    client.setCredentials({refresh_token: refreshToken});
    return client;
}