
import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const TIERS: any = {
    1: {
        name: "GΛRO VIBE - INITIATE",
        symbol: "GARO",
        description: "Proof of Rave - Tier 1: Initiate. The Foundation. Concrete Grey Polished. Welcome to the floor.",
        image: `${BASE_URL}/assets/nft/tier-1.png`,
        external_url: BASE_URL,
        attributes: [
            { trait_type: "Tier", value: "1" },
            { trait_type: "Status", value: "INITIATE" },
            { trait_type: "Material", value: "Polished Concrete" },
            { trait_type: "Effect", value: "None" }
        ]
    },
    2: {
        name: "GΛRO VIBE - RESIDENT",
        symbol: "GARO",
        description: "Proof of Rave - Tier 2: Resident. The Structure. Rustic Red Brick & Dark Wood. You are part of the vibration.",
        image: `${BASE_URL}/assets/nft/tier-2.png`,
        external_url: BASE_URL,
        attributes: [
            { trait_type: "Tier", value: "2" },
            { trait_type: "Status", value: "RESIDENT" },
            { trait_type: "Material", value: "Rustic Brick & Wood" },
            { trait_type: "Effect", value: "Warm Lighting" }
        ]
    },
    3: {
        name: "GΛRO VIBE - FAMILY",
        symbol: "GARO",
        description: "Proof of Rave - Tier 3: Family. The Energy. Laser Green Neon & Metal. You ARE the rave.",
        image: `${BASE_URL}/assets/nft/tier-3.png`,
        external_url: BASE_URL,
        attributes: [
            { trait_type: "Tier", value: "3" },
            { trait_type: "Status", value: "FAMILY" },
            { trait_type: "Material", value: "Neon & Metal" },
            { trait_type: "Effect", value: "Reactive Particles" }
        ]
    }
};

export async function GET(request: Request, context: { params: Promise<{ tier: string }> }) {
    // Await the params object
    const { tier } = await context.params;

    // Parse the tier from the URL parameter
    const tierId = parseInt(tier);

    if (!TIERS[tierId]) {
        return NextResponse.json({ error: "Invalid Tier" }, { status: 404 });
    }

    return NextResponse.json(TIERS[tierId]);
}
