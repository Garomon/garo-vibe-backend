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
            // Proceed to create if error is just 'not found'
        }

        let isNewUser = false;

        if (!user) {
            // Check for pending invite by email (just for logging, NOT claiming)
            const userEmail = (email || userInfo?.email || "").toLowerCase().trim();

            if (userEmail) {
                const { data: pendingInvite } = await supabase
                    .from("pending_invites")
                    .select("*")
                    .eq("email", userEmail)
                    .eq("status", "PENDING")
                    .single();

                if (pendingInvite) {
                    console.log(`User ${userEmail} has pending Entry Ticket - will be claimed at Scanner`);
                }
            }

            // Create new GHOST user (no tier, no NFT until Scanner validates)
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
        }

        // NO AUTO-MINTING - Users are "Ghosts" until they claim an Entry Ticket
        // The Scanner will handle the Transmutation: Entry Ticket → Proof of Rave

        // Check for Oxidation (Lazy Decay)
        if (!isNewUser && user) {
            try {
                const newTier = await checkOxidation(user.id, user.tier, user.last_attendance);
                if (newTier) {
                    console.log(`User ${user.id} decayed to Tier ${newTier}`);
                    user.tier = newTier; // Update local user object to reflect new tier immediately
                }
            } catch (e) {
                console.error("Oxidation check failed:", e);
            }
        }

        return NextResponse.json({
            success: true,
            user,
            isNew: isNewUser,
            message: isNewUser ? "Welcome Home" : "Welcome Back"
        });

    } catch (error) {
        console.error("Login API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
