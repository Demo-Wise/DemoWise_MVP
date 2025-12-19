import { cookies } from "next/headers";

export async function setCookie(name:string, value:string, days:number){
    const cookieStore = await cookies();

    if (days){
        cookieStore.set(name, value, {
            "httpOnly": true,
            "path"    : "/",
            "maxAge"  : days * 24 * 60 * 60,
            "secure"  : process.env.NODE_ENV === "production",
        });
    }

}

export async function getCookie(name:string){
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(name)?.value;
    return cookieValue;
}


export async function eraseCookie(name:string){
    const cookieStore = await cookies();
    cookieStore.delete(name);
}