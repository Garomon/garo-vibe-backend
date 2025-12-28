/**
 * BATCH EVOLVE SCRIPT
 * 
 * Mutates ALL NFTs minted from a specific event at once.
 * Use case: After a rave, run this to upgrade all "TICKET" NFTs to "VERIFIED ATTENDEE" status.
 * 
 * Usage:
 *   npx tsx scripts/batch-evolve.ts --event RAVE_CDMX --newName "GΛRO CDMX: VIP" --newUri "ipfs://..."
 * 
 * Requirements:
 *   - RPC_URL must support DAS API (Helius)
 *   - WALLET_SECRET_KEY env var with the tree authority
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, updateMetadata, MetadataArgsArgs } from '@metaplex-foundation/mpl-bubblegum';
import { keypairIdentity, createSignerFromKeypair, publicKey, none, some } from '@metaplex-foundation/umi';
import * as fs from 'fs';

// --- ARGS ---
const args = process.argv.slice(2);
const eventIndex = args.indexOf('--event');
const nameIndex = args.indexOf('--newName');
const uriIndex = args.indexOf('--newUri');

const eventId = eventIndex !== -1 ? args[eventIndex + 1] : undefined;
const newName = nameIndex !== -1 ? args[nameIndex + 1] : undefined;
const newUri = uriIndex !== -1 ? args[uriIndex + 1] : undefined;

if (!eventId) {
    console.error("Usage: npx tsx scripts/batch-evolve.ts --event <EVENT_ID> [--newName 'New Name'] [--newUri 'ipfs://...']");
    console.error("Example: npx tsx scripts/batch-evolve.ts --event RAVE_CDMX --newName 'GΛRO CDMX: OG'");
    process.exit(1);
}

if (!newName && !newUri) {
    console.error("Error: Provide at least --newName or --newUri");
    process.exit(1);
}

// TypeScript: eventId is guaranteed to be defined after the check above
const EVENT_ID: string = eventId!;

// --- CONFIG ---
const WALLET_FILE = 'wallet-keypair.json';
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

async function main() {
    console.log(`\n🧬 BATCH EVOLVE: Event "${EVENT_ID}"`);
    console.log(`   RPC: ${RPC_URL}`);
    if (newName) console.log(`   New Name: ${newName}`);
    if (newUri) console.log(`   New URI: ${newUri}`);
    console.log('');

    // Setup Umi
    const umi = createUmi(RPC_URL).use(mplBubblegum());

    // Load Wallet
    let secretKey: Uint8Array;
    if (process.env.WALLET_SECRET_KEY) {
        secretKey = Uint8Array.from(JSON.parse(process.env.WALLET_SECRET_KEY));
    } else {
        if (!fs.existsSync(WALLET_FILE)) throw new Error("Wallet file not found");
        secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8')));
    }
    const myKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
    const mySigner = createSignerFromKeypair(umi, myKeypair);
    umi.use(keypairIdentity(mySigner));
    console.log(`🔐 Authority: ${mySigner.publicKey}\n`);

    // Step 1: Get ALL assets created by our authority (the tree creator)
    console.log("🔍 Fetching all GΛRO NFTs from DAS...");

    const searchResponse = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'batch-evolve',
            method: 'searchAssets',
            params: {
                creatorAddress: mySigner.publicKey.toString(),
                creatorVerified: false, // Our cNFTs have creator unverified by default
                page: 1,
                limit: 1000
            }
        })
    });

    const searchData = await searchResponse.json() as any;

    if (searchData.error) {
        console.error("❌ DAS API Error:", searchData.error.message);
        console.error("   Make sure RPC_URL supports DAS (use Helius).");
        process.exit(1);
    }

    const allAssets = searchData.result?.items || [];
    console.log(`   Found ${allAssets.length} total assets.\n`);

    // Step 2: Filter by event (match name or attribute)
    // Our event NFTs are named like "GΛRO <EventName>" or have eventId in attributes
    const eventNfts = allAssets.filter((nft: any) => {
        const name = nft.content?.metadata?.name || '';
        const symbol = nft.content?.metadata?.symbol || '';
        // Simple matching: if name contains event ID or symbol matches
        return name.toUpperCase().includes(EVENT_ID.toUpperCase()) ||
            symbol.toUpperCase() === EVENT_ID.toUpperCase();
    });

    console.log(`🎫 Matched ${eventNfts.length} NFTs for event "${EVENT_ID}"\n`);

    if (eventNfts.length === 0) {
        console.log("   No matching NFTs found. Exiting.");
        process.exit(0);
    }

    // Step 3: Evolve each one
    let successCount = 0;
    let failCount = 0;

    for (const nft of eventNfts) {
        const assetId = nft.id;
        console.log(`\n⚙️  Evolving: ${assetId.slice(0, 8)}...`);

        try {
            // Get proof for this specific asset
            const proofRes = await fetch(RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0', id: 'get-proof', method: 'getAssetProof',
                    params: { id: assetId }
                })
            });
            const proofData = await proofRes.json() as any;
            if (proofData.error) throw new Error(proofData.error.message);

            const proof = proofData.result;

            // Build current metadata from asset data
            const currentCreators = nft.creators?.map((c: any) => ({
                address: publicKey(c.address),
                verified: c.verified,
                share: c.share
            })) || [];

            const currentMetadata: MetadataArgsArgs = {
                name: nft.content.metadata.name as string,
                symbol: nft.content.metadata.symbol as string,
                uri: nft.content.json_uri as string,
                sellerFeeBasisPoints: nft.royalty?.basis_points || 0,
                collection: nft.grouping?.length > 0
                    ? some({ key: publicKey(nft.grouping[0].group_value), verified: false })
                    : none(),
                creators: currentCreators,
            };

            const updatedMetadata = {
                ...currentMetadata,
                name: newName || currentMetadata.name,
                uri: newUri || currentMetadata.uri,
            };

            // Execute update
            const { signature } = await updateMetadata(umi, {
                leafOwner: publicKey(nft.ownership.owner),
                merkleTree: publicKey(proof.tree_id),
                root: publicKey(proof.root),
                nonce: nft.compression.leaf_id,
                index: nft.compression.leaf_id,
                currentMetadata: currentMetadata,
                updateArgs: updatedMetadata,
                proof: proof.proof.map((p: string) => publicKey(p)),
            }).sendAndConfirm(umi);

            const sigString = require('@metaplex-foundation/umi').base58.deserialize(signature)[0];
            console.log(`   ✅ Done: ${sigString.slice(0, 12)}...`);
            successCount++;

        } catch (err: any) {
            console.log(`   ❌ Failed: ${err.message}`);
            failCount++;
        }

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n\n🏁 BATCH EVOLVE COMPLETE`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
}

main().catch(console.error);
