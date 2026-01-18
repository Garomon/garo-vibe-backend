import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/badges?wallet=xxx
 * Get user's badges and check for new ones
 */
export async function GET(request: NextRequest) {
    try {
        const wallet = request.nextUrl.searchParams.get("wallet");
        const checkNew = request.nextUrl.searchParams.get("check") === "true";

        if (!wallet) {
            return NextResponse.json(
                { success: false, error: "wallet parameter required" },
                { status: 400 }
            );
        }

        // Get user
        const { data: user, error: userError } = await supabase
            .from("garo_users")
            .select("id")
            .eq("wallet_address", wallet)
            .single();

        if (userError || !user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Check and grant new badges if requested
        let newBadges: { badge_id: string; badge_name: string }[] = [];
        if (checkNew) {
            const { data: granted } = await supabase.rpc("check_and_grant_badges", {
                p_user_id: user.id
            });
            newBadges = granted || [];
        }

        // Get user's badges with badge details
        const { data: userBadges, error: badgesError } = await supabase
            .from("user_badges")
            .select(`
                id,
                awarded_at,
                award_reason,
                badges!inner (
                    id,
                    name,
                    description,
                    icon,
                    category,
                    rarity
                )
            `)
            .eq("user_id", user.id)
            .order("awarded_at", { ascending: false });

        if (badgesError) {
            console.error("Error fetching badges:", badgesError);
        }

        // Get all available badges for comparison
        const { data: allBadges } = await supabase
            .from("badges")
            .select("id, name, description, icon, category, rarity, sort_order")
            .eq("active", true)
            .order("sort_order", { ascending: true });

        // Format response
        const earnedBadgeIds = new Set(userBadges?.map(ub => (ub as any).badges.id) || []);

        return NextResponse.json({
            success: true,
            earnedBadges: userBadges?.map(ub => ({
                id: (ub as any).badges.id,
                name: (ub as any).badges.name,
                description: (ub as any).badges.description,
                icon: (ub as any).badges.icon,
                category: (ub as any).badges.category,
                rarity: (ub as any).badges.rarity,
                awardedAt: ub.awarded_at,
                reason: ub.award_reason
            })) || [],
            allBadges: allBadges?.map(b => ({
                ...b,
                earned: earnedBadgeIds.has(b.id)
            })) || [],
            newBadges: newBadges.map(nb => ({
                id: nb.badge_id,
                name: nb.badge_name
            })),
            stats: {
                total: allBadges?.length || 0,
                earned: earnedBadgeIds.size
            }
        });

    } catch (error) {
        console.error("Badges API error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/badges
 * Grant a badge to a user (admin only)
 *
 * Body: { userId, badgeId, reason? }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, badgeId, reason, adminWallet } = body;

        if (!userId || !badgeId) {
            return NextResponse.json(
                { success: false, error: "userId and badgeId required" },
                { status: 400 }
            );
        }

        // Get admin user if provided
        let adminId = null;
        if (adminWallet) {
            const { data: admin } = await supabase
                .from("garo_users")
                .select("id")
                .eq("wallet_address", adminWallet)
                .single();
            adminId = admin?.id;
        }

        // Grant badge
        const { data: granted, error } = await supabase.rpc("grant_badge", {
            p_user_id: userId,
            p_badge_id: badgeId,
            p_awarded_by: adminId,
            p_reason: reason || null
        });

        if (error) {
            console.error("Error granting badge:", error);
            return NextResponse.json(
                { success: false, error: "Failed to grant badge" },
                { status: 500 }
            );
        }

        // Log VIBE reward if badge grants VIBE
        const { data: badge } = await supabase
            .from("badges")
            .select("name, rarity")
            .eq("id", badgeId)
            .single();

        // Award VIBE based on rarity
        const vibeRewards: Record<string, number> = {
            common: 25,
            rare: 50,
            epic: 100,
            legendary: 200
        };

        const vibeAmount = vibeRewards[badge?.rarity || "common"] || 25;

        await supabase.rpc("log_vibe_transaction", {
            p_user_id: userId,
            p_amount: vibeAmount,
            p_type: "BADGE_EARNED",
            p_description: `Earned badge: ${badge?.name || badgeId}`,
            p_reference_type: "badge",
            p_reference_id: null // badges use TEXT id, not UUID
        });

        return NextResponse.json({
            success: true,
            granted: granted,
            badge: badge,
            vibeAwarded: vibeAmount
        });

    } catch (error) {
        console.error("Grant badge error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
