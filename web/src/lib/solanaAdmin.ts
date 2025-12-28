
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
import bs58 from "bs58";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

// Load Admin Keypair from environment
function getAdminKeypair(): Keypair {
    const secretKeyString = process.env.SOLANA_ADMIN_PRIVATE_KEY;
    if (!secretKeyString) {
        throw new Error("SOLANA_ADMIN_PRIVATE_KEY not found in environment variables");
    }
    // Handle both array format and base58 string
    try {
        if (secretKeyString.includes("[")) {
            const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
            return Keypair.fromSecretKey(secretKey);
        } else {
            const secretKey = bs58.decode(secretKeyString);
            return Keypair.fromSecretKey(secretKey);
        }
    } catch (e) {
        throw new Error("Invalid SOLANA_ADMIN_PRIVATE_KEY format");
    }
}

export class SolanaAdmin {
    connection: Connection;
    metaplex: Metaplex;
    adminKeypair: Keypair;

    constructor() {
        this.connection = new Connection(RPC_URL, "confirmed");
        this.adminKeypair = getAdminKeypair();

        // We use MockStorage because we serve metadata from our own API key (Self-Hosted)
        // Alternatively, we could use Irys/Bundlr but that requires additional setup steps.
        // For 'zero friction' onboarding where we just want the Token + URI, this is sufficient.
        const { mockStorage } = require("@metaplex-foundation/js");

        this.metaplex = Metaplex.make(this.connection)
            .use(keypairIdentity(this.adminKeypair))
            .use(mockStorage());
    }

    async mintProofOfRave(userWallet: string, tier: number = 1) {
        try {
            const userPublicKey = new PublicKey(userWallet);
            const metadataUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/metadata/${tier}`;

            console.log(`Minting NFT for ${userWallet} with URI: ${metadataUri}`);

            // Create NFT
            // Note: In a real "Gas Relayer" scenario, we mint to the User but Payer is Admin (this.metaplex identity)
            const { nft } = await this.metaplex.nfts().create({
                uri: metadataUri,
                name: `GΛRO VIBE - TIER ${tier}`,
                sellerFeeBasisPoints: 0,
                tokenOwner: userPublicKey, // Mint directly to user
                symbol: "GARO",
            });

            console.log(`Minted NFT: ${nft.address.toBase58()} for user ${userWallet}`);
            return nft.address.toBase58();

        } catch (error) {
            console.error("Minting Error:", error);
            throw error;
        }
    }

    /**
     * Updates the metadata URI of an existing NFT when the user's tier changes.
     * Uses Admin authority so the user does NOT need to sign.
     */
    async updateNftMetadata(mintAddress: string, newTier: number) {
        try {
            const mintPublicKey = new PublicKey(mintAddress);
            const newUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/metadata/${newTier}`;

            console.log(`Updating NFT ${mintAddress} to Tier ${newTier} with URI: ${newUri}`);

            // Fetch the existing NFT
            const nft = await this.metaplex.nfts().findByMint({ mintAddress: mintPublicKey });

            // Update the NFT metadata
            // The Admin keypair (this.metaplex identity) is the Update Authority set during minting
            await this.metaplex.nfts().update({
                nftOrSft: nft,
                uri: newUri,
                name: `GΛRO VIBE - TIER ${newTier}`,
            });

            console.log(`NFT ${mintAddress} updated to Tier ${newTier}`);
            return true;

        } catch (error) {
            console.error("Metadata Update Error:", error);
            throw error;
        }
    }

    /**
     * Mints a unique POAP NFT for event attendance.
     * Each event the user attends = unique collectible NFT.
     */
    async mintEventPOAP(userWallet: string, eventId: string, eventName: string, eventDate: string) {
        try {
            const userPublicKey = new PublicKey(userWallet);

            // Create a unique metadata URI for this event POAP
            const metadataUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/metadata/poap/${eventId}`;

            // Format event name for NFT
            const nftName = `GΛRO POAP: ${eventName}`.slice(0, 32); // Max 32 chars
            const formattedDate = new Date(eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            console.log(`🏆 Minting POAP for ${userWallet} - Event: ${eventName}`);

            const { nft } = await this.metaplex.nfts().create({
                uri: metadataUri,
                name: nftName,
                sellerFeeBasisPoints: 0,
                tokenOwner: userPublicKey,
                symbol: "GΛRO",
            });

            console.log(`🏆 POAP Minted: ${nft.address.toBase58()} for event ${eventName}`);
            return nft.address.toBase58();

        } catch (error) {
            console.error("POAP Minting Error:", error);
            throw error;
        }
    }
}

