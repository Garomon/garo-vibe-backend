import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabaseClient";

/**
 * POAP Metadata Endpoint
 * Returns NFT metadata for a specific event POAP.
 * Format follows Metaplex NFT standard.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ eventId: string }> }
) {
    const { eventId } = await params;

    try {
        // Fetch event details from database
        const { data: event, error } = await supabase
            .from("garo_events")
            .select("name, date, time, location, description")
            .eq("id", eventId)
            .single();

        if (error || !event) {
            // Return default POAP metadata if event not found
            return NextResponse.json({
                name: "GΛRO POAP",
                description: "Proof of Attendance - GΛRO VIBE Event",
                image: `${process.env.NEXT_PUBLIC_APP_URL}/poap-default.png`,
                external_url: process.env.NEXT_PUBLIC_APP_URL,
                attributes: [
                    { trait_type: "Type", value: "POAP" },
                    { trait_type: "Event", value: "GΛRO Event" },
                ]
            });
        }

        // Format date nicely
        const eventDate = new Date(event.date + 'T00:00:00');
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return NextResponse.json({
            name: `GΛRO POAP: ${event.name}`,
            description: `Proof of Attendance - You were at "${event.name}" on ${formattedDate}. This NFT proves you were part of this exclusive GΛRO VIBE experience.`,
            image: `${process.env.NEXT_PUBLIC_APP_URL}/poap-${eventId}.png`, // Can be dynamically generated later
            external_url: process.env.NEXT_PUBLIC_APP_URL,
            attributes: [
                { trait_type: "Type", value: "POAP" },
                { trait_type: "Event", value: event.name },
                { trait_type: "Date", value: formattedDate },
                { trait_type: "Location", value: event.location || "The Sanctuary" },
                { trait_type: "Time", value: event.time || "Night" },
            ]
        });

    } catch (error) {
        console.error("POAP Metadata Error:", error);
        return NextResponse.json({
            name: "GΛRO POAP",
            description: "Proof of Attendance - GΛRO VIBE",
            image: `${process.env.NEXT_PUBLIC_APP_URL}/poap-default.png`,
        });
    }
}
