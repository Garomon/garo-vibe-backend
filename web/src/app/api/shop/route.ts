import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List all active shop items
export async function GET() {
    try {
        const { data, error } = await supabase
            .from("shop_items")
            .select("*")
            .eq("active", true)
            .order("cost", { ascending: true });

        if (error) throw error;

        return NextResponse.json({ items: data });
    } catch (error) {
        console.error("Error fetching shop items:", error);
        return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
    }
}
