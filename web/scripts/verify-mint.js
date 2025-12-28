require('dotenv').config({ path: '.env.local' });
const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { Metaplex, keypairIdentity, bundlrStorage } = require("@metaplex-foundation/js");

const RPC_URL = "https://api.devnet.solana.com";

async function verifyMint() {
    console.log("=== STARTING MINT VERIFICATION ===");

    // 1. Load Keypair
    const secretKeyString = process.env.SOLANA_ADMIN_PRIVATE_KEY;
    if (!secretKeyString) {
        console.error("❌ Missing SOLANA_ADMIN_PRIVATE_KEY in .env.local");
        return;
    }

    let adminKeypair;
    try {
        const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
        // Verify length
        if (secretKey.length !== 64) {
            throw new Error("Invalid secret key length: " + secretKey.length);
        }
        adminKeypair = Keypair.fromSecretKey(secretKey);
    } catch (e) {
        console.error("❌ Keypair Init Failed:", e.message);
        return;
    }

    console.log("Admin Wallet:", adminKeypair.publicKey.toBase58());

    // 2. Setup Metaplex (Using MockStorage for Debugging)
    const { mockStorage } = require("@metaplex-foundation/js");
    const connection = new Connection(RPC_URL, "confirmed");
    const metaplex = Metaplex.make(connection)
        .use(keypairIdentity(adminKeypair))
        .use(mockStorage());

    // 3. Mint Logic
    console.log("Minting Test NFT... (This may take ~10-20 seconds)");
    const userWallet = Keypair.generate().publicKey; // Random receiver
    console.log("Recipient:", userWallet.toBase58());

    try {
        const result = await metaplex.nfts().create({
            uri: "https://placehold.co/400x400/000000/FFFFFF/png?text=TEST+MINT",
            name: "GARO VIBE TEST",
            sellerFeeBasisPoints: 0,
            tokenOwner: userWallet,
        });

        const nftAddress = result.nft.address.toBase58();

        console.log("✅ CHECK PASSED: NFT Minted Successfully!");
        console.log("Mint Address:", nftAddress);
        console.log("View on Solana Explorer:", `https://explorer.solana.com/address/${nftAddress}?cluster=devnet`);
    } catch (e) {
        console.error("❌ MINT FAILED:");
        if (e.logs) {
            console.error("Logs:", e.logs);
        } else {
            console.error(e);
        }
    }
}

verifyMint();
