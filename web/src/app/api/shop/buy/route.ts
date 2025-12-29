import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Purchase an item
export async function POST(request: NextRequest) {
    try {
        const { item_id, wallet_address } = await request.json();

        if (!item_id || !wallet_address) {
            return NextResponse.json({ success: false, error: "Missing item_id or wallet_address" }, { status: 400 });
        }

        // 1. Get user
        const { data: user, error: userError } = await supabase
            .from("garo_users")
            .select("id, xp")
            .eq("wallet_address", wallet_address)
            .single();

        if (userError || !user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // 2. Get item
        const { data: item, error: itemError } = await supabase
            .from("shop_items")
            .select("*")
            .eq("id", item_id)
            .eq("active", true)
            .single();

        if (itemError || !item) {
            return NextResponse.json({ success: false, error: "Item not found or inactive" }, { status: 404 });
        }

        // 3. Check balance
        if (user.xp < item.cost) {
            return NextResponse.json({
                success: false,
                error: "Insufficient $VIBE balance",
                required: item.cost,
                current: user.xp
            }, { status: 400 });
        }

        // 4. Check stock
        if (item.stock !== -1 && item.stock <= 0) {
            return NextResponse.json({ success: false, error: "Item out of stock" }, { status: 400 });
        }

        // 5. Deduct balance (transactional logic)
        const newBalance = user.xp - item.cost;
        const { error: deductError } = await supabase
            .from("garo_users")
            .update({ xp: newBalance })
            .eq("id", user.id);

        if (deductError) {
            throw deductError;
        }

        // 6. Decrement stock if not unlimited
        if (item.stock !== -1) {
            await supabase
                .from("shop_items")
                .update({ stock: item.stock - 1 })
                .eq("id", item.id);
        }

        // 7. Add to user inventory
        const { error: inventoryError } = await supabase
            .from("user_inventory")
            .insert({
                user_id: user.id,
                item_id: item.id
            });

        if (inventoryError) {
            // Rollback balance deduction on failure
            await supabase
                .from("garo_users")
                .update({ xp: user.xp })
                .eq("id", user.id);
            throw inventoryError;
        }

        return NextResponse.json({
            success: true,
            message: `You acquired "${item.name}"!`,
            new_balance: newBalance,
            item: {
                id: item.id,
                name: item.name,
                type: item.type
            }
        });

    } catch (error) {
        console.error("Purchase error:", error);
        return NextResponse.json({ success: false, error: "Purchase failed" }, { status: 500 });
    }
}
