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
        const { title, type, url, min_tier, gallery_urls } = body;

        // Validation
        if (!title || !type) {
            return NextResponse.json({ error: "Title and Type are required" }, { status: 400 });
        }

        // For gallery type, require gallery_urls
        if (type === 'gallery' && (!gallery_urls || gallery_urls.length === 0)) {
            return NextResponse.json({ error: "Gallery type requires at least one URL" }, { status: 400 });
        }

        // For other types, require url
        if (type !== 'gallery' && !url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        const { data: newContent, error } = await supabase
            .from("vault_content")
            .insert([{
                title,
                type,
                url: url || (gallery_urls && gallery_urls[0]) || '',
                gallery_urls: gallery_urls || null,
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
