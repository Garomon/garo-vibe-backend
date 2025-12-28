
require('dotenv').config({ path: '.env.local' });
const { Keypair } = require("@solana/web3.js");
const fs = require('fs');
const path = require('path');

const TARGET_PUBKEY = "4n4mV9vqdhSkupqzPJyJqSTxVotkh9JrgQ8DiLSad8FB";

function repair() {
    console.log("Attempting to repair key...");
    const secretKeyString = process.env.SOLANA_ADMIN_PRIVATE_KEY;
    if (!secretKeyString) return console.error("No key found");

    try {
        const fullArr = JSON.parse(secretKeyString);
        console.log("Current Length:", fullArr.length);

        // Take first 32 bytes (The Seed)
        const seed = Uint8Array.from(fullArr.slice(0, 32));

        // Re-derive Keypair
        const kp = Keypair.fromSeed(seed);
        const derivedPub = kp.publicKey.toBase58();

        console.log("Derived Pubkey:", derivedPub);
        console.log("Target Pubkey: ", TARGET_PUBKEY);

        if (derivedPub === TARGET_PUBKEY) {
            console.log("✅ MATCH! Key recovered.");
            const correctSecret = Array.from(kp.secretKey);

            // Write back to .env.local
            const envPath = path.join(__dirname, '../.env.local');
            let envContent = fs.readFileSync(envPath, 'utf8');

            // Replace the key line
            const newLine = `SOLANA_ADMIN_PRIVATE_KEY=[${correctSecret.toString()}]`;

            // Regex to replace existing line
            // Note: mimicking checking line by line would be safer but simple replace works if unique
            // But formatting in file is: SOLANA_ADMIN_PRIVATE_KEY=[...] 
            // We'll read, split, replace, join
            const lines = envContent.split('\n');
            const newLines = lines.map(l => {
                if (l.startsWith('SOLANA_ADMIN_PRIVATE_KEY=')) {
                    return newLine;
                }
                return l;
            });

            fs.writeFileSync(envPath, newLines.join('\n'));
            console.log("✅ .env.local updated with corrected key.");
        } else {
            console.error("❌ Mismatch. The seed does not belong to the target wallet.");
            console.log("This means the first 32 bytes were also corrupted.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

repair();
