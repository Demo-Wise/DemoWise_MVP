import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server";
import { z } from "zod";

const allowedSearchFields = {
    email : z.email(),
    userID: z.uuid(),
    name  : z.string().min(1)
};

type AllowedField = keyof typeof allowedSearchFields;

const GenericQuerySchema = z.object({
    by   : z.union([z.literal('email'), z.literal('userID'), z.literal('name')]).optional(),
    q    : z.string().optional(),
    email: z.email().optional(),
    userID: z.string().uuid().optional(),
    name : z.string().min(1).optional()
});


export async function GET(req: Request) {
    try {
        // Extract query parameters
        console.log("Inside get user data from DB: url", req.url);
        const { searchParams } = new URL(req.url);

        const raw = {
            email   : searchParams.get('email') ?? undefined,
            userID  : searchParams.get('userID') ?? undefined,
            name    : searchParams.get('name') ?? undefined,
            by      : searchParams.get('by') ?? undefined,
            q       : searchParams.get('q') ?? undefined
        };

        // Validate the query param
        const parsed = GenericQuerySchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "invalid_email", details: parsed.error.format() },
                { status: 400 }
            );
        }

        let field:AllowedField | null = null;
        let value:string | null = null;

        if (parsed.data.by && parsed.data.q){
            field = parsed.data.by as AllowedField;
            value = parsed.data.q;
        } else if (parsed.data.email){
            field = "email";
            value = parsed.data.email;
        } else if (parsed.data.userID){
            field = "userID";
            value = parsed.data.userID;
        } else if (parsed.data.name){
            field = 'name';
            value = parsed.data.name;
        }

        console.log("Fetching user by ", field, " with value ", value);
        const validator = allowedSearchFields[field!];
        const vParsed   = validator.safeParse(value);

        if (!vParsed.success){
            return NextResponse.json(
            {error: "invalid_value", details: vParsed.error.format()},
            {status: 400})
        }

        const where: Record<string, any> = {[field!]: vParsed.data};

        // Fetch user from DB
        const user = await prisma.user.findUnique({
            where: where as any
        });

        // User NOT FOUND
        if (!user) {
            return NextResponse.json(
                { user: null, isPresent: false },
                { status: 200 }
            );
        }

        // User FOUND
        return NextResponse.json(
            { user: user, isPresent: true },
            { status: 200 }
        );

    } catch (err: any) {
        console.error("Error Fetching User from DB:", err);
        return NextResponse.json(
            { error: "internal_error", message: err.message || String(err) },
            { status: 500 }
        );
    }
}
