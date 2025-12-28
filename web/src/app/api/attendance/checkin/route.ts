import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";
import { checkAndUpgradeTier } from "../../../../lib/dynamicNft";
import { SolanaAdmin } from "../../../../lib/solanaAdmin";

/**
 * TRANSMUTATION LOGIC:
 * 1. Scan QR → Get wallet address
 * 2. Check if user has pending Entry Ticket
 * 3. If has Entry Ticket → "Burn" it (mark as USED) → Mint PROOF_OF_RAVE (Tier 1)
 * 4. If already has PROOF → Increment attendance → Check tier upgrade
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
            // Get all pending Entry Tickets for this ghost
            const { data: pendingTickets } = await supabase
                .from("pending_invites")
                .select("*")
                .eq("email", user.email?.toLowerCase())
                .eq("status", "PENDING");

            // Find the ticket that matches the selected event (if eventId provided)
            let entryTicket = null;
            if (eventId && pendingTickets) {
                entryTicket = pendingTickets.find(t => t.event_id === eventId);
            } else if (pendingTickets && pendingTickets.length > 0) {
                // No specific event selected, use the first ticket
                entryTicket = pendingTickets[0];
            }

            if (!entryTicket) {
                // Check if they have tickets for other events
                if (pendingTickets && pendingTickets.length > 0 && eventId) {
                    // They have tickets, but not for THIS event
                    const { data: ticketEvent } = await supabase
                        .from("garo_events")
                        .select("name")
                        .eq("id", pendingTickets[0].event_id)
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

            // Mark Entry Ticket as USED (burn)
            await supabase
                .from("pending_invites")
                .update({
                    status: "USED",
                    claimed_at: new Date().toISOString(),
                    claimed_by_wallet: walletAddress
                })
                .eq("id", entryTicket.id);

            // Create Solana Admin for minting
            const admin = new SolanaAdmin();

            // Mint PROOF_OF_RAVE NFT (Tier 1)
            let mintAddress = null;
            try {
                mintAddress = await admin.mintProofOfRave(walletAddress, 1);
                console.log(`✨ PROOF_OF_RAVE minted: ${mintAddress}`);
            } catch (mintError) {
                console.error("Mint failed:", mintError);
                // Continue anyway - we'll retry later
            }

            // Update user to Tier 1 member
            await supabase
                .from("garo_users")
                .update({
                    tier: 1,
                    attendance_count: 1,
                    last_attendance: new Date().toISOString(),
                    last_mint_address: mintAddress
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

            // Record POAP (event attendance for collectible) + MINT NFT
            let poapMintAddress = null;
            if (entryTicket.event_id) {
                // Fetch event details for POAP
                const { data: eventData } = await supabase
                    .from("garo_events")
                    .select("name, date")
                    .eq("id", entryTicket.event_id)
                    .single();

                // Mint POAP NFT
                if (eventData) {
                    try {
                        poapMintAddress = await admin.mintEventPOAP(
                            walletAddress,
                            entryTicket.event_id,
                            eventData.name,
                            eventData.date
                        );
                        console.log(`🏆 POAP NFT minted: ${poapMintAddress}`);
                    } catch (poapError) {
                        console.error("POAP mint failed:", poapError);
                        // Continue anyway - record in DB
                    }
                }

                // Record in database
                await supabase
                    .from("event_attendance")
                    .upsert([{
                        user_id: user.id,
                        event_id: entryTicket.event_id,
                        checked_in_at: new Date().toISOString(),
                        nft_mint_address: poapMintAddress
                    }], { onConflict: 'user_id,event_id' });
                console.log(`🏆 POAP recorded for event ${entryTicket.event_id}`);
            }

            return NextResponse.json({
                success: true,
                status: "TRANSMUTATION",
                message: "🎉 Welcome to the Family! Entry Ticket → Proof of Rave",
                newTier: 1,
                tierName: "INITIATE",
                isFirstTime: true,
                mintAddress
            });
        }

        // EXISTING MEMBER: Check-in flow
        // Members MUST have a pending ticket to check in (validates they were invited to this event)

        // Get all pending tickets for this member
        const { data: pendingTickets } = await supabase
            .from("pending_invites")
            .select("id, event_id")
            .eq("email", user.email?.toLowerCase())
            .eq("status", "PENDING");

        // Find the ticket that matches the selected event (if eventId provided)
        let memberTicket = null;
        if (eventId && pendingTickets) {
            memberTicket = pendingTickets.find(t => t.event_id === eventId);
        } else if (pendingTickets && pendingTickets.length > 0) {
            // No specific event selected, use the first ticket
            memberTicket = pendingTickets[0];
        }

        // NO TICKET = Can't check in (they need an invite for each event)
        if (!memberTicket) {
            // Check if they have tickets for other events
            if (pendingTickets && pendingTickets.length > 0 && eventId) {
                // They have tickets, but not for THIS event
                const { data: ticketEvent } = await supabase
                    .from("garo_events")
                    .select("name")
                    .eq("id", pendingTickets[0].event_id)
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

        // Rate Limiting Check (1 hour cooldown for same ticket)
        if (user.last_attendance) {
            const lastTime = new Date(user.last_attendance).getTime();
            const now = new Date().getTime();
            const oneHour = 60 * 60 * 1000;
            const isSimulated = location?.includes("SIMULATE");

            if (!isSimulated && (now - lastTime < oneHour)) {
                return NextResponse.json({
                    error: "Already checked in recently. Chill, enjoy the vibe.",
                    status: "COOLDOWN",
                    nextCheckIn: new Date(lastTime + oneHour).toISOString()
                }, { status: 429 });
            }
        }

        // Mark ticket as USED
        await supabase
            .from("pending_invites")
            .update({ status: "USED", claimed_at: new Date().toISOString() })
            .eq("id", memberTicket.id);

        // Increment Attendance
        const newCount = (user.attendance_count || 0) + 1;

        await supabase
            .from("garo_users")
            .update({
                attendance_count: newCount,
                last_attendance: new Date().toISOString()
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

        // Mint POAP NFT for this event
        let poapMintAddress = null;
        if (memberTicket.event_id) {
            const { data: eventData } = await supabase
                .from("garo_events")
                .select("name, date")
                .eq("id", memberTicket.event_id)
                .single();

            if (eventData) {
                try {
                    const admin = new SolanaAdmin();
                    poapMintAddress = await admin.mintEventPOAP(
                        user.wallet_address,
                        memberTicket.event_id,
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
                    event_id: memberTicket.event_id,
                    checked_in_at: new Date().toISOString(),
                    nft_mint_address: poapMintAddress
                }], { onConflict: 'user_id,event_id' });
            console.log(`🏆 POAP recorded for member at event ${memberTicket.event_id}`);
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
            upgraded: !!upgradedTier
        });

    } catch (error) {
        console.error("Check-in Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
