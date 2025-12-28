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

        // Check if invite already exists
        const { data: existingInvite } = await supabase
            .from("pending_invites")
            .select("*")
            .eq("email", normalizedEmail)
            .single();

        if (existingInvite) {
            if (existingInvite.status === 'CLAIMED' || existingInvite.status === 'USED') {
                return NextResponse.json({
                    error: "This email has already claimed their ticket",
                    status: "ALREADY_CLAIMED"
                }, { status: 409 });
            }

            // Already has a pending invite
            return NextResponse.json({
                success: true,
                message: "Entry Ticket already pending for this email",
                invite: { email: normalizedEmail, status: "PENDING" }
            });
        }

        // Check if user already exists in garo_users with a PROOF NFT
        const { data: existingUser } = await supabase
            .from("garo_users")
            .select("*")
            .eq("email", normalizedEmail)
            .single();

        if (existingUser && existingUser.last_mint_address) {
            return NextResponse.json({
                error: "User is already a member",
                tier: existingUser.tier
            }, { status: 409 });
        }

        // Create new pending invite (Entry Ticket)
        const { data: newInvite, error: createError } = await supabase
            .from("pending_invites")
            .insert([{
                email: normalizedEmail,
                tier_to_mint: 1, // Entry tickets always start at Tier 1
                nft_type: 'ENTRY',
                status: 'PENDING',
                event_id: eventId || null,
                invited_by: 'ADMIN' // TODO: Pass actual admin wallet from session
            }])
            .select()
            .single();

        if (createError) {
            console.error("Failed to create invite:", createError);
            return NextResponse.json({ error: createError.message }, { status: 500 });
        }

        console.log(`Airdrop: Entry Ticket created for ${normalizedEmail}`);

        return NextResponse.json({
            success: true,
            message: "🎫 Entry Ticket sent! They'll become a member when scanned at the door.",
            invite: { email: normalizedEmail, status: "PENDING" }
        });

    } catch (error) {
        console.error("Airdrop Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
