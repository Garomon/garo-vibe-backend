import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/profile/[nickname]
 * Get public profile data for a user by nickname
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ nickname: string }> }
) {
    try {
        const { nickname } = await params;

        if (!nickname) {
            return NextResponse.json(
                { success: false, error: "Nickname required" },
                { status: 400 }
            );
        }

        // Get user by nickname
        const { data: user, error: userError } = await supabase
            .from("garo_users")
            .select(`
                id,
                nickname,
                tier,
                xp,
                attendance_count,
                avatar_url,
                instagram,
                first_event_date,
                is_og,
                created_at
            `)
            .eq("nickname", nickname.toLowerCase())
            .single();

        if (userError || !user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Get event attendance (POAPs)
        const { data: attendance } = await supabase
            .from("event_attendance")
            .select(`
                id,
                checked_in_at,
                nft_mint_address,
                garo_events!inner (
                    id,
                    name,
                    date,
                    location
                )
            `)
            .eq("user_id", user.id)
            .order("checked_in_at", { ascending: false })
            .limit(10);

        // Get leaderboard position
        const { data: allUsers } = await supabase
            .from("garo_users")
            .select("id, xp")
            .gt("xp", 0)
            .order("xp", { ascending: false });

        const leaderboardPosition = allUsers?.findIndex(u => u.id === user.id) ?? -1;

        // Get referral count
        const { count: referralCount } = await supabase
            .from("garo_users")
            .select("id", { count: "exact" })
            .eq("invited_by", user.id);

        // Get user badges
        const { data: userBadges } = await supabase
            .from("user_badges")
            .select(`
                id,
                awarded_at,
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

        // Calculate "member since" info
        const memberSince = user.first_event_date || user.created_at;
        const memberSinceDate = new Date(memberSince);
        const now = new Date();
        const daysSinceMember = Math.floor((now.getTime() - memberSinceDate.getTime()) / (1000 * 60 * 60 * 24));

        // Tier names
        const tierNames: Record<number, string> = {
            0: "GHOST",
            1: "INITIATE",
            2: "RESIDENT",
            3: "FAMILY"
        };

        return NextResponse.json({
            success: true,
            profile: {
                nickname: user.nickname,
                tier: user.tier,
                tierName: tierNames[user.tier] || "GHOST",
                vibeBalance: user.xp || 0,
                eventsAttended: user.attendance_count || 0,
                avatarUrl: user.avatar_url,
                instagram: user.instagram,
                isOG: user.is_og || false,
                memberSince: memberSince,
                daysSinceMember,
                leaderboardPosition: leaderboardPosition >= 0 ? leaderboardPosition + 1 : null,
                referrals: referralCount || 0
            },
            events: attendance?.map(a => ({
                id: a.id,
                checkedInAt: a.checked_in_at,
                nftMint: a.nft_mint_address,
                event: (a as any).garo_events
            })) || [],
            badges: userBadges?.map(ub => ({
                id: (ub as any).badges.id,
                name: (ub as any).badges.name,
                description: (ub as any).badges.description,
                icon: (ub as any).badges.icon,
                category: (ub as any).badges.category,
                rarity: (ub as any).badges.rarity,
                awardedAt: ub.awarded_at
            })) || []
        });

    } catch (error) {
        console.error("Profile API error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/profile/[nickname]
 * Update own profile (requires wallet verification)
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ nickname: string }> }
) {
    try {
        const { nickname } = await params;
        const body = await request.json();
        const { walletAddress, newNickname, instagram, avatarUrl } = body;

        if (!walletAddress) {
            return NextResponse.json(
                { success: false, error: "Wallet address required" },
                { status: 400 }
            );
        }

        // Verify user owns this profile
        const { data: user, error: userError } = await supabase
            .from("garo_users")
            .select("id, nickname")
            .eq("wallet_address", walletAddress)
            .single();

        if (userError || !user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Check if user owns this nickname (or is setting first time)
        if (user.nickname && user.nickname !== nickname.toLowerCase()) {
            return NextResponse.json(
                { success: false, error: "You can only update your own profile" },
                { status: 403 }
            );
        }

        // Build update object
        const updates: Record<string, any> = {};

        if (newNickname !== undefined) {
            // Validate nickname
            const cleanNickname = newNickname.toLowerCase().trim();
            if (cleanNickname.length < 3 || cleanNickname.length > 20) {
                return NextResponse.json(
                    { success: false, error: "Nickname must be 3-20 characters" },
                    { status: 400 }
                );
            }
            if (!/^[a-z0-9_]+$/.test(cleanNickname)) {
                return NextResponse.json(
                    { success: false, error: "Nickname can only contain letters, numbers, and underscores" },
                    { status: 400 }
                );
            }

            // Check if nickname is taken
            if (cleanNickname !== user.nickname) {
                const { data: existing } = await supabase
                    .from("garo_users")
                    .select("id")
                    .eq("nickname", cleanNickname)
                    .single();

                if (existing) {
                    return NextResponse.json(
                        { success: false, error: "Nickname already taken" },
                        { status: 400 }
                    );
                }
            }

            updates.nickname = cleanNickname;
        }

        if (instagram !== undefined) {
            // Clean Instagram handle
            let cleanInsta = instagram.trim();
            if (cleanInsta.startsWith("@")) {
                cleanInsta = cleanInsta.substring(1);
            }
            updates.instagram = cleanInsta || null;
        }

        if (avatarUrl !== undefined) {
            updates.avatar_url = avatarUrl || null;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { success: false, error: "No updates provided" },
                { status: 400 }
            );
        }

        // Update profile
        const { error: updateError } = await supabase
            .from("garo_users")
            .update(updates)
            .eq("id", user.id);

        if (updateError) {
            console.error("Profile update error:", updateError);
            return NextResponse.json(
                { success: false, error: "Failed to update profile" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Profile updated successfully",
            updates
        });

    } catch (error) {
        console.error("Profile update error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
