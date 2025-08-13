const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAvatarDisplay() {
  console.log('🖼️ Testing avatar display in conversation...');
  
  const userId = '972be8f0-272f-405d-a278-5b68fa0302a4';
  
  try {
    // Simulate the exact app logic
    const { data: userConversations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    const conversationIds = userConversations.map(cp => cp.conversation_id);

    const { data } = await supabase
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

    if (data && data.length > 0) {
      const conv = data[0];
      
      // Apply the same logic as the app
      const otherParticipants = conv.conversation_participants
        .filter((p) => p.user_id !== userId)
        .map((p) => ({
          id: p.user_profiles.id,
          username: p.user_profiles.username || p.user_profiles.handle || '',
          avatar: p.user_profiles.avatar || p.user_profiles.profile_picture || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
          fullName: p.user_profiles.full_name || '',
          isOnline: p.user_profiles.is_online || false,
          lastSeen: p.user_profiles.last_seen || '',
        }));

      console.log('✅ Conversation processed successfully!');
      console.log('\n📋 Conversation Display Data:');
      console.log('- Conversation ID:', conv.id);
      console.log('- Type:', conv.conversation_type);
      
      if (otherParticipants.length > 0) {
        const otherUser = otherParticipants[0];
        console.log('\n👤 Other Participant (what will be displayed):');
        console.log('- Username:', otherUser.username);
        console.log('- Full Name:', otherUser.fullName);
        console.log('- Avatar URL:', otherUser.avatar);
        console.log('- Has Avatar:', otherUser.avatar ? '✅ Yes' : '❌ No (will show placeholder)');
        console.log('- Is Online:', otherUser.isOnline ? '🟢 Online' : '⚫ Offline');
      }

      // Get last message for preview
      const latestMessage = conv.messages && conv.messages.length > 0 
        ? conv.messages.reduce((latest, msg) => 
            new Date(msg.created_at) > new Date(latest.created_at) ? msg : latest
          )
        : null;

      console.log('\n💬 Last Message Preview:');
      console.log('- Content:', latestMessage?.content || 'No messages yet');
      console.log('- Timestamp:', latestMessage?.created_at || 'N/A');
      
      console.log('\n🎨 UI Elements that will be displayed:');
      console.log('- Avatar: 50x50 circular image or purple placeholder with user icon');
      console.log('- Username: "' + (otherParticipants[0]?.username || 'Unknown') + '"');
      console.log('- Message Preview: "' + (latestMessage?.content || 'No messages yet') + '"');
      console.log('- Time: Formatted timestamp');
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testAvatarDisplay();
