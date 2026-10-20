import { createClient } from '@supabase/supabase-js';

declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_SUPABASE_URL?: string;
      readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
    };
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be configured.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);