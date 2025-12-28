import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

export async function GET() {
    try {
        // Get total users
        const { count: totalUsers } = await supabase
            .from("garo_users")
            .select("*", { count: "exact", head: true });

        // Get tier counts
        const { count: tier1 } = await supabase
            .from("garo_users")
            .select("*", { count: "exact", head: true })
            .eq("tier", 1);

        const { count: tier2 } = await supabase
            .from("garo_users")
            .select("*", { count: "exact", head: true })
            .eq("tier", 2);

        const { count: tier3 } = await supabase
            .from("garo_users")
            .select("*", { count: "exact", head: true })
            .eq("tier", 3);

        return NextResponse.json({
            totalUsers: totalUsers || 0,
            tier1: tier1 || 0,
            tier2: tier2 || 0,
            tier3: tier3 || 0,
        });

    } catch (error) {
        console.error("Stats Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
