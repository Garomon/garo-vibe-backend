import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabaseClient";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status } = body; // 'ACTIVE', 'UPCOMING', 'PAST'

        console.log(`Updating event ${id} to status: ${status}`);

        // If setting to active, we might want to deactivate others? 
        // For now, let's allow multiple (though Rave logic picks first active)
        // Or we can enforce single active event here.
        // Let's enforce single active event for simplicity/strictness.

        if (status === 'ACTIVE') {
            // Deactivate all others first
            await supabase
                .from('garo_events')
                .update({ status: 'UPCOMING' }) // Reset others to upcoming
                .eq('status', 'ACTIVE');
        }

        const { data, error } = await supabase
            .from("garo_events")
            .update({ status })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, event: data });

    } catch (error) {
        console.error("Event Update Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const { error } = await supabase
            .from("garo_events")
            .delete()
            .eq("id", id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
