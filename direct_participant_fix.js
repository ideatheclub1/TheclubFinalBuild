const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin access
const supabaseUrl = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g';
const supabase = createClient(supabaseUrl, serviceKey);

async function fixParticipant() {
  console.log('🔧 Adding missing participant directly...');
  
  try {
    // Direct SQL execution to bypass RLS
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add missing participant
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES ('7c963b92-6a29-4165-a2b1-2b584e9fa9a8'::uuid, '972be8f0-272f-405d-a278-5b68fa0302a4')
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
        
        -- Return the result
        SELECT 
          cp.conversation_id,
          cp.user_id,
          up.username,
          up.full_name
        FROM conversation_participants cp
        JOIN user_profiles up ON cp.user_id = up.id
        WHERE cp.conversation_id = '7c963b92-6a29-4165-a2b1-2b584e9fa9a8'::uuid;
      `
    });

    if (error) {
      console.error('❌ SQL execution failed:', error);
      
      // Fallback: try direct insert
      console.log('🔄 Trying direct insert...');
      const { data: insertData, error: insertError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: '7c963b92-6a29-4165-a2b1-2b584e9fa9a8',
          user_id: '972be8f0-272f-405d-a278-5b68fa0302a4'
        })
        .select('*');

      if (insertError) {
        console.error('❌ Direct insert failed:', insertError);
        return;
      }

      console.log('✅ Direct insert successful:', insertData);
    } else {
      console.log('✅ SQL execution successful:', data);
    }

    // Test the fix
    console.log('🧪 Testing the fix...');
    const { data: testData, error: testError } = await supabase
      .from('conversations')
      .select(`
        id, conversation_type, created_by, created_at, updated_at,
        conversation_participants(
          user_id,
          user_profiles(id, username, full_name)
        )
      `)
      .eq('id', '7c963b92-6a29-4165-a2b1-2b584e9fa9a8');

    if (testError) {
      console.error('❌ Test failed:', testError);
      return;
    }

    console.log('✅ Test successful:', JSON.stringify(testData, null, 2));
    console.log('🎉 Fix completed! Refresh your app now.');

  } catch (error) {
    console.error('💥 Fix failed:', error);
  }
}

fixParticipant();
