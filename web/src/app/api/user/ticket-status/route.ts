import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get("email");

        if (!email) {
            return NextResponse.json({ error: "Email required" }, { status: 400 });
        }

        // Check for pending invites (support multiple tickets per user)
        const { data: pendingInvites } = await supabase
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
            .order("created_at", { ascending: false });

        // Filter out expired tickets and get the first valid one
        const now = new Date();
        const validTickets = (pendingInvites || []).filter(ticket => {
            if (!ticket.expires_at) return true;
            return new Date(ticket.expires_at) > now;
        });

        // Get the most recent valid ticket (or the one with earliest event date)
        const pendingInvite = validTickets.length > 0
            ? validTickets.sort((a, b) => {
                // Sort by event date if available
                const dateA = a.garo_events?.date || '9999-12-31';
                const dateB = b.garo_events?.date || '9999-12-31';
                return dateA.localeCompare(dateB);
            })[0]
            : null;

        return NextResponse.json({
            hasPendingTicket: !!pendingInvite,
            isExpired: false,
            totalPendingTickets: validTickets.length,
            ticket: pendingInvite ? {
                type: pendingInvite.nft_type,
                createdAt: pendingInvite.created_at,
                expiresAt: pendingInvite.expires_at
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
        return NextResponse.json({ hasPendingTicket: false, isExpired: false, event: null }, { status: 200 });
    }
}
