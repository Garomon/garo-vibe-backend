
require('dotenv').config({ path: '.env.local' });

const secretKeyString = process.env.SOLANA_ADMIN_PRIVATE_KEY;
if (!secretKeyString) {
    console.error("Missing Key");
} else {
    try {
        const arr = JSON.parse(secretKeyString);
        console.log("Key Length:", arr.length);
        console.log("First 5 bytes:", arr.slice(0, 5));
    } catch (e) {
        console.error("JSON Parse Error:", e.message);
    }
}
