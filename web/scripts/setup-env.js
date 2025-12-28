
const fs = require('fs');
const path = require('path');

const envContent = `NEXT_PUBLIC_SUPABASE_URL=https://lllyejsabiwwzcumemgt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsbHllanNhYml3d3pjdW1lbWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODEwMjYsImV4cCI6MjA4MTA1NzAyNn0.SWkEeEFr90p5IY0Dfj1NgoG6S6UiB86wyuhbOBj7ZTE
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=BPi5PB_UiJZ-CPTCpMm9vTqKhaTZZ9q_gG_K0p1_8_H0_0_0
NEXT_PUBLIC_APP_URL=http://localhost:3000
SOLANA_ADMIN_PRIVATE_KEY=[104,166,223,176,145,59,126,19,57,91,11,64,4,108,233,142,161,88,60,74,36,95,79,101,178,226,219,37,248,71,119,48,12,221,43,181,47,45,204,70,81,214,77,30,55,22,150,165,223,154,248,163,194,59,207,175,32,187,20,53,60,119,100,50]
`;

fs.writeFileSync(path.join(__dirname, '../.env.local'), envContent);
console.log(".env.local has been written successfully.");
