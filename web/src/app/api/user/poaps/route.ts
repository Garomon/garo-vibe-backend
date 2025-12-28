import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const email = searchParams.get("email");

        if (!userId && !email) {
            return NextResponse.json({ error: "userId or email required" }, { status: 400 });
        }

        // Get user ID from email if not provided
        let targetUserId = userId;
        if (!targetUserId && email) {
            const { data: user } = await supabase
                .from("garo_users")
                .select("id")
                .eq("email", email.toLowerCase().trim())
                .single();

            if (!user) {
                return NextResponse.json({ poaps: [] });
            }
            targetUserId = user.id;
        }

        // Fetch all event attendances with event details
        const { data: attendances, error } = await supabase
            .from("event_attendance")
            .select(`
                id,
                checked_in_at,
                nft_mint_address,
                garo_events (
                    id,
                    name,
                    date,
                    time,
                    location
                )
            `)
            .eq("user_id", targetUserId)
            .order("checked_in_at", { ascending: false });

        if (error) {
            console.error("POAPs fetch error:", error);
            return NextResponse.json({ poaps: [] });
        }

        // Format POAPs
        const poaps = attendances?.map(a => {
            const event = a.garo_events as unknown as {
                id: string;
                name: string;
                date: string;
                time: string;
                location: string;
            } | null;

            return {
                id: a.id,
                checkedInAt: a.checked_in_at,
                mintAddress: a.nft_mint_address,
                event: event ? {
                    id: event.id,
                    name: event.name,
                    date: event.date,
                    time: event.time,
                    location: event.location
                } : null
            };
        }) || [];

        return NextResponse.json({ poaps });

    } catch (error) {
        console.error("POAPs API Error:", error);
        return NextResponse.json({ poaps: [] }, { status: 200 });
    }
}
