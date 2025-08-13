const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMessageSending() {
  try {
    console.log('🧪 Testing message sending...');
    
    const currentUserId = '972be8f0-272f-405d-a278-5b68fa0302a4';
    
    // First, check if there are any conversations
    console.log('🔍 Checking for existing conversations...');
    
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, conversation_type, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
      return;
    }
    
    console.log(`📋 Found ${conversations?.length || 0} conversations`);
    
    if (!conversations || conversations.length === 0) {
      console.log('⚠️ No conversations found - cannot test message sending');
      return;
    }
    
    const testConversationId = conversations[0].id;
    console.log(`🎯 Testing with conversation: ${testConversationId}`);
    
    // Check if user is a participant
    console.log('👥 Checking if user is a participant...');
    
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', testConversationId)
      .eq('user_id', currentUserId);
    
    if (partError) {
      console.error('❌ Error checking participants:', partError);
      return;
    }
    
    if (!participants || participants.length === 0) {
      console.log('⚠️ User is not a participant in this conversation');
      return;
    }
    
    console.log('✅ User is a participant');
    
    // Try to send a test message
    console.log('💬 Attempting to send test message...');
    
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: testConversationId,
        sender_id: currentUserId,
        content: 'Test message from script',
        message_type: 'text'
      })
      .select('*')
      .single();
    
    if (msgError) {
      console.error('❌ Failed to send message:', msgError);
      
      // Try without message_type
      console.log('🔄 Trying without message_type...');
      
      const { data: message2, error: msgError2 } = await supabase
        .from('messages')
        .insert({
          conversation_id: testConversationId,
          sender_id: currentUserId,
          content: 'Test message from script (no message_type)'
        })
        .select('*')
        .single();
      
      if (msgError2) {
        console.error('❌ Failed to send message (without message_type):', msgError2);
        return;
      } else {
        console.log('✅ Message sent successfully (without message_type):', message2.id);
      }
    } else {
      console.log('✅ Message sent successfully:', message.id);
    }
    
    // Check if conversation timestamp was updated
    console.log('🕐 Checking if conversation timestamp was updated...');
    
    const { data: updatedConv, error: updateError } = await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', testConversationId)
      .select('updated_at')
      .single();
    
    if (updateError) {
      console.error('❌ Failed to update conversation timestamp:', updateError);
    } else {
      console.log('✅ Conversation timestamp updated:', updatedConv.updated_at);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testMessageSending();
