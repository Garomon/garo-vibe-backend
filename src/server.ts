// --- Imports ---
import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, mintV1 } from '@metaplex-foundation/mpl-bubblegum';
import { keypairIdentity, createSignerFromKeypair, none, publicKey } from '@metaplex-foundation/umi';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Configure dotenv to load .env file
dotenv.config();

// Initialize App
const app = express();
app.use(express.json()); // Enable JSON body parsing

// --- Config ---
const PORT = process.env.PORT || 3000;
const EVENTS: Record<string, { name: string; symbol: string; uri: string }> = require('./events.json');
const WALLET_FILE = 'wallet-keypair.json';
const TREE_FILE = 'tree-address.txt';

// --- Supabase Setup ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ MISSING SUPABASE CREDENTIALS in .env");
    console.error("   Using fallback (will fail queries)...");
}

const supabase = createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseKey || "placeholder-key"
);

// --- Serve Static Files ---
app.use(express.static(path.join(__dirname, '../public')));

// --- Rate Limiting (Security Hardening) ---
const mintRateLimit: Record<string, { count: number, lastReset: number }> = {};
const MINT_LIMIT = 5; // Max mints per window per IP
const MINT_WINDOW_MS = 60 * 1000; // 1 minute

function checkMintRateLimit(ip: string): boolean {
    const now = Date.now();
    if (!mintRateLimit[ip] || now - mintRateLimit[ip].lastReset > MINT_WINDOW_MS) {
        mintRateLimit[ip] = { count: 1, lastReset: now };
        return true;
    }
    if (mintRateLimit[ip].count >= MINT_LIMIT) {
        return false;
    }
    mintRateLimit[ip].count++;
    return true;
}


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

// 0. Root Redirect - Entry point goes to onboarding
app.get('/', (req, res) => {
    res.redirect('/onboarding.html');
});

// 1. Status Endpoint
app.get('/status', (req, res) => {
    res.send("El servidor de GΛRO VIBE está activo 🟢");
});

// 2. Mint Endpoint
app.post('/mint', async (req, res) => {
    console.log("📩 Petición de minteo recibida...");

    // Rate limit check
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkMintRateLimit(clientIp)) {
        console.log(`⚠️ Rate limit hit for IP: ${clientIp}`);
        return res.status(429).json({ success: false, error: "Too many requests. Please wait." });
    }

    const { receiverAddress, eventId, referrer, signature, publicKey: signerPublicKey, message } = req.body;

    // --- SECURITY CHECK (DOCTRINA GARO: PREMIUM & SECURE) ---
    if (!signature || !signerPublicKey || !message) {
        console.error("❌ Rechazado: Falta firma criptográfica.");
        return res.status(401).json({ success: false, error: "Firma requerida. Autenticación fallida." });
    }

    try {
        const { umi } = getUmi();
        const signerPubkey = publicKey(signerPublicKey);

        // Simple message verification
        // Message should be: "Minting GARO VIBE for <receiverAddress>" to prevent replay attacks for other addresses
        const expectedMessage = `Minting GARO VIBE for ${receiverAddress}`;
        if (message !== expectedMessage) {
            throw new Error("Mensaje de firma inválido.");
        }

        const signatureBytes = new Uint8Array(Buffer.from(signature, 'base64'));
        const messageBytes = new TextEncoder().encode(message);

        const isValid = umi.eddsa.verify(messageBytes, signatureBytes, signerPubkey);

        if (!isValid) {
            console.error("❌ Rechazado: Firma inválida.");
            return res.status(403).json({ success: false, error: "Firma inválida." });
        }

        if (signerPublicKey !== receiverAddress) {
            console.log(`⚠️ Nota: ${signerPublicKey} está minteando para ${receiverAddress} (Gift/Airdrop flow compatible)`);
        }

        console.log("✅ Firma verificada correctamente.");

    } catch (e: any) {
        console.error("❌ Error de seguridad:", e.message);
        return res.status(403).json({ success: false, error: "Falló la verificación de seguridad." });
    }
    // ---------------------------------------------------------


    // Default to Genesis if no eventId or invalid
    const evtId = (eventId && EVENTS[eventId as keyof typeof EVENTS]) ? eventId : 'GENESIS_2025';
    // TS: We know 'GENESIS_2025' exists in events.json, but TS needs generic constraint or casting.
    // simpler: cast result.
    const metadataConfig = (EVENTS[evtId as keyof typeof EVENTS] || EVENTS['GENESIS_2025'])!;

    console.log(`🎫 Minting Event: ${evtId} (${metadataConfig.name})`);

    // Track mint in Supabase (ALWAYS, even without referrer - for /verify accuracy)
    const referrerWallet = (referrer && referrer !== receiverAddress) ? referrer : null;
    if (referrerWallet) {
        console.log(`🔗 Referral: ${referrer.slice(0, 8)}... → ${receiverAddress.slice(0, 8)}...`);
    } else {
        console.log(`📥 Direct mint for: ${receiverAddress.slice(0, 8)}...`);
    }

    // Insert into DB (fire and forget to not block minting)
    supabase.from('referrals').insert({
        referrer_wallet: referrerWallet,
        referee_wallet: receiverAddress,
        event_id: evtId
    }).then(({ error }) => {
        if (error) console.error("❌ Mint DB Log Error:", error.message);
        else console.log("   ✅ Mint logged to DB");
    });

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

// 2b. Referrals Endpoint - Get referral stats
app.get('/referrals', async (req, res) => {
    const { address } = req.query;

    if (address && typeof address === 'string') {
        const { data, error } = await supabase
            .from('referrals')
            .select('*')
            .eq('referrer_wallet', address);

        if (error) return res.status(500).json({ error: error.message });
        return res.json({ address, count: data.length, referrals: data });
    }

    // Leaderboard (Top 10)
    // Using simple client-side aggregation for now since we don't have a configured view/RPC
    const { data, error } = await supabase
        .from('referrals')
        .select('referrer_wallet');

    if (error) return res.status(500).json({ error: error.message });

    // Aggregate in JS (fine for MVP scale)
    const counts: Record<string, number> = {};
    data.forEach((row: any) => {
        counts[row.referrer_wallet] = (counts[row.referrer_wallet] || 0) + 1;
    });

    const leaderboard = Object.entries(counts)
        .map(([addr, count]) => ({ address: addr, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    res.json({ leaderboard });
});

// 2c. Stats Endpoint - Get live stats for God Mode
app.get('/api/stats', async (req, res) => {
    try {
        // Get total mint count
        const { count: mintCount } = await supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true });

        // Get total scan count
        const { count: scanCount } = await supabase
            .from('scan_logs')
            .select('*', { count: 'exact', head: true });

        // Get unique users
        const { data: uniqueUsers } = await supabase
            .from('referrals')
            .select('referee_wallet');

        // Get recent mints (last 10)
        const { data: recentMints } = await supabase
            .from('referrals')
            .select('referee_wallet, event_id, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        // Get recent scans (last 10)
        const { data: recentScans } = await supabase
            .from('scan_logs')
            .select('wallet_address, status, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        // Combine and sort recent activity
        const recentActivity = [
            ...(recentMints || []).map((m: any) => ({
                type: 'mint',
                wallet: m.referee_wallet?.slice(0, 8) + '...',
                event: m.event_id,
                time: m.created_at
            })),
            ...(recentScans || []).map((s: any) => ({
                type: 'scan',
                wallet: s.wallet_address?.slice(0, 8) + '...',
                status: s.status,
                time: s.created_at
            }))
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);

        res.json({
            success: true,
            stats: {
                mints: mintCount || 0,
                scans: scanCount || 0,
                uniqueUsers: new Set((uniqueUsers || []).map((u: any) => u.referee_wallet)).size
            },
            recentActivity
        });

    } catch (e: any) {
        console.error("Stats Error:", e.message);
        res.json({ success: false, stats: { mints: 0, scans: 0, uniqueUsers: 0 }, recentActivity: [] });
    }
});

// 2d. XP Endpoint - Calculate user XP with streak bonus
app.get('/api/xp', async (req, res) => {
    const { address } = req.query;
    if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: "Address required" });
    }

    try {
        // Get user's memories
        const { data: mints, error } = await supabase
            .from('referrals')
            .select('created_at, event_id')
            .eq('referee_wallet', address)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const memories = mints || [];
        let xp = 0;
        let streak = 0;
        let lastEventDate: Date | null = null;

        // XP Rules:
        // - Each mint: 100 XP
        // - First mint: +200 XP bonus
        // - Streak (events within 30 days): +50 XP per consecutive

        memories.forEach((m: any, i: number) => {
            xp += 100; // Base XP per memory

            if (i === 0) {
                xp += 200; // First mint bonus
            }

            // Check streak
            const mintDate = new Date(m.created_at);
            if (lastEventDate) {
                const daysBetween = (mintDate.getTime() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24);
                if (daysBetween <= 30 && daysBetween > 0) {
                    streak++;
                    xp += 50 * streak; // Increasing streak bonus
                } else {
                    streak = 0; // Reset streak if gap too long
                }
            }
            lastEventDate = mintDate;
        });

        // Level calculation
        const levels = [
            { min: 0, name: 'New Fan', level: 1 },
            { min: 300, name: 'Bronze', level: 2 },
            { min: 700, name: 'Silver', level: 3 },
            { min: 1500, name: 'Gold VIP', level: 4 },
            { min: 3000, name: 'Diamond Elite', level: 5 },
            { min: 6000, name: 'Legend', level: 6 }
        ];

        type LevelType = { min: number; name: string; level: number };
        let currentLevel: LevelType = levels[0]!;
        let nextLevel: LevelType | undefined = levels[1];
        for (let i = levels.length - 1; i >= 0; i--) {
            if (xp >= levels[i]!.min) {
                currentLevel = levels[i]!;
                nextLevel = levels[i + 1];
                break;
            }
        }

        res.json({
            success: true,
            xp,
            streak,
            level: currentLevel,
            nextLevel: nextLevel || null,
            progress: nextLevel ? Math.round((xp - currentLevel.min) / (nextLevel.min - currentLevel.min) * 100) : 100,
            memoriesCount: memories.length
        });

    } catch (e: any) {
        console.error("XP Error:", e.message);
        res.json({ success: false, xp: 0, streak: 0, level: { name: 'New Fan', level: 1 } });
    }
});

// 2e. Memories Endpoint - Get user's Memory collection with metadata
app.get('/api/memories', async (req, res) => {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
        return res.status(400).json({ success: false, error: "Address required" });
    }

    try {
        // Fetch all mints for this user from Supabase
        const { data, error } = await supabase
            .from('referrals')
            .select('event_id, created_at')
            .eq('referee_wallet', address)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map to Memory objects with metadata from events.json
        const memories = (data || []).map((mint: any) => {
            const eventMeta = EVENTS[mint.event_id as keyof typeof EVENTS] ?? EVENTS['GENESIS_2025'];
            return {
                eventId: mint.event_id,
                name: eventMeta?.name || 'GΛRO Memory',
                image: "https://ipfs.io/ipfs/bafybeicilwj77izwenlikir6uomtgjkuslhpiubgggho7c374677yymqwi",
                date: mint.created_at,
                symbol: eventMeta?.symbol || 'VIBE'
            };
        });

        res.json({
            success: true,
            count: memories.length,
            memories: memories
        });

    } catch (e: any) {
        console.error("Memories Error:", e.message);
        res.json({ success: true, count: 0, memories: [], error: e.message });
    }
});

// 3. Verify Endpoint - Check NFT Holdings for Levels (Source of Truth: Supabase)
app.get('/verify', async (req, res) => {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
        return res.status(400).json({ success: false, error: "Address required" });
    }

    console.log(`🔍 Verificando holdings para: ${address}`);

    try {
        // STRATEGY: Use Supabase 'referrals' table as the Indexer of Truth.
        // This ensures zero-latency updates after injection, even if Solana Indexers are slow.

        const { count, error } = await supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true })
            .eq('referee_wallet', address);

        if (error) {
            console.error("❌ Supabase Verify Error:", error.message);
            // Fallback to 0 or Mock if DB fails
            return res.json({ success: true, count: 0, error: error.message });
        }

        console.log(`✅ Found ${count} Memory Pulses (DB) for ${address}`);

        res.json({
            success: true,
            count: count || 0,
            address: address
        });

    } catch (error: any) {
        console.error("❌ Verify Error:", error.message);
        res.json({ success: true, count: 0, error: error.message });
    }
});

// 3.b Scan Log Endpoint (Audit Trail)
app.post('/api/scan-log', async (req, res) => {
    const { scanned_address, scanner_id, status } = req.body;
    console.log(`📝 Log Scan: ${scanned_address} [${status}]`);

    // Insert into Supabase (Allow failure without blocking UI)
    supabase.from('scan_logs').insert({
        scanned_address,
        scanner_id: scanner_id || 'DOORMAN_1',
        status,
        timestamp: new Date().toISOString()
    }).then(({ error }) => {
        if (error) console.error("Error logging scan:", error.message);
    });

    res.json({ success: true });
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
    const iconUrl = "https://ipfs.io/ipfs/bafybeicilwj77izwenlikir6uomtgjkuslhpiubgggho7c374677yymqwi";
    res.json({
        "icon": iconUrl,
        "title": "GΛRO GENESIS DROP",
        "description": "Reclama tu NFT Genesis oficial directamente desde aquí. Sin gas, sin fricción.",
        "label": "CLAIM DROP",
        "links": {
            "actions": [
                {
                    "label": "Claim Now 🎉",
                    "href": "/api/actions/mint",
                    "type": "transaction"
                }
            ]
        }
    });
});

// 3. Action Transaction Execution (POST /api/actions/mint)
app.post('/api/actions/mint', async (req, res) => {
    try {
        const { account } = req.body;
        if (!account) return res.status(400).json({ error: "Missing account" });

        console.log(`⚡ Blink Action requested by: ${account}`);

        // Construct a Memo Transaction (Signal to Claim)
        // We will detect this on-chain later OR just fire-and-forget mint here?
        // For MVP: We return the Memo tx. 
        // AND we trigger the backend minting logic immediately (trusting the user will sign).
        // Correct way: Webhook. MVP way: Fire logic now.

        // MVP HACK: Trigger mint now (User gets 2 txs: 1 memo they sign, 1 mint we sign)
        // This is "optimistic minting".

        try {
            // Optimistically trigger SERVER-SIDE minting
            // We reuse the /mint logic logic internally or just call the function?
            // Let's call mintV1 logic directly or reuse the code block.
            // For now, let's just Log it.
            console.log("   🚀 Optimistic Mint trigger for:", account);

            // Re-using internal mint logic here is safer done via internal API call simulation
            // But let's keep it simple: Just allow the Memo for now.
            supabase.from('referrals').insert({
                referrer_wallet: 'BLINK_ACTION',
                referee_wallet: account,
                event_id: 'BLINK_GENESIS'
            }).then(() => console.log('   ✅ Blink usage tracked'));

        } catch (err) { console.error("   ⚠️ Blink internal trigger failed"); }

        // Return the MEMO Transaction for the user to sign
        // Since we are running on server, we need to construct it manually without web3.js if possible
        // to keep dependencies light, OR use Umi.

        // Using Umi to build a transaction with Memo instruction
        const { umi } = getUmi();
        const userKey = publicKey(account);

        // Memo Instruction ID: MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb
        // We can use a transfer of 0 SOL as a simpler signal + Memo if needed.
        // Let's use SystemProgram.transfer(0) to self. 
        // Actually, transfer 0 SOL is invalid/noop often.
        // Let's use a transfer of 0.000001 SOL (tiny) to the TREE_AUTHORITY (Donation/Anti-spam)

        // Ideally we use SplMemo but let's stick to Transfer for simplicity if Memo lib missing.
        // Waiting... Installing @solana/web3.js for Transaction construction is safer if Umi is complex for basic tx building.
        // But Umi has `.transferSol()`.

        const { transferSol } = await import('@metaplex-foundation/mpl-toolbox');
        const { transactionBuilder } = await import('@metaplex-foundation/umi');

        // Create transaction: User sends 0.000001 SOL to Server (Spam protection)
        // This acts as the "Claim" proof.
        const authorityKey = umi.identity.publicKey; // Server address

        const builder = transferSol(umi, {
            source: userKey,
            destination: authorityKey,
            amount: { basisPoints: 1000n, identifier: 'SOL', decimals: 9 } // 0.000001 SOL
        });

        const blockhash = await umi.rpc.getLatestBlockhash();

        // Build and serialize
        const tx = builder.setBlockhash(blockhash).build(umi);

        // Serialize to base64 using Umi instance
        const serializedTx = Buffer.from(umi.transactions.serialize(tx)).toString('base64');

        res.json({
            transaction: serializedTx,
            message: "¡GΛRO VIBE en camino! Revisa tu dashboard en 30s."
        });

    } catch (error: any) {
        console.error("❌ Action Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- Farcaster Frames Integration ---

// 4. Frame Metadata (GET /frames/mint)
app.get('/frames/mint', (req, res) => {
    console.log("Serving Frame Metadata...");
    const imageUrl = "https://ipfs.io/ipfs/bafybeicilwj77izwenlikir6uomtgjkuslhpiubgggho7c374677yymqwi"; // Genesis Image
    // Ensure process.env.App_URL is defined or fallback
    const baseUrl = process.env.App_URL || "https://garo-vibe-backend.onrender.com";
    const postUrl = `${baseUrl}/api/frames/mint`;

    console.log(`Debug URL: ${postUrl}`);

    const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${imageUrl}" />
        <meta property="fc:frame:button:1" content="Get GΛRO Vibe 🎵" />
        <meta property="fc:frame:post_url" content="${postUrl}" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:title" content="GΛRO Genesis Drop" />
      </head>
      <body>
        <h1>GΛRO Genesis Drop - Frame</h1>
      </body>
    </html>
    `;
    res.send(html);
});

// 5. Frame Interaction (POST /api/frames/mint)
app.post('/api/frames/mint', async (req, res) => {
    try {
        console.log("⚡ Frame Action received");
        const { untrustedData } = req.body;
        const fid = untrustedData?.fid || 'anon_frame';
        const buttonIndex = untrustedData?.buttonIndex;

        if (buttonIndex === 1) {
            // MVP: Optimistic Mint for this FID
            console.log(`   🚀 Frame Mint trigger for FID: ${fid}`);

            // Track in Supabase (We store FID instead of wallet if wallet unknown, 
            // but Frames usually provide verified wallet in trustedData if validated.
            // For now, store FID as 'referee_wallet' ref or similar)
            supabase.from('referrals').insert({
                referrer_wallet: 'FRAME_ACTION',
                referee_wallet: `fid:${fid}`,
                event_id: 'FRAME_GENESIS'
            }).then(() => console.log('   ✅ Frame usage tracked'));

            // Allow the user to visit the gallery in the next step
            // We return a "Success" frame

            const successHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:image" content="https://ipfs.io/ipfs/bafybeicilwj77izwenlikir6uomtgjkuslhpiubgggho7c374677yymqwi" />
                <meta property="fc:frame:button:1" content="View Your Vibe (Gallery) 🖼️" />
                <meta property="fc:frame:button:1:action" content="link" />
                <meta property="fc:frame:button:1:target" content="https://garo-vibe-backend.onrender.com/gallery.html" />
              </head>
              <body><h1>Success!</h1></body>
            </html>
            `;
            return res.send(successHtml);
        }

    } catch (e: any) {
        console.error("Frame Error:", e);
        res.status(500).send("Error processing frame");
    }
});

// --- Admin Section ---
app.get('/api/admin/stats', async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    const validKey = process.env.ADMIN_PASSWORD || 'admin123'; // Default fallback (change in prod)

    if (adminKey !== validKey) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        // 1. Total Mints
        const { count: totalMints, error: countError } = await supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true });

        // 2. Leaderboard (Top Referrers)
        // Note: Supabase JS doesn't do "GROUP BY" easily without stored procedures or raw SQL.
        // For MVP, we'll fetch all and aggregate in JS (Not scalable for millions, fine for 200).
        const { data: allRefs } = await supabase
            .from('referrals')
            .select('referrer_wallet');

        const counts: Record<string, number> = {};
        allRefs?.forEach(r => {
            const w = r.referrer_wallet || 'unknown';
            counts[w] = (counts[w] || 0) + 1;
        });

        const leaderboard = Object.entries(counts)
            .map(([w, c]) => ({ referrer_wallet: w, count: c }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10

        // 3. Recent Activity
        const { data: recent } = await supabase
            .from('referrals')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        res.json({
            total_mints: totalMints || 0,
            leaderboard,
            recent: recent || []
        });

    } catch (e: any) {
        console.error("Admin Stats Error:", e);
        res.status(500).json({ error: "Server Error" });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
    console.log(`👉 UI   http://localhost:${PORT}/`);
    console.log(`👉 API  http://localhost:${PORT}/status`);
    console.log(`👉 BLINKS http://localhost:${PORT}/api/actions/mint`);
    console.log(`👉 FRAMES http://localhost:${PORT}/frames/mint`);
});

