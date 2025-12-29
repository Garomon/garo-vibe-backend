import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        const body = await req.json();
        const { wallet_address, energy_score } = body;

        if (!wallet_address) {
            return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
        }

        // 2. Validate Energy Score (Basic anti-cheat)
        if (energy_score < 80) {
            return NextResponse.json({ error: "Vibe check failed. Energy too low." }, { status: 400 });
        }

        // 3. Get User
        const { data: user, error: userError } = await supabase
            .from("garo_users")
            .select("id, xp, last_rave_at")
            .eq("wallet_address", wallet_address)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 4. Award $VIBE (XP)
        // ECONOMY CONTROL: State Capitalist Model
        // - Live Event: Uncapped (100 XP)
        // - Training Mode: Capped (10 XP per day)

        let REWARD_AMOUNT = 0;

        // Check for Active Event
        const { data: activeEvents } = await supabase
            .from("garo_events")
            .select("id")
            .eq("status", "ACTIVE")
            .limit(1);

        const isLive = activeEvents && activeEvents.length > 0;

        if (isLive) {
            // Live Event: Full Rewards (Uncapped)
            REWARD_AMOUNT = 100;
        } else {
            // Training Mode: Check Daily Limit
            const lastRave = user.last_rave_at ? new Date(user.last_rave_at) : null;
            const now = new Date();

            // Check if last rave was today
            const isToday = lastRave &&
                lastRave.getDate() === now.getDate() &&
                lastRave.getMonth() === now.getMonth() &&
                lastRave.getFullYear() === now.getFullYear();

            if (isToday) {
                return NextResponse.json({
                    success: false,
                    message: "Daily training limit reached (10/10). Rest, or find a Live Event.",
                    reward: 0
                });
            }

            REWARD_AMOUNT = 10;
        }

        // Update User (XP + Timestamp)
        const { error: updateError } = await supabase
            .from("garo_users")
            .update({
                xp: (user.xp || 0) + REWARD_AMOUNT,
                last_rave_at: new Date().toISOString()
            })
            .eq("id", user.id);

        if (updateError) throw updateError;

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
