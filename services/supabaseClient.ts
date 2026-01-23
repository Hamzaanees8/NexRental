
import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase URL and anon key
const supabaseUrl = 'https://tgpmimpzlunsjtxdjikw.supabase.co';
const supabaseAnonKey = 'sb_publishable_9FFN2jE1rNE2hUrgx_OcPw_qW5ovFvn';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
