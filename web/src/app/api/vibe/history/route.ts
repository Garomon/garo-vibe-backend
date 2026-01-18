import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/vibe/history?wallet=xxx&limit=20&offset=0
 * Get VIBE transaction history for a user
 */
export async function GET(request: NextRequest) {
    try {
        const wallet = request.nextUrl.searchParams.get("wallet");
        const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
        const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");

        if (!wallet) {
            return NextResponse.json(
                { success: false, error: "wallet parameter required" },
                { status: 400 }
            );
        }

        // Get user by wallet
        const { data: user, error: userError } = await supabase
            .from("garo_users")
            .select("id, xp")
            .eq("wallet_address", wallet)
            .single();

        if (userError || !user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Get transactions
        const { data: transactions, error: txError, count } = await supabase
            .from("vibe_transactions")
            .select("*", { count: "exact" })
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (txError) {
            console.error("Error fetching transactions:", txError);
            return NextResponse.json(
                { success: false, error: "Failed to fetch transactions" },
                { status: 500 }
            );
        }

        // Get summary stats
        const { data: stats } = await supabase
            .from("vibe_transactions")
            .select("amount, type")
            .eq("user_id", user.id);

        const totalEarned = stats?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0;
        const totalSpent = Math.abs(stats?.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0) || 0);

        // Count by type
        const typeCounts: Record<string, number> = {};
        stats?.forEach(t => {
            typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
        });

        return NextResponse.json({
            success: true,
            currentBalance: user.xp || 0,
            totalEarned,
            totalSpent,
            transactionCount: count || 0,
            typeCounts,
            transactions: transactions || [],
            pagination: {
                limit,
                offset,
                hasMore: (offset + limit) < (count || 0)
            }
        });

    } catch (error) {
        console.error("Vibe history error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/vibe/log
 * Manually log a VIBE transaction (admin only in future)
 *
 * Body: { userId, amount, type, description?, referenceType?, referenceId? }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, amount, type, description, referenceType, referenceId } = body;

        if (!userId || amount === undefined || !type) {
            return NextResponse.json(
                { success: false, error: "userId, amount, and type are required" },
                { status: 400 }
            );
        }

        // Use the database function
        const { data, error } = await supabase.rpc("log_vibe_transaction", {
            p_user_id: userId,
            p_amount: amount,
            p_type: type,
            p_description: description || null,
            p_reference_type: referenceType || null,
            p_reference_id: referenceId || null
        });

        if (error) {
            console.error("Error logging transaction:", error);
            return NextResponse.json(
                { success: false, error: "Failed to log transaction" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            transactionId: data
        });

    } catch (error) {
        console.error("Vibe log error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
