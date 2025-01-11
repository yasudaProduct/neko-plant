// import { createClient } from "@supabase/supabase-js";

// const supabaseUrl = 'https://zywckgouytajnciajkhk.supabase.co';
// const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5d2NrZ291eXRham5jaWFqa2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2NDQ0NjEsImV4cCI6MjA0NjIyMDQ2MX0.J5j_CNqkun5SPlLZ64CZCnapm3UarlKDpE-AA7l8LlQ';

// export const supabase = createClient(supabaseUrl, supabaseKey);

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}