import express from 'express';
import cors from 'cors';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, mintV1 } from '@metaplex-foundation/mpl-bubblegum';
import { keypairIdentity, createSignerFromKeypair, publicKey, none } from '@metaplex-foundation/umi';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
import EVENTS from './events.json';
const PORT = process.env.PORT || 3000;
const WALLET_FILE = 'wallet-keypair.json';
const TREE_FILE = 'tree-address.txt';

// Initialize App
const app = express();
app.use(cors()); // Enable CORS
app.use(express.json()); // Enable JSON body parsing

// --- Serve Static Files ---
app.use(express.static(path.join(__dirname, '../public')));

// --- Global Umi Setup ---
function getUmi() {
    const umi = createUmi('https://api.devnet.solana.com').use(mplBubblegum());

    let secretKey: Uint8Array;
    if (process.env.WALLET_SECRET_KEY) {
        try {
            // Try parsing as JSON array
            secretKey = Uint8Array.from(JSON.parse(process.env.WALLET_SECRET_KEY));
        } catch (e) {
            console.error("Error parsing WALLET_SECRET_KEY from env:", e);
            throw new Error("Invalid WALLET_SECRET_KEY format in environment variables");
        }
    } else {
        if (!fs.existsSync(WALLET_FILE)) throw new Error("Wallet file not found and WALLET_SECRET_KEY not set");
        secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8')));
    }

    const myKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
    const mySigner = createSignerFromKeypair(umi, myKeypair);
    umi.use(keypairIdentity(mySigner));

    let treeAddress: string;
    if (process.env.TREE_ADDRESS) {
        treeAddress = process.env.TREE_ADDRESS;
    } else {
        if (!fs.existsSync(TREE_FILE)) throw new Error("Tree address file not found");
        treeAddress = fs.readFileSync(TREE_FILE, 'utf-8').trim();
    }

    const merkleTreePK = publicKey(treeAddress);

    return { umi, mySigner, merkleTreePK };
}

// --- Endpoints ---

// 1. Status Endpoint
app.get('/status', (req, res) => {
    res.send("El servidor de GΛRO VIBE está activo 🟢");
});

// 2. Mint Endpoint
app.post('/mint', async (req, res) => {
    console.log("📩 Petición de minteo recibida...");

    // Load Events Config
    // Load Events Config


    // ... (inside /mint endpoint)
    const { receiverAddress, eventId } = req.body;

    // Default to Genesis if no eventId or invalid
    const evtId = (eventId && EVENTS[eventId as keyof typeof EVENTS]) ? eventId : 'GENESIS_2025';
    const metadataConfig = EVENTS[evtId as keyof typeof EVENTS];

    console.log(`🎫 Minting Event: ${evtId} (${metadataConfig.name})`);

    try {
        const { umi, mySigner, merkleTreePK } = getUmi();

        // Determine who gets the NFT
        let targetOwner = mySigner.publicKey;
        if (receiverAddress) {
            try {
                console.log("🎯 Receiver Address:", receiverAddress);
                targetOwner = publicKey(receiverAddress);
            } catch (e) {
                return res.status(400).json({ success: false, error: "Invalid Solana Address provided" });
            }
        }

        console.log("🌳 Usando Merkle Tree:", merkleTreePK);
        console.log("👤 Minteando para:", targetOwner);

        // Minting Logic
        const { signature } = await mintV1(umi, {
            leafOwner: targetOwner,
            merkleTree: merkleTreePK,
            metadata: {
                name: metadataConfig.name,
                symbol: metadataConfig.symbol,
                uri: metadataConfig.uri,
                sellerFeeBasisPoints: 500, // 5%
                collection: none(),
                creators: [
                    { address: mySigner.publicKey, verified: false, share: 100 }
                ],
            },
        }).sendAndConfirm(umi);

        // Result Parsing
        const sigString = require('@metaplex-foundation/umi').base58.deserialize(signature)[0];
        console.log("✅ Minteo exitoso! Signature:", sigString);

        res.json({
            success: true,
            message: "NFT Minteado Exitosamente",
            recipient: targetOwner,
            signature: sigString,
            explorer: `https://explorer.solana.com/tx/${sigString}?cluster=devnet`
        });

    } catch (error: any) {
        console.error("❌ Error en el endpoint /mint:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Error desconocido al mintear"
        });
    }
});

// 3. Verify Endpoint - Check NFT Holdings for Levels
app.get('/verify', async (req, res) => {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
        return res.status(400).json({ success: false, error: "Address required" });
    }

    console.log(`🔍 Verificando holdings para: ${address}`);

    try {
        // Use DAS API to get user's assets
        // NOTE: Default Devnet RPC may not support DAS. Use Helius if available.
        const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'verify-nfts',
                method: 'getAssetsByOwner',
                params: {
                    ownerAddress: address,
                    page: 1,
                    limit: 100
                }
            })
        });

        const data = await response.json() as any;

        if (data.error) {
            // DAS not supported, return mock count
            console.log("⚠️ DAS API not available, returning mock data");
            return res.json({ success: true, count: 1, note: "DAS unavailable, mock data" });
        }

        // Filter for our collection (by name prefix or other criteria)
        const allAssets = data.result?.items || [];
        const garoNfts = allAssets.filter((nft: any) =>
            nft.content?.metadata?.name?.includes('GΛRO') ||
            nft.content?.metadata?.symbol === 'VIBE'
        );

        console.log(`✅ Found ${garoNfts.length} GΛRO NFTs for ${address}`);

        res.json({
            success: true,
            count: garoNfts.length,
            address: address
        });

    } catch (error: any) {
        console.error("❌ Verify Error:", error.message);
        // Fallback to 0 on error
        res.json({ success: true, count: 0, error: error.message });
    }
});

// --- SOLANA ACTIONS (BLINKS) CONFIG ---

// Middleware to set specific CORS for Actions (Must allow all origins)
app.use('/api/actions', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// 1. Actions Manifest (GET /api/actions.json)
app.get('/api/actions.json', (req, res) => {
    res.json({
        "rules": [
            { "pathPattern": "/*", "apiPath": "/api/actions/*" }
        ]
    });
});

// 2. Action Card (GET /api/actions/mint)
app.get('/api/actions/mint', (req, res) => {
    res.json({
        "icon": "https://ipfs.io/ipfs/bafkreicf2uskmsrm7sgqvy7hmign255iedvab4x5s5q4vxe2mcluc7yvhm", // Using NFT image
        "title": "GΛRO GENESIS DROP",
        "description": "Claim your exclusive Genesis NFT directly from this Blink.",
        "label": "GET GENESIS DROP",
        "links": {
            "actions": [
                {
                    "label": "Claim Now 🎉",
                    "href": `/api/actions/mint` // POST endpoint
                }
            ]
        }
    });
});

// 3. Action Transaction Execution (POST /api/actions/mint)
app.post('/api/actions/mint', async (req, res) => {
    // Note: To fully implement this, we'd need to construct an unsigned transaction 
    // and return it base64 encoded. For now, since we use a backend minting flow 
    // where the server pays and mints (custodial-ish for the mint), 
    // a standard Blink flow would require the User to sign. 
    // 
    // For this 'Super App', we might still want the 'Click to Claim' experience.
    // However, the standard Blink expects a transaction to sign.
    // 
    // If we want the server to do it all, the user still needs to "sign" a dummy message 
    // or we just return a message saying "Check your wallet".
    //
    // BUT, for a true Blink, we should return a transaction. 
    // Let's return a simple message for now as a placeholder or error if account not provided.

    const { account } = req.body;
    if (!account) {
        return res.status(400).json({ error: "Account required" });
    }

    // In a real Blink, we would build a transaction here for the user to sign.
    // Since our current logic is "Server pays for mint", we can't easily make the user sign 
    // a transaction that does nothing but verify them without changing the flow.
    // For now, let's just trigger the mint server-side and return a success message 
    // disguised as a completed message.

    // NOTE: This deviates from standard Blink which expects a transaction. 
    // To make it work 'by the book', we'd need to rework minting so user pays or we partially sign.
    // For the demo "Viral" check, let's keep it simple: 
    // We will trigger the mint logic here but we SHOULD return a transaction.
    // Since we can't easily mix server-side-mint-fee with client-side-sign without partial sign,
    // We will just mint directly and return a message. 
    // WARNING: Blinks might error if no transaction is returned. 

    try {
        // Reuse mint logic or call it? 
        // Let's just create a dummy transaction (memo) for them to sign so the Blink succeeds visually,
        // and WE trigger the mint in background.

        // Actually, to be safe for the demo, let's just use the existing API 
        // and tell the user "Blink support coming soon" via the UI if accessed directly,
        // OR better: Trigger the mint here (Server Side) then return a message.
        // Blinks allow returning `message` instead of `transaction`? No, usually expect tx.

        res.status(501).json({ error: "Blink Minting Implementation Pending (Requires Transaction Construction)" });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
    console.log(`👉 UI   http://localhost:${PORT}/`);
    console.log(`👉 API  http://localhost:${PORT}/status`);
});
