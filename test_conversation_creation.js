const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConversationCreation() {
  try {
    console.log('🧪 Testing conversation creation with fixed code...');
    
    const currentUserId = '972be8f0-272f-405d-a278-5b68fa0302a4';
    const otherUserId = 'test-user-id'; // You can replace with a real user ID
    
    console.log(`👥 Creating conversation between ${currentUserId} and ${otherUserId}`);
    
    // Step 1: Create conversation
    const conversationData = {
      conversation_type: 'direct',
      created_by: currentUserId
    };
    
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();
    
    if (convError) {
      console.error('❌ Failed to create conversation:', convError);
      return;
    }
    
    console.log('✅ Conversation created:', conversation.id);
    
    // Step 2: Add participants (this is the part that was broken)
    const participantData = [
      {
        conversation_id: conversation.id,
        user_id: currentUserId
      },
      {
        conversation_id: conversation.id,
        user_id: otherUserId
      }
    ];
    
    console.log('👥 Adding participants...');
    
    const { error: participantError } = await supabase
      .from('conversation_participants')
      .insert(participantData);
    
    if (participantError) {
      console.error('❌ Failed to add participants:', participantError);
      
      // Clean up the conversation
      await supabase.from('conversations').delete().eq('id', conversation.id);
      console.log('🧹 Cleaned up conversation');
      return;
    }
    
    console.log('✅ Participants added successfully');
    
    // Step 3: Verify the conversation has participants
    const { data: participants, error: verifyError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversation.id);
    
    if (verifyError) {
      console.error('❌ Error verifying participants:', verifyError);
    } else {
      console.log(`🎉 SUCCESS! Conversation has ${participants.length} participants:`, participants.map(p => p.user_id));
    }
    
    // Step 4: Test the getConversations query (what the UI uses)
    console.log('🔍 Testing UI query...');
    
    const { data: conversations, error: queryError } = await supabase
      .from('conversations')
      .select(`
        id,
        conversation_type,
        title,
        updated_at,
        conversation_participants!inner (
          user_id,
          user_profiles!conversation_participants_user_id_fkey (
            id,
            username,
            full_name,
            avatar,
            profile_picture
          )
        )
      `)
      .eq('conversation_participants.user_id', currentUserId)
      .order('updated_at', { ascending: false });
    
    if (queryError) {
      console.error('❌ UI query failed:', queryError);
    } else {
      console.log(`🎉 UI query SUCCESS! Found ${conversations.length} conversations`);
      if (conversations.length > 0) {
        const conv = conversations[0];
        console.log(`📋 Conversation: ${conv.id}`);
        console.log(`👥 Participants: ${conv.conversation_participants?.length || 0}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testConversationCreation();