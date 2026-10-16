import dotenv from 'dotenv';
import { testSupabaseConnection, SUPABASE_CONFIG } from './supabase.js';
import { storage } from './storage.js';

dotenv.config();

export async function initDatabase() {
  console.log(`Connecting to Supabase Database (${SUPABASE_CONFIG.url})...`);
  try {
    const status = await testSupabaseConnection();

    if (status.connected) {
      if (status.tablesFound) {
        console.log('✅ Supabase PostgreSQL database connected and tables verified.');
        storage.setSupabaseConnected(true);
        // Automatically sync latest records from Supabase into memory cache
        await storage.syncFromSupabase();
      } else {
        console.log(`ℹ️ Supabase connected (${status.url}). Tables pending schema execution: ${status.error || 'Run schema.sql in Supabase SQL editor'}. Active with synchronized resilient fallback.`);
        storage.setSupabaseConnected(true);
      }
    } else {
      console.warn(`⚠️ Supabase connection warning: ${status.error || 'Check network / API key'}. Active with local fallback storage.`);
      storage.setSupabaseConnected(false);
    }
  } catch (err: any) {
    console.warn(`Supabase initialization notice: ${err.message}. Operating with local persistence.`);
    storage.setSupabaseConnected(false);
  }
}
