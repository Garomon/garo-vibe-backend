
const { Connection, PublicKey } = require("@solana/web3.js");

const RPC_URL = "https://api.devnet.solana.com";
const ADMIN_WALLET = "4n4mV9vqdhSkupqzPJyJqSTxVotkh9JrgQ8DiLSad8FB";

async function checkBalance() {
    const connection = new Connection(RPC_URL, "confirmed");
    const publicKey = new PublicKey(ADMIN_WALLET);
    try {
        const balance = await connection.getBalance(publicKey);
        console.log(`Balance for ${ADMIN_WALLET}: ${balance / 1000000000} SOL`);
    } catch (e) {
        console.error("Error fetching balance:", e);
    }
}

checkBalance();
