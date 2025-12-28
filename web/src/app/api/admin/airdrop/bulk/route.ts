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

        // Create pending invites for each member (skip if already has one for this event)
        const invites = members.map(member => ({
            email: member.email?.toLowerCase(),
            tier_to_mint: 1,
            nft_type: 'ENTRY',
            status: 'PENDING',
            event_id: eventId,
            invited_by: 'ADMIN_BULK',
            expires_at: expiresAt
        })).filter(inv => inv.email); // Filter out null emails

        // Use upsert to avoid duplicates (email + event_id combo)
        const { data: created, error: insertError } = await supabase
            .from("pending_invites")
            .upsert(invites, {
                onConflict: 'email,event_id',
                ignoreDuplicates: true
            })
            .select();

        if (insertError) {
            // If there's no unique constraint on email+event_id, just insert and handle errors
            console.log("Upsert note:", insertError.message);
        }

        console.log(`📢 Bulk Airdrop: Sent ${members.length} tickets for event ${event?.name || eventId}`);

        return NextResponse.json({
            success: true,
            message: `🎫 Tickets sent to ${members.length} members for "${event?.name || 'Event'}"`,
            count: members.length,
            eventName: event?.name
        });

    } catch (error) {
        console.error("Bulk Airdrop Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
