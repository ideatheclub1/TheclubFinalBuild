const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixConversation() {
  try {
    console.log('🔍 Finding all conversations...');
    
    // Find all conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
      return;
    }
    
    console.log(`📋 Found ${conversations?.length || 0} conversations`);
    
    if (!conversations || conversations.length === 0) {
      console.log('⚠️ No conversations found');
      return;
    }
    
    // Process each conversation
    for (const conversation of conversations) {
      console.log(`\n🔄 Processing conversation: ${conversation.id}`);
      await fixSingleConversation(conversation.id);
    }
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

async function fixSingleConversation(conversationId) {
  try {
    // Check current participants
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId);
      
    console.log(`👥 Current participants: ${participants?.length || 0}`);
    
    // Check messages to find who should be participants
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('sender_id, content, created_at')
      .eq('conversation_id', conversationId);
      
    if (msgError) {
      console.error('❌ Error fetching messages:', msgError);
      return;
    }
    
    console.log(`💬 Messages found: ${messages?.length || 0}`);
    
    if (!messages || messages.length === 0) {
      console.log('⚠️ No messages found - skipping this conversation');
      return;
    }
    
    // Get unique sender IDs
    const senderIds = [...new Set(messages.map(m => m.sender_id))];
    console.log(`🎯 Unique senders: ${senderIds.length}`);
    
    // Check if participants already exist
    const existingParticipants = participants?.map(p => p.user_id) || [];
    const missingParticipants = senderIds.filter(id => !existingParticipants.includes(id));
    
    if (missingParticipants.length === 0) {
      console.log('✅ All participants already exist');
      return;
    }
    
    console.log(`➕ Adding ${missingParticipants.length} missing participants`);
    
    // Add missing participants
    for (const senderId of missingParticipants) {
      const { error: insertError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversationId,
          user_id: senderId
        });
        
      if (insertError) {
        console.error(`❌ Error adding participant ${senderId}:`, insertError);
      } else {
        console.log(`✅ Added participant: ${senderId}`);
      }
    }
    
    console.log('✅ Fix completed for this conversation');
    
  } catch (error) {
    console.error('❌ Error fixing conversation:', error);
  }
}

fixConversation();
