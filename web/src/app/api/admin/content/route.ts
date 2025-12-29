import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

// GET: List all content assets (for admin management)
export async function GET() {
    try {
        const { data: content, error } = await supabase
            .from("vault_content")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ content });

    } catch (error) {
        console.error("Vault Content GET Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST: Create new content asset
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, type, url, min_tier } = body;

        // Validation
        if (!title || !type || !url) {
            return NextResponse.json({ error: "Title, Type, and URL are required" }, { status: 400 });
        }

        const { data: newContent, error } = await supabase
            .from("vault_content")
            .insert([{
                title,
                type,
                url,
                min_tier: min_tier || 1,
                active: true
            }])
            .select()
            .single();

        if (error) {
            console.error("Vault Content Creation Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            content: newContent
        });

    } catch (error) {
        console.error("Vault Content POST Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
