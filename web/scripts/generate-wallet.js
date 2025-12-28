
const { Keypair } = require("@solana/web3.js");

const keypair = Keypair.generate();
console.log("=== NEW ADMIN KEYPAIR ===");
console.log("ADDRESS:" + keypair.publicKey.toBase58());
console.log("SECRET:" + JSON.stringify(Array.from(keypair.secretKey)));
console.log("=========================");
