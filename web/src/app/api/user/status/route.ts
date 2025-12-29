import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin Client to bypass RLS for user checks
export async function GET(req: NextRequest) {
    // Initialize Supabase Admin Client inside handler to avoid build-time errors
    // if environment variables are not available during build
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
        return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    try {
        // Query garo_users table
        const { data: user, error } = await supabaseAdmin
            .from("garo_users")
            .select("tier, last_mint_address") // Only select public info needed for status
            .eq("email", email.toLowerCase())
            .single();

        if (error || !user) {
            // Check pending invites as fallback
            const { data: invite } = await supabaseAdmin
                .from("pending_invites")
                .select("tier")
                .eq("email", email.toLowerCase())
                .single();

            if (invite) {
                return NextResponse.json({
                    exists: true,
                    tier: invite.tier,
                    status: "PENDING_INVITE"
                });
            }

            return NextResponse.json({ exists: false });
        }

        return NextResponse.json({
            exists: true,
            tier: user.tier || 1,
            status: user.last_mint_address ? "MEMBER" : "GHOST"
        });

    } catch (e) {
        console.error("Error checking user status:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
