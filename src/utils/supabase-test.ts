// Utility untuk testing koneksi Supabase
import { supabase } from '@/integrations/supabase/client';

export const testSupabaseConnection = async () => {
  const results = {
    connection: false,
    auth: false,
    database: false,
    storage: false,
    rls: false,
    tables: {
      profiles: false,
      absensi: false,
      lokasi_valid: false,
      shift: false,
      makeup_requests: false
    },
    errors: [] as string[]
  };

  try {
    console.log('🔍 Testing Supabase Connection...');
    
    // 1. Test basic connection
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (!error) {
        results.connection = true;
        console.log('✅ Basic connection: OK');
      } else {
        results.errors.push(`Connection error: ${error.message}`);
        console.log('❌ Basic connection: FAILED');
      }
    } catch (err: any) {
      results.errors.push(`Connection exception: ${err.message}`);
      console.log('❌ Basic connection: EXCEPTION');
    }

    // 2. Test authentication
    try {
      const { data: { session } } = await supabase.auth.getSession();
      results.auth = true;
      console.log('✅ Auth service: OK');
      console.log('📊 Current session:', session ? 'Authenticated' : 'Not authenticated');
    } catch (err: any) {
      results.errors.push(`Auth error: ${err.message}`);
      console.log('❌ Auth service: FAILED');
    }

    // 3. Test database tables
    const tables = ['profiles', 'absensi', 'lokasi_valid', 'shift', 'makeup_requests'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!error) {
          results.tables[table as keyof typeof results.tables] = true;
          console.log(`✅ Table ${table}: OK`);
        } else {
          results.errors.push(`Table ${table} error: ${error.message}`);
          console.log(`❌ Table ${table}: FAILED - ${error.message}`);
        }
      } catch (err: any) {
        results.errors.push(`Table ${table} exception: ${err.message}`);
        console.log(`❌ Table ${table}: EXCEPTION - ${err.message}`);
      }
    }

    // 4. Test storage
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (!error) {
        results.storage = true;
        console.log('✅ Storage service: OK');
        console.log('📦 Available buckets:', data?.map(b => b.name).join(', ') || 'None');
      } else {
        results.errors.push(`Storage error: ${error.message}`);
        console.log('❌ Storage service: FAILED');
      }
    } catch (err: any) {
      results.errors.push(`Storage exception: ${err.message}`);
      console.log('❌ Storage service: EXCEPTION');
    }

    // 5. Test RLS policies (if authenticated)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id);
        
        if (!error) {
          results.rls = true;
          console.log('✅ RLS policies: OK');
        } else {
          results.errors.push(`RLS error: ${error.message}`);
          console.log('❌ RLS policies: FAILED');
        }
      } else {
        console.log('⚠️ RLS test skipped: Not authenticated');
      }
    } catch (err: any) {
      results.errors.push(`RLS exception: ${err.message}`);
      console.log('❌ RLS policies: EXCEPTION');
    }

    console.log('🏁 Supabase connection test completed');
    return results;
    
  } catch (error: any) {
    console.error('💥 Critical error during Supabase test:', error);
    results.errors.push(`Critical error: ${error.message}`);
    return results;
  }
};

export const getSupabaseInfo = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || 'Not configured';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'Not configured';
  
  return {
    url,
    keyLength: key.length,
    keyPreview: key.substring(0, 20) + '...',
    isConfigured: url !== 'Not configured' && key !== 'Not configured'
  };
};

// Function to check environment variables
export const checkEnvironmentConfig = () => {
  const config = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    nodeEnv: import.meta.env.NODE_ENV,
    mode: import.meta.env.MODE
  };

  console.log('🔧 Environment Configuration:');
  console.log('- Supabase URL:', config.supabaseUrl ? '✅ Configured' : '❌ Missing');
  console.log('- Supabase Key:', config.supabaseKey ? '✅ Configured' : '❌ Missing');
  console.log('- Node Environment:', config.nodeEnv);
  console.log('- Vite Mode:', config.mode);

  return config;
};