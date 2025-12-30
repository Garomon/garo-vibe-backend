import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";
import { checkOxidation } from "../../../../lib/dynamicNft";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { walletAddress, email, userInfo } = body;

        if (!walletAddress) {
            return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
        }

        // Check if user exists
        let { data: user, error } = await supabase
            .from("garo_users")
            .select("*")
            .eq("wallet_address", walletAddress)
            .single();

        if (error && error.code !== "PGRST116") { // PGRST116 is 'not found'
            console.error("Supabase Error:", error);
        }

        let isNewUser = false;
        let ticketGranted = false;

        if (!user) {
            // Check for pending invite by email
            const userEmail = (email || userInfo?.email || "").toLowerCase().trim();

            // Create new GHOST user first
            isNewUser = true;

            const { data: newUser, error: createError } = await supabase
                .from("garo_users")
                .insert([
                    {
                        wallet_address: walletAddress,
                        email: userEmail || null,
                        tier: 0, // GHOST - no tier until validated
                        attendance_count: 0,
                    }
                ])
                .select()
                .single();

            if (createError) {
                return NextResponse.json({ error: createError.message }, { status: 500 });
            }
            user = newUser;
            console.log(`New Ghost user created: ${userEmail || walletAddress}`);

            // Now check for pending invites with event_id and auto-create tickets
            if (userEmail) {
                const { data: pendingInvites } = await supabase
                    .from("pending_invites")
                    .select("*")
                    .eq("email", userEmail)
                    .eq("status", "PENDING");

                if (pendingInvites && pendingInvites.length > 0) {
                    for (const invite of pendingInvites) {
                        // If invite has an event_id, create ticket for the user
                        if (invite.event_id) {
                            const { error: ticketError } = await supabase
                                .from("user_event_tickets")
                                .insert({
                                    user_id: user.id,
                                    event_id: invite.event_id,
                                    ticket_type: "STANDARD",
                                    status: "VALID"
                                });

                            if (!ticketError) {
                                console.log(`🎟️ Auto-created ticket for new user ${userEmail} event ${invite.event_id}`);
                                ticketGranted = true;
                            } else {
                                console.error(`Failed to create ticket:`, ticketError);
                            }
                        }

                        // Mark invite as CLAIMED
                        await supabase
                            .from("pending_invites")
                            .update({
                                status: "CLAIMED",
                                claimed_at: new Date().toISOString(),
                                claimed_by_wallet: walletAddress
                            })
                            .eq("id", invite.id);
                    }
                }
            }
        } else {
            // Existing user - update email if it's null and we have one now
            const userEmail = (email || userInfo?.email || "").toLowerCase().trim();
            if (!user.email && userEmail) {
                await supabase
                    .from("garo_users")
                    .update({ email: userEmail })
                    .eq("id", user.id);
                user.email = userEmail;
                console.log(`Updated email for user ${user.id}: ${userEmail}`);
            }
        }

        // Check for Oxidation (Lazy Decay)
        if (!isNewUser && user) {
            try {
                const newTier = await checkOxidation(user.id, user.tier, user.last_attendance);
                if (newTier) {
                    console.log(`User ${user.id} decayed to Tier ${newTier}`);
                    user.tier = newTier;
                }
            } catch (e) {
                console.error("Oxidation check failed:", e);
            }
        }

        return NextResponse.json({
            success: true,
            user,
            isNew: isNewUser,
            ticketGranted,
            message: isNewUser
                ? (ticketGranted ? "Welcome! Your event access is ready." : "Welcome Home")
                : "Welcome Back"
        });

    } catch (error) {
        console.error("Login API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
