import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get("email");

        if (!email) {
            return NextResponse.json({ error: "Email required" }, { status: 400 });
        }

        // Check for pending invite with event details
        const { data: pendingInvite } = await supabase
            .from("pending_invites")
            .select(`
                *,
                garo_events (
                    id,
                    name,
                    date,
                    time,
                    location
                )
            `)
            .eq("email", email.toLowerCase().trim())
            .eq("status", "PENDING")
            .single();

        return NextResponse.json({
            hasPendingTicket: !!pendingInvite,
            ticket: pendingInvite ? {
                type: pendingInvite.nft_type,
                createdAt: pendingInvite.created_at
            } : null,
            event: pendingInvite?.garo_events ? {
                id: pendingInvite.garo_events.id,
                name: pendingInvite.garo_events.name,
                date: pendingInvite.garo_events.date,
                time: pendingInvite.garo_events.time,
                location: pendingInvite.garo_events.location
            } : null
        });

    } catch (error) {
        console.error("Ticket Status Error:", error);
        return NextResponse.json({ hasPendingTicket: false, event: null }, { status: 200 });
    }
}
