import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, eventId } = body;

        if (!email) {
            return NextResponse.json({ error: "Email required" }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists as a member
        const { data: existingUser } = await supabase
            .from("garo_users")
            .select("id, tier, email")
            .eq("email", normalizedEmail)
            .single();

        // If user exists and we have an eventId, create ticket directly
        if (existingUser && eventId) {
            // Check if ticket already exists
            const { data: existingTicket } = await supabase
                .from("user_event_tickets")
                .select("id")
                .eq("user_id", existingUser.id)
                .eq("event_id", eventId)
                .single();

            if (existingTicket) {
                return NextResponse.json({
                    success: true,
                    message: `🎫 Ticket already exists for this member and event`,
                    invite: { email: normalizedEmail, status: "TICKET_EXISTS" }
                });
            }

            // Create ticket directly for existing member
            const { error: ticketError } = await supabase
                .from("user_event_tickets")
                .insert({
                    user_id: existingUser.id,
                    event_id: eventId,
                    ticket_type: "STANDARD",
                    status: "VALID"
                });

            if (ticketError) {
                console.error("Failed to create ticket:", ticketError);
                return NextResponse.json({ error: ticketError.message }, { status: 500 });
            }

            console.log(`🎟️ Ticket created for existing member: ${normalizedEmail} (Event: ${eventId})`);

            return NextResponse.json({
                success: true,
                message: `✅ Ticket granted! Tier ${existingUser.tier} member can now check in.`,
                invite: { email: normalizedEmail, status: "TICKET_GRANTED" }
            });
        }

        // For GHOST users (no account) - create pending_invite as before
        // Check if there's already a PENDING invite for THIS event
        const { data: existingInvite } = await supabase
            .from("pending_invites")
            .select("*")
            .eq("email", normalizedEmail)
            .eq("status", "PENDING")
            .single();

        if (existingInvite) {
            if (existingInvite.event_id === eventId) {
                return NextResponse.json({
                    success: true,
                    message: "Entry Ticket already pending for this email and event",
                    invite: { email: normalizedEmail, status: "PENDING" }
                });
            }
        }

        // Fetch event date to set expiration
        let expiresAt = null;
        if (eventId) {
            const { data: event } = await supabase
                .from("garo_events")
                .select("date")
                .eq("id", eventId)
                .single();

            if (event?.date) {
                const eventDate = new Date(event.date);
                eventDate.setDate(eventDate.getDate() + 1);
                expiresAt = eventDate.toISOString();
            }
        }

        // Create new pending invite (Entry Ticket) for ghost user
        const { data: newInvite, error: createError } = await supabase
            .from("pending_invites")
            .insert([{
                email: normalizedEmail,
                tier_to_mint: 1,
                nft_type: 'ENTRY',
                status: 'PENDING',
                event_id: eventId || null,
                invited_by: 'ADMIN',
                expires_at: expiresAt
            }])
            .select()
            .single();

        if (createError) {
            console.error("Failed to create invite:", createError);
            return NextResponse.json({ error: createError.message }, { status: 500 });
        }

        console.log(`🎫 Ghost invite created for ${normalizedEmail} (Event: ${eventId || 'General'})`);

        return NextResponse.json({
            success: true,
            message: "🎫 Entry Ticket sent! They'll get access when they sign up.",
            invite: { email: normalizedEmail, status: "PENDING", expiresAt }
        });

    } catch (error) {
        console.error("Airdrop Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
