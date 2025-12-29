import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { data: activeEvents, error } = await supabase
            .from("garo_events")
            .select("id, name, location")
            .eq("status", "ACTIVE")
            .limit(1);

        if (error) {
            console.error("Error checking active events:", error);
            // Default to OFFLINE if error
            return NextResponse.json({ mode: 'OFFLINE' });
        }

        if (activeEvents && activeEvents.length > 0) {
            return NextResponse.json({
                mode: 'LIVE',
                event: activeEvents[0]
            });
        }

        // Default to OFFLINE (Standby)
        return NextResponse.json({ mode: 'OFFLINE' });

    } catch (error) {
        return NextResponse.json({ mode: 'OFFLINE', error: "Internal Error" });
    }
}
