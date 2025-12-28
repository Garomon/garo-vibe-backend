
import { supabase } from "./supabaseClient";

/**
 * Calculates the Tier based on Attendance Count.
 * Tier 1: 1-2
 * Tier 2: 3-9
 * Tier 3: 10+
 */
export function calculateTier(attendance: number): number {
    if (attendance >= 10) return 3;
    if (attendance >= 3) return 2;
    return 1;
}

/**
 * Checks if a user's tier needs to be updated based on their attendance.
 * Returns the new tier if updated, or null if no change.
 * Also triggers on-chain metadata update if the user has a minted NFT.
 */
export async function checkAndUpgradeTier(userId: string, currentTier: number, attendance: number, mintAddress?: string) {
    const newTier = calculateTier(attendance);

    if (newTier > currentTier) {
        // Upgrade needed!
        console.log(`Upgrading User ${userId} from Tier ${currentTier} to ${newTier}`);

        // 1. Update Database
        const { error } = await supabase
            .from('garo_users')
            .update({ tier: newTier })
            .eq('id', userId);

        if (error) {
            console.error("Failed to update user tier in DB:", error);
            throw error;
        }

        // 2. Trigger On-Chain Metadata Update if user has a minted NFT
        if (mintAddress) {
            try {
                const { SolanaAdmin } = require("./solanaAdmin");
                const admin = new SolanaAdmin();
                await admin.updateNftMetadata(mintAddress, newTier);
                console.log(`On-chain metadata updated for NFT ${mintAddress} to Tier ${newTier}`);
            } catch (e) {
                console.error("Failed to update on-chain metadata:", e);
                // Don't fail the tier upgrade if on-chain update fails
            }
        }

        return newTier;
    }

    return null;
}

/**
 * Checks if the user's tier should be downgraded due to inactivity (Oxidation).
 * "Use it or Lose it".
 */
export async function checkOxidation(userId: string, currentTier: number, lastAttendance: string | null) {
    if (currentTier <= 1 || !lastAttendance) return null;

    const now = new Date().getTime();
    const lastTime = new Date(lastAttendance).getTime();

    // PRODUCTION: 30 Days decay cycle (matches Vault UI)
    const DECAY_CYCLE_MS = 30 * 24 * 60 * 60 * 1000;

    if (now - lastTime > DECAY_CYCLE_MS) {
        console.log(`[Oxidation] User ${userId} is inactive. Decaying tier...`);

        // Penalize by 1 Tier (Floor is 1)
        const newTier = Math.max(1, currentTier - 1);

        // Update DB
        const { error } = await supabase
            .from("garo_users")
            .update({
                tier: newTier,
            })
            .eq("id", userId);

        if (error) {
            console.error("Failed to apply oxidation:", error);
            return null;
        }

        return newTier;
    }

    return null;
}
