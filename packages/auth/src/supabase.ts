import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client configuration for authentication
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  jwt?: {
    secret: string;
    autoRefreshToken?: boolean;
    persistSession?: boolean;
  };
}

/**
 * Creates a Supabase client instance for authentication
 */
export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  const options = {
    auth: {
      autoRefreshToken: config.jwt?.autoRefreshToken ?? true,
      persistSession: config.jwt?.persistSession ?? true,
      detectSessionInUrl: false, // Disable for server-side usage
    },
  };

  return createClient(config.url, config.anonKey, options);
}

/**
 * Creates a Supabase client for server-side authentication
 * This client is configured for API usage without session persistence
 */
export function createSupabaseServerClient(config: SupabaseConfig): SupabaseClient {
  const options = {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  };

  return createClient(config.url, config.anonKey, options);
}

/**
 * Default Supabase client instance
 * This should be initialized with environment variables
 */
let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize the default Supabase client
 */
export function initializeSupabase(config: SupabaseConfig): void {
  supabaseClient = createSupabaseClient(config);
}

/**
 * Get the default Supabase client
 * Throws an error if not initialized
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call initializeSupabase first.');
  }
  return supabaseClient;
}

/**
 * Environment variable helpers for Supabase configuration
 */
export function getSupabaseConfigFromEnv(): SupabaseConfig {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!url || !anonKey) {
    throw new Error('Missing required Supabase environment variables: SUPABASE_URL, SUPABASE_ANON_KEY');
  }

  return {
    url,
    anonKey,
    jwt: jwtSecret ? { secret: jwtSecret } : undefined,
  };
}