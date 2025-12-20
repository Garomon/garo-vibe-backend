import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, updateMetadata } from '@metaplex-foundation/mpl-bubblegum';
import { keypairIdentity, createSignerFromKeypair, publicKey, none, some, PublicKey } from '@metaplex-foundation/umi';
import * as fs from 'fs';
import * as path from 'path';

// --- ARGS ---
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error("Usage: npx tsx scripts/evolve-nft.ts <ASSET_ID> [--name 'New Name'] [--uri 'New URI']");
    process.exit(1);
}

const assetIdString = args[0];
if (!assetIdString) {
    console.error("Asset ID required");
    process.exit(1);
}
const assetId = publicKey(assetIdString);
const nameArgIndex = args.indexOf('--name');
const uriArgIndex = args.indexOf('--uri');

const newName = nameArgIndex !== -1 ? args[nameArgIndex + 1] : undefined;
const newUri = uriArgIndex !== -1 ? args[uriArgIndex + 1] : undefined;

if (!newName && !newUri) {
    console.error("Error: You must provide at least --name or --uri to update.");
    process.exit(1);
}

// --- CONFIG ---
const WALLET_FILE = 'wallet-keypair.json';
// Need a DAS-compatible RPC. Devnet default might not work. 
// User should provide one or we default to a public Helius node if available, or stay with devnet and hope.
// Ideally, use a dedicated RPC env var.
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

async function main() {
    console.log(`🧬 Evolving NFT: ${assetId}`);
    console.log(`   RPC: ${RPC_URL}`);

    // Setup Umi
    const umi = createUmi(RPC_URL).use(mplBubblegum());

    // Load Wallet
    let secretKey: Uint8Array;
    if (process.env.WALLET_SECRET_KEY) {
        try {
            // Try parsing as JSON array string first
            const secretString = process.env.WALLET_SECRET_KEY;
            let parsed: number[];
            if (secretString.startsWith('[') && secretString.endsWith(']')) {
                parsed = JSON.parse(secretString);
            } else {
                // assume format is just raw bytes or try parsing anyway
                parsed = JSON.parse(secretString);
            }
            secretKey = Uint8Array.from(parsed);
        } catch (e) {
            console.error("Failed to parse WALLET_SECRET_KEY");
            throw e;
        }
    } else {
        if (!fs.existsSync(WALLET_FILE)) throw new Error("Wallet file not found");
        secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8')));
    }
    const myKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
    const mySigner = createSignerFromKeypair(umi, myKeypair);
    umi.use(keypairIdentity(mySigner));

    console.log(`🔐 Using Wallet: ${mySigner.publicKey}`);

    try {
        // 1. Fetch Asset from DAS API (Get Proof and Data)
        // Ensure the RPC supports the 'getAssetProof' method (Read API)
        // Using Umi's rpc wrapper or direct JSON-RPC call? 
        // Bubblegum helper `getAssetWithProof` is ideal if installed, otherwise manual.
        // Let's assume Umi defaults are standard. If 'getAssetProof' fails, user needs a Helius RPC.

        console.log("🔍 Fetching Asset Proof (DAS API)...");

        // Manual JSON-RPC call to getAssetProof because default Umi RPC might not expose it easily without plugin
        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'my-id',
                method: 'getAssetProof',
                params: { id: assetId.toString() },
            }),
        });
        const { result: proofResult, error: proofError } = await response.json() as any;

        if (proofError) throw new Error(`DAS API Error (Proof): ${JSON.stringify(proofError)}`);

        // Fetch Asset Data too
        const responseData = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'my-id',
                method: 'getAsset',
                params: { id: assetId.toString() },
            }),
        });
        const { result: assetResult, error: assetError } = await responseData.json() as any;

        if (assetError) throw new Error(`DAS API Error (Asset): ${JSON.stringify(assetError)}`);

        const rpcAsset = assetResult;
        const rpcProof = proofResult;

        console.log("✅ Asset Data Found:", rpcAsset.content.metadata.name);

        // 2. Prepare Update Args
        // We need: root, dataHash, creatorHash, nonce, index

        const currentCreators = rpcAsset.creators.map((c: any) => ({
            address: publicKey(c.address),
            verified: c.verified,
            share: c.share
        }));

        const currentMetadata = {
            name: rpcAsset.content.metadata.name,
            symbol: rpcAsset.content.metadata.symbol,
            uri: rpcAsset.content.json_uri,
            sellerFeeBasisPoints: rpcAsset.royalty.basis_points,
            collection: rpcAsset.grouping && rpcAsset.grouping.length > 0
                ? some({ key: publicKey(rpcAsset.grouping[0].group_value), verified: false })
                : none(),
            creators: currentCreators,
        };

        const newMetadata = {
            ...currentMetadata,
            name: newName || currentMetadata.name,
            uri: newUri || currentMetadata.uri,
        };

        // 3. Execute Update
        console.log("🚀 Sending Update Transaction...");

        const { signature } = await updateMetadata(umi, {
            leafOwner: publicKey(rpcAsset.ownership.owner),
            merkleTree: publicKey(rpcProof.tree_id),
            root: publicKey(rpcProof.root),
            nonce: rpcAsset.compression.leaf_id,
            index: rpcAsset.compression.leaf_id, // nonce is often same as index/leaf_id
            currentMetadata: currentMetadata,
            updateArgs: newMetadata,
            proof: rpcProof.proof.map((p: string) => publicKey(p)),
        }).sendAndConfirm(umi);

        const sigString = require('@metaplex-foundation/umi').base58.deserialize(signature)[0];
        console.log("✨ MUTATION COMPLETE!");
        console.log(`🔗 Tx: https://explorer.solana.com/tx/${sigString}?cluster=devnet`);

    } catch (e: any) {
        console.error("❌ Evolve Failed:", e);
        if (e.message && e.message.includes("Method not found")) {
            console.error("\n⚠️  HINT: The current RPC URL does not support DAS API (getAsset/getAssetProof).");
            console.error("   Please set RPC_URL to a Helius/Triton Devnet endpoint.");
        }
    }
}

main();
