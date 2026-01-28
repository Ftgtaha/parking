
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkZones() {
    const { data, error } = await supabase.from('zones').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Zones Data:', JSON.stringify(data, null, 2));
    }
}

checkZones();
