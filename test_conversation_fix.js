const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConversationQuery() {
  console.log('🧪 Testing conversation query without title column...');
  
  const userId = '972be8f0-272f-405d-a278-5b68fa0302a4';
  
  try {
    // Test the exact query the app is now using
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id, conversation_type, created_by, created_at, updated_at,
        conversation_participants(
          user_id,
          user_profiles!conversation_participants_user_id_fkey(
            id, username, handle, full_name, avatar, profile_picture, is_online, last_seen
          )
        ),
        messages(
          id, content, created_at, sender_id, is_read, message_type,
          user_profiles!messages_sender_id_fkey(username, avatar)
        )
      `)
      .eq('conversation_participants.user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Query failed:', error);
      return;
    }

    console.log('✅ Query successful!');
    console.log('📊 Found conversations:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('🔍 First conversation details:');
      const conv = data[0];
      console.log('  - ID:', conv.id);
      console.log('  - Type:', conv.conversation_type);
      console.log('  - Participants:', conv.conversation_participants?.length || 0);
      console.log('  - Messages:', conv.messages?.length || 0);
      
      if (conv.conversation_participants && conv.conversation_participants.length > 0) {
        console.log('  - First participant:', conv.conversation_participants[0].user_profiles?.username || 'Unknown');
      }
    }
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testConversationQuery();
