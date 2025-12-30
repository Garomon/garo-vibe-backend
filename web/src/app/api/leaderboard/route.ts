import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch leaderboard (Top 50 + current user rank)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const wallet_address = searchParams.get("wallet_address");

        // Get top 50 by XP
        const { data: top50, error } = await supabase
            .from("garo_users")
            .select("id, wallet_address, nickname, xp")
            .order("xp", { ascending: false })
            .limit(50);

        if (error) throw error;

        // Format with ranks and fallback nicknames
        const leaderboard = (top50 || []).map((user, index) => ({
            rank: index + 1,
            nickname: user.nickname || `User_${user.wallet_address?.slice(-4) || user.id.slice(-4)}`,
            xp: user.xp || 0,
            isCurrentUser: wallet_address ? user.wallet_address === wallet_address : false
        }));

        // Get current user's rank if wallet provided
        let currentUser = null;
        let nextRankUser = null;

        if (wallet_address) {
            // Get user's XP
            const { data: userData } = await supabase
                .from("garo_users")
                .select("id, nickname, xp, wallet_address")
                .eq("wallet_address", wallet_address)
                .single();

            if (userData) {
                // Count how many users have more XP
                const { count } = await supabase
                    .from("garo_users")
                    .select("id", { count: "exact", head: true })
                    .gt("xp", userData.xp || 0);

                const userRank = (count || 0) + 1;

                currentUser = {
                    rank: userRank,
                    nickname: userData.nickname || `User_${wallet_address.slice(-4)}`,
                    xp: userData.xp || 0
                };

                // Get the user just above them (to beat)
                if (userRank > 1) {
                    const { data: nextUser } = await supabase
                        .from("garo_users")
                        .select("nickname, xp, wallet_address")
                        .gt("xp", userData.xp || 0)
                        .order("xp", { ascending: true })
                        .limit(1)
                        .single();

                    if (nextUser) {
                        nextRankUser = {
                            nickname: nextUser.nickname || `User_${nextUser.wallet_address?.slice(-4)}`,
                            xp: nextUser.xp,
                            xpToPass: (nextUser.xp - (userData.xp || 0)) + 1
                        };
                    }
                }
            }
        }

        return NextResponse.json({
            leaderboard,
            currentUser,
            nextRankUser
        });
    } catch (error) {
        console.error("Leaderboard error:", error);
        return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }
}
