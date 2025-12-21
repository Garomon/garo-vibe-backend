
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from CWD (Root)
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("🔌 Checking Supabase Connection...");
    console.log("   URL:", supabaseUrl?.slice(0, 20) + "...");

    // Check 'referrals' table
    const { count, error } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("❌ Error connecting to 'referrals' table:", error.message);
        console.error("   Hint: Does the table exist in this project?");
    } else {
        console.log("✅ Connection Successful!");
        console.log("   Table 'referrals' contains", count, "rows.");
    }
}

check();
