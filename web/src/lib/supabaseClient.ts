
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lllyejsabiwwzcumemgt.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsbHllanNhYml3d3pjdW1lbWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODEwMjYsImV4cCI6MjA4MTA1NzAyNn0.SWkEeEFr90p5IY0Dfj1NgoG6S6UiB86wyuhbOBj7ZTE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
