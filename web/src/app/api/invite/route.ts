import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/invite
 * Send an invitation to a friend
 *
 * Body: { inviterWallet, inviteeEmail, eventId? }
 */
export async function POST(request: NextRequest) {
    try {
        const { inviterWallet, inviteeEmail, eventId } = await request.json();

        if (!inviterWallet || !inviteeEmail) {
            return NextResponse.json(
                { success: false, error: "inviterWallet and inviteeEmail are required" },
                { status: 400 }
            );
        }

        // Normalize email
        const normalizedEmail = inviteeEmail.toLowerCase().trim();

        // 1. Get the inviter
        const { data: inviter, error: inviterError } = await supabase
            .from("garo_users")
            .select("id, tier, nickname, wallet_address")
            .eq("wallet_address", inviterWallet)
            .single();

        if (inviterError || !inviter) {
            return NextResponse.json(
                { success: false, error: "Inviter not found" },
                { status: 404 }
            );
        }

        // 2. Check if inviter is a member (not ghost)
        if (!inviter.tier || inviter.tier === 0) {
            return NextResponse.json(
                { success: false, error: "Only members can send invites" },
                { status: 403 }
            );
        }

        // 3. Check remaining invites this month
        const { data: remainingData, error: remainingError } = await supabase
            .rpc("get_remaining_invites", { user_uuid: inviter.id });

        const remainingInvites = remainingData ?? 0;

        if (remainingInvites <= 0) {
            return NextResponse.json({
                success: false,
                error: "No invites remaining this month",
                tier: inviter.tier,
                remaining: 0
            }, { status: 403 });
        }

        // 4. Check if this email was already invited by this user
        const { data: existingInvite } = await supabase
            .from("member_invites")
            .select("id, status")
            .eq("inviter_id", inviter.id)
            .eq("invitee_email", normalizedEmail)
            .in("status", ["SENT", "CLAIMED"])
            .single();

        if (existingInvite) {
            return NextResponse.json({
                success: false,
                error: existingInvite.status === "CLAIMED"
                    ? "This person already joined!"
                    : "You already sent an invite to this email"
            }, { status: 400 });
        }

        // 5. Check if this email is already a member
        const { data: existingUser } = await supabase
            .from("garo_users")
            .select("id, tier")
            .eq("email", normalizedEmail)
            .single();

        if (existingUser && existingUser.tier > 0) {
            return NextResponse.json({
                success: false,
                error: "This person is already a member!"
            }, { status: 400 });
        }

        // 6. Create the invitation
        const { data: invite, error: inviteError } = await supabase
            .from("member_invites")
            .insert({
                inviter_id: inviter.id,
                invitee_email: normalizedEmail,
                event_id: eventId || null,
                status: "SENT",
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
            })
            .select()
            .single();

        if (inviteError) {
            console.error("Failed to create invite:", inviteError);
            return NextResponse.json(
                { success: false, error: "Failed to create invitation" },
                { status: 500 }
            );
        }

        // 7. Also create a pending_invite for backwards compatibility
        // This ensures the invitee gets a ticket when they sign up
        if (eventId) {
            await supabase
                .from("pending_invites")
                .upsert({
                    email: normalizedEmail,
                    event_id: eventId,
                    nft_type: "ENTRY",
                    status: "PENDING",
                    invited_by: inviterWallet,
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }, { onConflict: "email" });
        }

        return NextResponse.json({
            success: true,
            message: `Invitation sent to ${normalizedEmail}!`,
            invite: {
                id: invite.id,
                email: normalizedEmail,
                eventId: eventId || null,
                expiresAt: invite.expires_at
            },
            remaining: remainingInvites - 1
        });

    } catch (error) {
        console.error("Invite error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/invite?wallet=xxx
 * Get invites sent by a user and their remaining count
 */
export async function GET(request: NextRequest) {
    try {
        const wallet = request.nextUrl.searchParams.get("wallet");

        if (!wallet) {
            return NextResponse.json(
                { success: false, error: "wallet parameter required" },
                { status: 400 }
            );
        }

        // Get user
        const { data: user, error: userError } = await supabase
            .from("garo_users")
            .select("id, tier")
            .eq("wallet_address", wallet)
            .single();

        if (userError || !user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Get remaining invites
        const { data: remainingData } = await supabase
            .rpc("get_remaining_invites", { user_uuid: user.id });

        const remaining = remainingData ?? 0;

        // Get invite config for this tier
        const { data: config } = await supabase
            .from("invite_config")
            .select("invites_per_month")
            .eq("tier", user.tier)
            .single();

        const maxPerMonth = config?.invites_per_month ?? 1;

        // Get sent invites
        const { data: invites } = await supabase
            .from("member_invites")
            .select(`
                id,
                invitee_email,
                event_id,
                status,
                created_at,
                claimed_at,
                claimed_by_user_id
            `)
            .eq("inviter_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20);

        // Get count of successful referrals (invites that became members)
        const { count: successfulReferrals } = await supabase
            .from("garo_users")
            .select("id", { count: "exact" })
            .eq("invited_by", user.id);

        return NextResponse.json({
            success: true,
            tier: user.tier,
            remaining,
            maxPerMonth,
            usedThisMonth: maxPerMonth - remaining,
            invites: invites || [],
            totalReferrals: successfulReferrals || 0
        });

    } catch (error) {
        console.error("Get invites error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
