
const { Keypair } = require("@solana/web3.js");
const fs = require('fs');
const path = require('path');

function generateAndSave() {
    console.log("Generating new wallet...");
    const kp = Keypair.generate();
    const address = kp.publicKey.toBase58();
    const secret = JSON.stringify(Array.from(kp.secretKey));

    console.log("New Address:", address);

    const envPath = path.join(__dirname, '../.env.local');
    let content = "";
    if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
    }

    // Remove existing key line if present
    const lines = content.split('\n').filter(line => !line.startsWith('SOLANA_ADMIN_PRIVATE_KEY='));

    // Append new key
    lines.push(`SOLANA_ADMIN_PRIVATE_KEY=${secret}`);

    // Filter empty lines to clean up
    const finalContent = lines.filter(l => l.trim() !== '').join('\n') + '\n';

    fs.writeFileSync(envPath, finalContent);
    console.log("✅ Saved to .env.local successfully.");
}

generateAndSave();
