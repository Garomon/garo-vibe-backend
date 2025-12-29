import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabaseClient";

// DELETE: Remove content asset
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Correct type for Next.js 15+ dynamic routes
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("vault_content")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Vault Content Delete Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Vault Content DELETE Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PUT: Update content asset
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { title, type, url, min_tier, gallery_urls } = body;

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        // Build update object
        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (type !== undefined) updateData.type = type;
        if (url !== undefined) updateData.url = url;
        if (min_tier !== undefined) updateData.min_tier = min_tier;
        if (gallery_urls !== undefined) updateData.gallery_urls = gallery_urls;

        const { data: updatedContent, error } = await supabase
            .from("vault_content")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Vault Content Update Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, content: updatedContent });

    } catch (error) {
        console.error("Vault Content PUT Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
