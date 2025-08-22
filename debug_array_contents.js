const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugArrayContents() {
  console.log('🔍 Debugging array contents...');
  
  const userId = '972be8f0-272f-405d-a278-5b68fa0302a4';
  
  try {
    // Test the exact app query and log full contents
    const { data: appQuery, error: appError } = await supabase
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
    
    if (appError) {
      console.error('❌ App query error:', appError);
      return;
    }
    
    console.log('✅ App query successful!');
    console.log('📊 Number of conversations:', appQuery?.length || 0);
    
    if (appQuery && appQuery.length > 0) {
      const conv = appQuery[0];
      console.log('\n🔍 First conversation details:');
      console.log('- ID:', conv.id);
      console.log('- Type:', conv.conversation_type);
      console.log('- Created by:', conv.created_by);
      
      console.log('\n👥 Participants array:');
      console.log('- Length:', conv.conversation_participants?.length || 0);
      console.log('- Full contents:', JSON.stringify(conv.conversation_participants, null, 2));
      
      if (conv.conversation_participants && conv.conversation_participants.length > 0) {
        console.log('\n🔍 First participant details:');
        const firstParticipant = conv.conversation_participants[0];
        console.log('- User ID:', firstParticipant.user_id);
        console.log('- User Profiles:', JSON.stringify(firstParticipant.user_profiles, null, 2));
      }
      
      console.log('\n💬 Messages array:');
      console.log('- Length:', conv.messages?.length || 0);
      if (conv.messages && conv.messages.length > 0) {
        console.log('- Last message:', conv.messages[0]?.content);
      }
    }
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  }
}

debugArrayContents();

