import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabaseClient";

/**
 * Bulk Airdrop - Send tickets to ALL existing members for an event
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

        // Fetch event to get expiration date
        const { data: event } = await supabase
            .from("garo_events")
            .select("date, name")
            .eq("id", eventId)
            .single();

        // Calculate expiration (1 day after event)
        let expiresAt = null;
        if (event?.date) {
            const eventDate = new Date(event.date);
            eventDate.setDate(eventDate.getDate() + 1);
            expiresAt = eventDate.toISOString();
        }

        // Insert invites one by one to handle duplicates gracefully
        let successCount = 0;
        let skipCount = 0;

        for (const member of members) {
            if (!member.email) continue;

            // Check if already has pending invite for this event
            const { data: existing } = await supabase
                .from("pending_invites")
                .select("id")
                .eq("email", member.email.toLowerCase())
                .eq("event_id", eventId)
                .eq("status", "PENDING")
                .single();

            if (existing) {
                skipCount++;
                continue;
            }

            // Create new invite
            const { error: insertError } = await supabase
                .from("pending_invites")
                .insert({
                    email: member.email.toLowerCase(),
                    tier_to_mint: 1,
                    nft_type: 'ENTRY',
                    status: 'PENDING',
                    event_id: eventId,
                    invited_by: 'ADMIN_BULK',
                    expires_at: expiresAt
                });

            if (insertError) {
                console.error(`Failed for ${member.email}:`, insertError.message);
            } else {
                successCount++;
            }
        }

        console.log(`📢 Bulk Airdrop: ${successCount} tickets sent, ${skipCount} skipped for event ${event?.name || eventId}`);

        return NextResponse.json({
            success: true,
            message: `🎫 ${successCount} tickets sent for "${event?.name || 'Event'}" (${skipCount} already had tickets)`,
            count: successCount,
            skipped: skipCount,
            eventName: event?.name
        });

    } catch (error) {
        console.error("Bulk Airdrop Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
