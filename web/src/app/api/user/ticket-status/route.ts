import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get("email");
        const userId = searchParams.get("userId");

        if (!email && !userId) {
            return NextResponse.json({ error: "Email or userId required" }, { status: 400 });
        }

        // First, get user by email to check user_event_tickets
        let user = null;
        if (email) {
            const { data: userData } = await supabase
                .from("garo_users")
                .select("id")
                .eq("email", email.toLowerCase().trim())
                .single();
            user = userData;
        }

        // 1. Check user_event_tickets (for existing members)
        let validEventTicket = null;
        if (user) {
            const { data: eventTickets } = await supabase
                .from("user_event_tickets")
                .select(`
                    id,
                    status,
                    ticket_type,
                    created_at,
                    garo_events:event_id (
                        id,
                        name,
                        date,
                        time,
                        location
                    )
                `)
                .eq("user_id", user.id)
                .eq("status", "VALID")
                .order("created_at", { ascending: false });

            // Get the ticket with the earliest upcoming event
            if (eventTickets && eventTickets.length > 0) {
                const now = new Date();
                const upcomingTickets = eventTickets.filter((t: any) => {
                    if (!t.garo_events?.date) return false;
                    const eventDate = new Date(t.garo_events.date);
                    return eventDate >= now;
                });

                if (upcomingTickets.length > 0) {
                    upcomingTickets.sort((a: any, b: any) => {
                        const dateA = a.garo_events?.date || '9999-12-31';
                        const dateB = b.garo_events?.date || '9999-12-31';
                        return dateA.localeCompare(dateB);
                    });
                    validEventTicket = upcomingTickets[0];
                }
            }
        }

        // 2. Check pending_invites (for ghosts who haven't signed up yet)
        let pendingInvite = null;
        if (email && !validEventTicket) {
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

            // Filter out expired tickets
            const now = new Date();
            const validTickets = (pendingInvites || []).filter(ticket => {
                if (!ticket.expires_at) return true;
                return new Date(ticket.expires_at) > now;
            });

            if (validTickets.length > 0) {
                validTickets.sort((a, b) => {
                    const dateA = a.garo_events?.date || '9999-12-31';
                    const dateB = b.garo_events?.date || '9999-12-31';
                    return dateA.localeCompare(dateB);
                });
                pendingInvite = validTickets[0];
            }
        }

        // Determine which ticket to return (prioritize user_event_tickets)
        const activeTicket = validEventTicket || pendingInvite;
        const eventData = validEventTicket
            ? validEventTicket.garo_events
            : pendingInvite?.garo_events;

        return NextResponse.json({
            hasPendingTicket: !!activeTicket,
            isExpired: false,
            ticketSource: validEventTicket ? "user_event_tickets" : (pendingInvite ? "pending_invites" : null),
            ticket: activeTicket ? {
                type: validEventTicket?.ticket_type || pendingInvite?.nft_type,
                createdAt: activeTicket.created_at,
                expiresAt: pendingInvite?.expires_at || null
            } : null,
            event: eventData ? {
                id: eventData.id,
                name: eventData.name,
                date: eventData.date,
                time: eventData.time,
                location: eventData.location
            } : null
        });

    } catch (error) {
        console.error("Ticket Status Error:", error);
        return NextResponse.json({ hasPendingTicket: false, isExpired: false, event: null }, { status: 200 });
    }
}
