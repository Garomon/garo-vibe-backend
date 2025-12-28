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

        // Check if there's already a PENDING invite for THIS event
        const { data: existingInvite } = await supabase
            .from("pending_invites")
            .select("*")
            .eq("email", normalizedEmail)
            .eq("status", "PENDING")
            .single();

        if (existingInvite) {
            // Already has a pending invite - check if same event
            if (existingInvite.event_id === eventId) {
                return NextResponse.json({
                    success: true,
                    message: "Entry Ticket already pending for this email and event",
                    invite: { email: normalizedEmail, status: "PENDING" }
                });
            }
            // Different event - allow sending new ticket
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
                // Expire 1 day after event date
                const eventDate = new Date(event.date);
                eventDate.setDate(eventDate.getDate() + 1);
                expiresAt = eventDate.toISOString();
            }
        }

        // Create new pending invite (Entry Ticket) for this event
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

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from("garo_users")
            .select("tier")
            .eq("email", normalizedEmail)
            .single();

        const statusMessage = existingUser
            ? `🎫 Event ticket sent to existing Tier ${existingUser.tier} member!`
            : "🎫 Entry Ticket sent! They'll become a member when scanned at the door.";

        console.log(`Airdrop: Entry Ticket created for ${normalizedEmail} (Event: ${eventId || 'General'}, Expires: ${expiresAt || 'Never'})`);

        return NextResponse.json({
            success: true,
            message: statusMessage,
            invite: { email: normalizedEmail, status: "PENDING", expiresAt }
        });

    } catch (error) {
        console.error("Airdrop Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

