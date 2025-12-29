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
