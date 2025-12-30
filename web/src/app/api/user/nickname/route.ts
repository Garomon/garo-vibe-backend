import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT: Update user nickname
export async function PUT(request: NextRequest) {
    try {
        const { wallet_address, nickname } = await request.json();

        if (!wallet_address || !nickname) {
            return NextResponse.json({ success: false, error: "Missing wallet_address or nickname" }, { status: 400 });
        }

        // Validate nickname
        const trimmedNickname = nickname.trim();

        if (trimmedNickname.length < 3) {
            return NextResponse.json({ success: false, error: "Nickname must be at least 3 characters" }, { status: 400 });
        }

        if (trimmedNickname.length > 12) {
            return NextResponse.json({ success: false, error: "Nickname must be 12 characters or less" }, { status: 400 });
        }

        // Only allow alphanumeric and underscore
        if (!/^[a-zA-Z0-9_]+$/.test(trimmedNickname)) {
            return NextResponse.json({ success: false, error: "Nickname can only contain letters, numbers, and underscores" }, { status: 400 });
        }

        // Check if nickname is already taken
        const { data: existing } = await supabase
            .from("garo_users")
            .select("id")
            .eq("nickname", trimmedNickname)
            .neq("wallet_address", wallet_address)
            .single();

        if (existing) {
            return NextResponse.json({ success: false, error: "Nickname already taken" }, { status: 400 });
        }

        // Update nickname
        const { error } = await supabase
            .from("garo_users")
            .update({ nickname: trimmedNickname })
            .eq("wallet_address", wallet_address);

        if (error) throw error;

        return NextResponse.json({ success: true, nickname: trimmedNickname });
    } catch (error) {
        console.error("Nickname update error:", error);
        return NextResponse.json({ success: false, error: "Failed to update nickname" }, { status: 500 });
    }
}

// GET: Get user's current nickname
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const wallet_address = searchParams.get("wallet_address");

        if (!wallet_address) {
            return NextResponse.json({ error: "Missing wallet_address" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("garo_users")
            .select("nickname, wallet_address")
            .eq("wallet_address", wallet_address)
            .single();

        if (error || !data) {
            return NextResponse.json({ nickname: null });
        }

        return NextResponse.json({
            nickname: data.nickname || `User_${wallet_address.slice(-4)}`,
            hasCustomNickname: !!data.nickname
        });
    } catch (error) {
        console.error("Get nickname error:", error);
        return NextResponse.json({ error: "Failed to fetch nickname" }, { status: 500 });
    }
}
