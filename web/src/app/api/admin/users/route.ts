import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

// GET: List all users with pagination and search
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        let query = supabase
            .from("garo_users")
            .select("id, email, wallet_address, tier, active, attendance_count, created_at", { count: 'exact' })
            .order("created_at", { ascending: false });

        // Apply search filter
        if (search) {
            query = query.or(`email.ilike.%${search}%,wallet_address.ilike.%${search}%`);
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data: users, error, count } = await query;

        if (error) {
            console.error("Admin Users Fetch Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Mask sensitive data
        const maskedUsers = users?.map(user => ({
            ...user,
            email: user.email ? maskEmail(user.email) : null,
            wallet_address: maskWallet(user.wallet_address)
        }));

        return NextResponse.json({
            users: maskedUsers,
            total: count,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        });

    } catch (error) {
        console.error("Admin Users Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Helper: Mask email (g***@gmail.com)
function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}${local[1]}***@${domain}`;
}

// Helper: Mask wallet (ABC...XYZ)
function maskWallet(wallet: string): string {
    if (wallet.length <= 8) return wallet;
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}
