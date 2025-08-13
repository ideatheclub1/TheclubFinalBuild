const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedQuery() {
  console.log('🧪 Testing the fixed query approach...');
  
  const userId = '972be8f0-272f-405d-a278-5b68fa0302a4';
  
  try {
    // Step 1: Get conversations where user is a participant
    console.log('1️⃣ Getting user conversations...');
    const { data: userConversations, error: userConvError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (userConvError) {
      console.error('❌ User conversations query failed:', userConvError);
      return;
    }

    console.log('✅ User conversations found:', userConversations?.length || 0);
    console.log('📋 Conversation IDs:', userConversations?.map(cp => cp.conversation_id));

    if (!userConversations || userConversations.length === 0) {
      console.log('⚠️ No conversations found for user');
      return;
    }

    const conversationIds = userConversations.map(cp => cp.conversation_id);

    // Step 2: Get full conversation data with ALL participants
    console.log('2️⃣ Getting full conversation data...');
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
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Full conversation query failed:', error);
      return;
    }

    console.log('✅ Full conversation query successful!');
    console.log('📊 Conversations found:', data?.length || 0);

    if (data && data.length > 0) {
      const conv = data[0];
      console.log('\n🔍 First conversation:');
      console.log('- ID:', conv.id);
      console.log('- Type:', conv.conversation_type);
      
      console.log('\n👥 ALL Participants:');
      console.log('- Count:', conv.conversation_participants?.length || 0);
      
      if (conv.conversation_participants) {
        conv.conversation_participants.forEach((p, index) => {
          console.log(`  ${index + 1}. User ID: ${p.user_id}`);
          console.log(`     Username: ${p.user_profiles?.username || 'N/A'}`);
          console.log(`     Full Name: ${p.user_profiles?.full_name || 'N/A'}`);
        });
      }
      
      // Test the filtering logic
      console.log('\n🔍 After filtering (other participants):');
      const otherParticipants = conv.conversation_participants
        ?.filter((p) => p.user_id !== userId)
        ?.map((p) => ({
          id: p.user_profiles?.id,
          username: p.user_profiles?.username || p.user_profiles?.handle || '',
          fullName: p.user_profiles?.full_name || '',
          avatar: p.user_profiles?.avatar || p.user_profiles?.profile_picture || '',
        }));
      
      console.log('- Other participants count:', otherParticipants?.length || 0);
      if (otherParticipants && otherParticipants.length > 0) {
        otherParticipants.forEach((p, index) => {
          console.log(`  ${index + 1}. Username: ${p.username}`);
          console.log(`     Full Name: ${p.fullName}`);
          console.log(`     Avatar: ${p.avatar}`);
        });
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testFixedQuery();
