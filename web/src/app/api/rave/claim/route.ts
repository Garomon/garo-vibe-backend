import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        // 1. Verify Auth (Custom header or implicit session if we were using it, 
        // but here we likely rely on the client sending the user ID or wallet).
        // For better security, we should verify the wallet signature, but for this MVP:
        // We will accept the wallet_address in the body (and assume frontend integrity for now).
        // Ideally, we'd use a legitimate session/auth token.

        const body = await req.json();
        const { wallet_address, energy_score } = body;

        if (!wallet_address) {
            return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
        }

        // 2. Validate Energy Score (Basic anti-cheat)
        // If score is too low, reject
        if (energy_score < 80) {
            return NextResponse.json({ error: "Vibe check failed. Energy too low." }, { status: 400 });
        }

        // 3. Rate Limiting / Cooldown
        // (For MVP, we skip complex Redis rate limiting, but we could check the last 'claim' timestamp if we tracked it)
        // We will just verify the user exists first.
        const { data: user, error: userError } = await supabase
            .from("garo_users")
            .select("id, xp")
            .eq("wallet_address", wallet_address)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 4. Award $VIBE (XP)
        // Using the RPC function if it exists, or direct update
        const REWARD_AMOUNT = 100;

        // Using direct update for simplicity if RPC not deployed
        const { error: updateError } = await supabase.rpc('increment_xp', {
            row_id: user.id,
            amount: REWARD_AMOUNT
        });

        // Fallback if RPC doesn't exist (though migration should create it)
        if (updateError) {
            console.log("RPC failed, trying direct update", updateError);
            const { error: directError } = await supabase
                .from("garo_users")
                .update({ xp: (user.xp || 0) + REWARD_AMOUNT })
                .eq("id", user.id);

            if (directError) {
                throw directError;
            }
        }

        return NextResponse.json({
            success: true,
            message: "Vibe Captured!",
            reward: REWARD_AMOUNT,
            new_balance: (user.xp || 0) + REWARD_AMOUNT
        });

    } catch (error) {
        console.error("Claim error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
