import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List user's inventory
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const wallet_address = searchParams.get("wallet_address");

        if (!wallet_address) {
            return NextResponse.json({ error: "Missing wallet_address" }, { status: 400 });
        }

        // Get user ID
        const { data: user, error: userError } = await supabase
            .from("garo_users")
            .select("id")
            .eq("wallet_address", wallet_address)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get inventory with item details
        const { data: inventory, error: inventoryError } = await supabase
            .from("user_inventory")
            .select(`
                id,
                purchased_at,
                redeemed,
                shop_items (
                    id,
                    name,
                    description,
                    image_url,
                    type
                )
            `)
            .eq("user_id", user.id)
            .order("purchased_at", { ascending: false });

        if (inventoryError) throw inventoryError;

        return NextResponse.json({ inventory });
    } catch (error) {
        console.error("Error fetching inventory:", error);
        return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
    }
}
