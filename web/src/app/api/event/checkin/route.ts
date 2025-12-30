import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CHECK_IN_REWARD = 100; // $VIBE reward for checking in (EXCLUSIVE MODE)

export async function POST(request: NextRequest) {
    try {
        const { wallet_address, event_id } = await request.json();

        if (!wallet_address || !event_id) {
            return NextResponse.json({
                success: false,
                error: "Missing wallet_address or event_id"
            }, { status: 400 });
        }

        console.log("Check-in attempt:", { wallet_address, event_id });

        // 1. Validate event exists and is ACTIVE
        const { data: event, error: eventError } = await supabase
            .from("garo_events")
            .select("id, name, status")
            .eq("id", event_id)
            .single();

        console.log("Event query result:", { event, eventError });

        if (eventError || !event) {
            return NextResponse.json({
                success: false,
                error: "Event not found"
            }, { status: 404 });
        }

        if (event.status !== "ACTIVE") {
            return NextResponse.json({
                success: false,
                error: "Event is not currently active"
            }, { status: 400 });
        }

        // 2. Get user
        const { data: user, error: userError } = await supabase
            .from("garo_users")
            .select("id, xp")
            .eq("wallet_address", wallet_address)
            .single();

        if (userError || !user) {
            return NextResponse.json({
                success: false,
                error: "User not found"
            }, { status: 404 });
        }

        // 3. 🔐 EXCLUSIVE MODE: Check if user has a valid ticket for this event
        const { data: ticket, error: ticketError } = await supabase
            .from("user_event_tickets")
            .select("id, status")
            .eq("user_id", user.id)
            .eq("event_id", event_id)
            .eq("status", "VALID")
            .single();

        console.log("Ticket query result:", { ticket, ticketError });

        if (ticketError || !ticket) {
            return NextResponse.json({
                success: false,
                error: "ACCESS DENIED",
                message: "No estás en la lista. Pide a un Miembro que te envíe una invitación para activar tu acceso.",
                access_denied: true
            }, { status: 403 });
        }

        // 4. Check if user already checked in to this event
        const { data: existingCheckin } = await supabase
            .from("event_attendance")
            .select("id")
            .eq("user_id", user.id)
            .eq("event_id", event_id)
            .single();

        if (existingCheckin) {
            return NextResponse.json({
                success: false,
                error: "You've already checked in to this event!",
                already_checked_in: true
            }, { status: 400 });
        }

        // 5. Create attendance record
        const { error: attendanceError } = await supabase
            .from("event_attendance")
            .insert({
                user_id: user.id,
                event_id: event_id
            });

        if (attendanceError) {
            throw attendanceError;
        }

        // 6. Mark ticket as USED
        const { error: ticketUpdateError } = await supabase
            .from("user_event_tickets")
            .update({ status: "USED", used_at: new Date().toISOString() })
            .eq("id", ticket.id);

        if (ticketUpdateError) {
            console.error("Failed to update ticket status:", ticketUpdateError);
        }

        // 7. Award XP (100 $VIBE for exclusive events)
        const newXP = (user.xp || 0) + CHECK_IN_REWARD;
        const { error: xpError } = await supabase
            .from("garo_users")
            .update({ xp: newXP })
            .eq("id", user.id);

        if (xpError) {
            throw xpError;
        }

        return NextResponse.json({
            success: true,
            message: `ACCESS GRANTED! You earned ${CHECK_IN_REWARD} $VIBE!`,
            reward: CHECK_IN_REWARD,
            new_balance: newXP,
            event_name: event.name
        });

    } catch (error) {
        console.error("Check-in error:", error);
        return NextResponse.json({
            success: false,
            error: "Check-in failed"
        }, { status: 500 });
    }
}
