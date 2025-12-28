import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

// GET: List all events
export async function GET() {
    try {
        const { data: events, error } = await supabase
            .from("garo_events")
            .select("*")
            .order("date", { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ events });

    } catch (error) {
        console.error("Events GET Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST: Create a new event
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, date, time, location, description, capacity } = body;

        if (!name || !date) {
            return NextResponse.json({ error: "Name and Date are required" }, { status: 400 });
        }

        const { data: newEvent, error } = await supabase
            .from("garo_events")
            .insert([{
                name,
                date,
                time: time || null,
                location: location || null,
                description: description || null,
                capacity: capacity || 100,
                status: "UPCOMING"
            }])
            .select()
            .single();

        if (error) {
            console.error("Event creation error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`Event created: ${name} on ${date}`);

        return NextResponse.json({
            success: true,
            event: newEvent
        });

    } catch (error) {
        console.error("Events POST Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
