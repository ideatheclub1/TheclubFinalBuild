const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCurrentConversation() {
  console.log('🔧 Fixing current conversation...');
  
  const conversationId = '7c963b92-6a29-4165-a2b1-2b584e9fa9a8';
  const userId = '972be8f0-272f-405d-a278-5b68fa0302a4';
  
  try {
    // Check if conversation exists
    console.log('🔍 Checking conversation...');
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    if (convError || !conversation) {
      console.error('❌ Conversation not found:', convError);
      return;
    }
    
    console.log('✅ Conversation found:', conversation.id);
    
    // Check if participant already exists
    console.log('👥 Checking participants...');
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    
    if (partError) {
      console.error('❌ Error checking participants:', partError);
      return;
    }
    
    if (participants && participants.length > 0) {
      console.log('✅ Participant already exists');
      return;
    }
    
    // Add the missing participant
    console.log('➕ Adding missing participant...');
    const { data: newParticipant, error: insertError } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: conversationId,
        user_id: userId
      })
      .select('*')
      .single();
    
    if (insertError) {
      console.error('❌ Failed to add participant:', insertError);
      return;
    }
    
    console.log('✅ Participant added successfully:', newParticipant);
    
    // Verify the fix by testing the query
    console.log('🧪 Testing the fix...');
    const { data: testData, error: testError } = await supabase
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
    
    if (testError) {
      console.error('❌ Test query failed:', testError);
      return;
    }
    
    console.log('✅ Test query successful!');
    console.log('📊 Found conversations:', testData?.length || 0);
    
    if (testData && testData.length > 0) {
      const conv = testData[0];
      console.log('🔍 First conversation:');
      console.log('  - ID:', conv.id);
      console.log('  - Participants:', conv.conversation_participants?.length || 0);
      
      if (conv.conversation_participants && conv.conversation_participants.length > 0) {
        console.log('  - First participant:', conv.conversation_participants[0].user_profiles?.username || 'Unknown');
      }
    }
    
    console.log('🎉 Fix completed! Refresh your app now.');
    
  } catch (error) {
    console.error('💥 Fix failed:', error);
  }
}

fixCurrentConversation();
