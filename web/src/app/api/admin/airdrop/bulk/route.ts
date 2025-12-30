import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabaseClient";

/**
 * Bulk Airdrop - Send tickets to ALL existing members for an event
 * Now creates user_event_tickets directly (not pending_invites)
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { eventId } = body;

        if (!eventId) {
            return NextResponse.json({ error: "Event ID required" }, { status: 400 });
        }

        // Fetch all members (users with last_mint_address = have Proof of Rave)
        const { data: members, error: membersError } = await supabase
            .from("garo_users")
            .select("id, email, tier")
            .not("last_mint_address", "is", null);

        if (membersError) {
            console.error("Error fetching members:", membersError);
            return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
        }

        if (!members || members.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No members found to send tickets to",
                count: 0
            });
        }

        // Fetch event name
        const { data: event } = await supabase
            .from("garo_events")
            .select("name")
            .eq("id", eventId)
            .single();

        // Create tickets directly in user_event_tickets
        let successCount = 0;
        let skipCount = 0;

        for (const member of members) {
            // Check if ticket already exists
            const { data: existingTicket } = await supabase
                .from("user_event_tickets")
                .select("id")
                .eq("user_id", member.id)
                .eq("event_id", eventId)
                .single();

            if (existingTicket) {
                skipCount++;
                continue;
            }

            // Create ticket directly
            const { error: insertError } = await supabase
                .from("user_event_tickets")
                .insert({
                    user_id: member.id,
                    event_id: eventId,
                    ticket_type: "STANDARD",
                    status: "VALID"
                });

            if (insertError) {
                console.error(`Failed for member ${member.id}:`, insertError.message);
            } else {
                successCount++;
            }
        }

        console.log(`📢 Bulk Tickets: ${successCount} created, ${skipCount} skipped for event ${event?.name || eventId}`);

        return NextResponse.json({
            success: true,
            message: `🎟️ ${successCount} tickets created for "${event?.name || 'Event'}" (${skipCount} already had tickets)`,
            count: successCount,
            skipped: skipCount,
            eventName: event?.name
        });

    } catch (error) {
        console.error("Bulk Airdrop Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
