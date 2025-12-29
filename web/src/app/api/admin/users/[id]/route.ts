import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabaseClient";

// PUT: Update user (tier, active status)
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { tier, active } = body;

        if (!id) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Build update object
        const updateData: any = {};
        if (tier !== undefined) {
            if (tier < 1 || tier > 3) {
                return NextResponse.json({ error: "Tier must be 1, 2, or 3" }, { status: 400 });
            }
            updateData.tier = tier;
        }
        if (active !== undefined) {
            updateData.active = active;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const { data: updatedUser, error } = await supabase
            .from("garo_users")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("User Update Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            user: updatedUser,
            message: active === false ? "User banned" : active === true ? "User unbanned" : "User updated"
        });

    } catch (error) {
        console.error("User PUT Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// GET: Get single user details
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data: user, error } = await supabase
            .from("garo_users")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            console.error("User Fetch Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ user });

    } catch (error) {
        console.error("User GET Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
