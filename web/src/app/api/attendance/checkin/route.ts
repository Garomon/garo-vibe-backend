import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";
import { checkAndUpgradeTier } from "../../../../lib/dynamicNft";
import { SolanaAdmin } from "../../../../lib/solanaAdmin";

/**
 * TRANSMUTATION LOGIC:
 * 1. Scan QR → Get wallet address
 * 2. Check if user has pending Entry Ticket (pending_invites OR user_event_tickets)
 * 3. If has Entry Ticket → "Burn" it (mark as USED) → Mint PROOF_OF_RAVE (Tier 1)
 * 4. If already has PROOF → Check for event ticket → Increment attendance → Check tier upgrade
 * 5. If no ticket and no proof → DENIED
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { walletAddress, location, eventId } = body;

        if (!walletAddress) {
            return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
        }

        // 1. Get User
        const { data: user, error: userError } = await supabase
            .from("garo_users")
            .select("*")
            .eq("wallet_address", walletAddress)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: "User not found. They need to login first." }, { status: 404 });
        }

        // 2. Check if user is a Ghost (no PROOF NFT yet)
        const isGhost = !user.last_mint_address;

        if (isGhost) {
            // GHOST FLOW: Check both pending_invites AND user_event_tickets

            // First check user_event_tickets (newer system)
            let eventTicket = null;
            if (eventId) {
                const { data: tickets } = await supabase
                    .from("user_event_tickets")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("event_id", eventId)
                    .eq("status", "VALID")
                    .single();
                eventTicket = tickets;
            } else {
                const { data: tickets } = await supabase
                    .from("user_event_tickets")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("status", "VALID")
                    .limit(1);
                eventTicket = tickets?.[0];
            }

            // Also check pending_invites (legacy system for ghosts)
            let pendingInvite = null;
            if (!eventTicket && user.email) {
                const { data: pendingTickets } = await supabase
                    .from("pending_invites")
                    .select("*")
                    .eq("email", user.email?.toLowerCase())
                    .eq("status", "PENDING");

                if (eventId && pendingTickets) {
                    pendingInvite = pendingTickets.find(t => t.event_id === eventId);
                } else if (pendingTickets && pendingTickets.length > 0) {
                    pendingInvite = pendingTickets[0];
                }
            }

            // Use whichever ticket is available
            const entryTicket = eventTicket || pendingInvite;
            const ticketSource = eventTicket ? "user_event_tickets" : "pending_invites";

            if (!entryTicket) {
                // Check if they have tickets for other events
                const { data: anyTickets } = await supabase
                    .from("user_event_tickets")
                    .select("event_id")
                    .eq("user_id", user.id)
                    .eq("status", "VALID")
                    .limit(1);

                if (anyTickets && anyTickets.length > 0 && eventId) {
                    const { data: ticketEvent } = await supabase
                        .from("garo_events")
                        .select("name")
                        .eq("id", anyTickets[0].event_id)
                        .single();
                    const { data: selectedEvent } = await supabase
                        .from("garo_events")
                        .select("name")
                        .eq("id", eventId)
                        .single();

                    return NextResponse.json({
                        error: "WRONG EVENT",
                        message: "Ticket is for a different event",
                        status: "WRONG_EVENT",
                        details: `Ticket: ${ticketEvent?.name || 'Unknown'} | Scanner: ${selectedEvent?.name || 'Unknown'}`
                    }, { status: 403 });
                }

                // NO TICKET, NO PROOF = DENIED
                return NextResponse.json({
                    error: "NO ACCESS",
                    message: "No Entry Ticket found. They need an invite to enter.",
                    status: "DENIED"
                }, { status: 403 });
            }

            // TRANSMUTATION: Burn Entry Ticket → Mint PROOF_OF_RAVE
            console.log(`🔥 TRANSMUTATION: Converting Entry Ticket to Proof of Rave for ${user.email}`);

            // Mark Entry Ticket as USED (burn) - based on source
            if (ticketSource === "user_event_tickets") {
                await supabase
                    .from("user_event_tickets")
                    .update({ status: "USED", used_at: new Date().toISOString() })
                    .eq("id", entryTicket.id);
            } else {
                await supabase
                    .from("pending_invites")
                    .update({
                        status: "USED",
                        claimed_at: new Date().toISOString(),
                        claimed_by_wallet: walletAddress
                    })
                    .eq("id", entryTicket.id);
            }

            // Create Solana Admin for minting
            const admin = new SolanaAdmin();

            // Mint PROOF_OF_RAVE NFT (Tier 1)
            let mintAddress = null;
            try {
                mintAddress = await admin.mintProofOfRave(walletAddress, 1);
                console.log(`✨ PROOF_OF_RAVE minted: ${mintAddress}`);
            } catch (mintError) {
                console.error("Mint failed:", mintError);
            }

            // Update user to Tier 1 member
            await supabase
                .from("garo_users")
                .update({
                    tier: 1,
                    attendance_count: 1,
                    last_attendance: new Date().toISOString(),
                    last_mint_address: mintAddress,
                    xp: (user.xp || 0) + 100 // Award 100 XP for first check-in
                })
                .eq("id", user.id);

            // Log attendance
            await supabase
                .from("garo_attendance_logs")
                .insert([{
                    user_id: user.id,
                    location: location || "The Roof",
                    event_date: new Date().toISOString()
                }]);

            // Record POAP (event attendance)
            const ticketEventId = ticketSource === "user_event_tickets" ? entryTicket.event_id : entryTicket.event_id;
            let poapMintAddress = null;
            if (ticketEventId) {
                const { data: eventData } = await supabase
                    .from("garo_events")
                    .select("name, date")
                    .eq("id", ticketEventId)
                    .single();

                if (eventData) {
                    try {
                        poapMintAddress = await admin.mintEventPOAP(
                            walletAddress,
                            ticketEventId,
                            eventData.name,
                            eventData.date
                        );
                        console.log(`🏆 POAP NFT minted: ${poapMintAddress}`);
                    } catch (poapError) {
                        console.error("POAP mint failed:", poapError);
                    }
                }

                await supabase
                    .from("event_attendance")
                    .upsert([{
                        user_id: user.id,
                        event_id: ticketEventId,
                        checked_in_at: new Date().toISOString(),
                        nft_mint_address: poapMintAddress
                    }], { onConflict: 'user_id,event_id' });
                console.log(`🏆 POAP recorded for event ${ticketEventId}`);
            }

            // REFERRAL REWARD: If someone invited this user, reward them!
            if (user.invited_by) {
                const REFERRAL_REWARD = 50; // +50 VIBE for successful referral
                await supabase.rpc("increment_xp", {
                    row_id: user.invited_by,
                    amount: REFERRAL_REWARD
                });
                console.log(`🎁 Referral reward: +${REFERRAL_REWARD} VIBE to inviter ${user.invited_by}`);
            }

            return NextResponse.json({
                success: true,
                status: "TRANSMUTATION",
                message: "🎉 Welcome to the Family! Entry Ticket → Proof of Rave",
                newTier: 1,
                tierName: "INITIATE",
                isFirstTime: true,
                mintAddress,
                reward: 100
            });
        }

        // EXISTING MEMBER: Check-in flow
        // Members MUST have a ticket to check in (validates they were invited to this event)

        // First check user_event_tickets (newer system for members)
        let memberTicket = null;
        let ticketSource = null;

        if (eventId) {
            const { data: tickets } = await supabase
                .from("user_event_tickets")
                .select("*")
                .eq("user_id", user.id)
                .eq("event_id", eventId)
                .eq("status", "VALID")
                .single();
            if (tickets) {
                memberTicket = tickets;
                ticketSource = "user_event_tickets";
            }
        } else {
            const { data: tickets } = await supabase
                .from("user_event_tickets")
                .select("*")
                .eq("user_id", user.id)
                .eq("status", "VALID")
                .limit(1);
            if (tickets?.[0]) {
                memberTicket = tickets[0];
                ticketSource = "user_event_tickets";
            }
        }

        // Also check pending_invites (legacy)
        if (!memberTicket && user.email) {
            const { data: pendingTickets } = await supabase
                .from("pending_invites")
                .select("id, event_id")
                .eq("email", user.email?.toLowerCase())
                .eq("status", "PENDING");

            if (eventId && pendingTickets) {
                memberTicket = pendingTickets.find(t => t.event_id === eventId);
            } else if (pendingTickets && pendingTickets.length > 0) {
                memberTicket = pendingTickets[0];
            }
            if (memberTicket) ticketSource = "pending_invites";
        }

        // NO TICKET = Can't check in
        if (!memberTicket) {
            // Check if they have tickets for other events
            const { data: anyTickets } = await supabase
                .from("user_event_tickets")
                .select("event_id")
                .eq("user_id", user.id)
                .eq("status", "VALID")
                .limit(1);

            if (anyTickets && anyTickets.length > 0 && eventId) {
                const { data: ticketEvent } = await supabase
                    .from("garo_events")
                    .select("name")
                    .eq("id", anyTickets[0].event_id)
                    .single();
                const { data: selectedEvent } = await supabase
                    .from("garo_events")
                    .select("name")
                    .eq("id", eventId)
                    .single();

                return NextResponse.json({
                    error: "WRONG EVENT",
                    message: "Ticket is for a different event",
                    status: "WRONG_EVENT",
                    details: `Ticket: ${ticketEvent?.name || 'Unknown'} | Scanner: ${selectedEvent?.name || 'Unknown'}`
                }, { status: 403 });
            }

            return NextResponse.json({
                error: "NO TICKET",
                message: "You need an event ticket to check in. Ask for an invite!",
                status: "NO_TICKET",
                currentTier: user.tier,
                attendanceCount: user.attendance_count
            }, { status: 403 });
        }

        // Mark ticket as USED based on source
        if (ticketSource === "user_event_tickets") {
            await supabase
                .from("user_event_tickets")
                .update({ status: "USED", used_at: new Date().toISOString() })
                .eq("id", memberTicket.id);
        } else {
            await supabase
                .from("pending_invites")
                .update({ status: "USED", claimed_at: new Date().toISOString() })
                .eq("id", memberTicket.id);
        }

        // Increment Attendance
        const newCount = (user.attendance_count || 0) + 1;
        const newXP = (user.xp || 0) + 100; // 100 XP per check-in

        await supabase
            .from("garo_users")
            .update({
                attendance_count: newCount,
                last_attendance: new Date().toISOString(),
                xp: newXP
            })
            .eq("id", user.id);

        // Log Attendance
        await supabase
            .from("garo_attendance_logs")
            .insert([{
                user_id: user.id,
                location: location || "The Roof",
                event_date: new Date().toISOString()
            }]);

        // Check Tier Upgrade
        let upgradedTier = null;
        try {
            upgradedTier = await checkAndUpgradeTier(user.id, user.tier, newCount, user.last_mint_address);
        } catch (tierError) {
            console.error("Tier Upgrade Error:", tierError);
        }

        // Get event_id from ticket
        const ticketEventId = memberTicket.event_id;

        // Mint POAP NFT for this event
        let poapMintAddress = null;
        if (ticketEventId) {
            const { data: eventData } = await supabase
                .from("garo_events")
                .select("name, date")
                .eq("id", ticketEventId)
                .single();

            if (eventData) {
                try {
                    const admin = new SolanaAdmin();
                    poapMintAddress = await admin.mintEventPOAP(
                        user.wallet_address,
                        ticketEventId,
                        eventData.name,
                        eventData.date
                    );
                    console.log(`🏆 POAP NFT minted for member: ${poapMintAddress}`);
                } catch (poapError) {
                    console.error("Member POAP mint failed:", poapError);
                }
            }

            // Record in database
            await supabase
                .from("event_attendance")
                .upsert([{
                    user_id: user.id,
                    event_id: ticketEventId,
                    checked_in_at: new Date().toISOString(),
                    nft_mint_address: poapMintAddress
                }], { onConflict: 'user_id,event_id' });
            console.log(`🏆 POAP recorded for member at event ${ticketEventId}`);
        }

        const finalTier = upgradedTier || user.tier;
        const tierNames = { 1: "INITIATE", 2: "RESIDENT", 3: "FAMILY" };

        return NextResponse.json({
            success: true,
            status: upgradedTier ? "LEVEL_UP" : "ACCESS_GRANTED",
            message: upgradedTier ? `🚀 LEVEL UP! Now ${tierNames[finalTier as keyof typeof tierNames]}` : "✅ ACCESS GRANTED",
            newAttendanceCount: newCount,
            newTier: finalTier,
            tierName: tierNames[finalTier as keyof typeof tierNames] || "INITIATE",
            upgraded: !!upgradedTier,
            reward: 100
        });

    } catch (error) {
        console.error("Check-in Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
