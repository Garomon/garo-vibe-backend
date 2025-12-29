import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
    try {
        // Create client
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        // -------------------------------------------------------------
        // AUTO-START LOGIC (Lazy Activation)
        // Check if any UPCOMING event is due to start
        // -------------------------------------------------------------
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Fetch potential candidates (UPCOMING and date <= today)
        // We check 'date' <= today because an event might have been missed yesterday 
        // (though ideally we only care about today for "Live")
        const { data: upcomingEvents } = await supabase
            .from("garo_events")
            .select("*")
            .eq("status", "UPCOMING")
            .lte("date", todayStr)
            .order("date", { ascending: true })
            .order("time", { ascending: true });

        if (upcomingEvents && upcomingEvents.length > 0) {
            let eventToActivate = null;

            for (const event of upcomingEvents) {
                // Combine date and time
                // event.time is HH:MM:SS string or null
                let eventStart = new Date(event.date); // This defaults to UTC midnight usually
                // Adjust to local time if possible, but servers use UTC. 
                // Let's assume input date string is YYYY-MM-DD.

                if (event.time) {
                    const [hours, minutes] = event.time.split(':');
                    eventStart.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
                    // Crucial: We need to match the timezone logic. 
                    // MVP: Assume 'time' in DB is UTC or server time.
                    // If user enters local time, converting to UTC might be tricky without offset.
                    // Let's assume simply: Compare against NOW.
                }

                // If eventStart has passed
                if (eventStart <= now) {
                    eventToActivate = event;
                    // We take the last one or first one? 
                    // If multiple are due, likely the latest one is the one we want? 
                    // Or strictly the first one that hasn't started?
                    // Let's activate the *first* one found that is due, to respect schedule sequence.
                    break;
                }
            }

            if (eventToActivate) {
                console.log(`Auto-activating event: ${eventToActivate.name}`);

                // 1. Deactivate any currently ACTIVE events (to avoid doubles)
                await supabase
                    .from("garo_events")
                    .update({ status: "PAST" }) // Or UPCOMING? PAST is better if we are overriding.
                    .eq("status", "ACTIVE");

                // 2. Activate this one
                const { error: activateError } = await supabase
                    .from("garo_events")
                    .update({ status: "ACTIVE" })
                    .eq("id", eventToActivate.id);

                if (!activateError) {
                    // Return immediately as LIVE
                    return NextResponse.json({
                        mode: 'LIVE',
                        event: { ...eventToActivate, status: 'ACTIVE' }
                    });
                }
            }
        }
        // -------------------------------------------------------------

        const { data: activeEvents, error } = await supabase
            .from("garo_events")
            .select("id, name, location, date, time")
            .eq("status", "ACTIVE")
            .limit(1);

        if (error) {

            if (activeEvents && activeEvents.length > 0) {
                return NextResponse.json({
                    mode: 'LIVE',
                    event: activeEvents[0]
                });
            }

            // Default to TRAINING (Daily Cap enforced in claim API)
            return NextResponse.json({ mode: 'TRAINING' });

        } catch (error) {
            return NextResponse.json({ mode: 'OFFLINE', error: "Internal Error" });
        }
    } catch (error) {
        return NextResponse.json({ mode: 'OFFLINE', error: "Internal Error" });
    }
}
