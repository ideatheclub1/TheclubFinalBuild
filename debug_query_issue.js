const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugQuery() {
  console.log('🔍 Debugging the query issue...');
  
  const userId = '972be8f0-272f-405d-a278-5b68fa0302a4';
  const conversationId = '7c963b92-6a29-4165-a2b1-2b584e9fa9a8';
  
  try {
    // 1. Check if participants exist directly
    console.log('1️⃣ Checking participants directly...');
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId);
    
    console.log('Participants result:', { data: participants, error: partError });
    
    // 2. Check with user profiles join
    console.log('2️⃣ Checking with user profiles join...');
    const { data: participantsWithProfiles, error: profileError } = await supabase
      .from('conversation_participants')
      .select(`
        *,
        user_profiles(id, username, full_name)
      `)
      .eq('conversation_id', conversationId);
    
    console.log('Participants with profiles:', { data: participantsWithProfiles, error: profileError });
    
    // 3. Test the exact app query
    console.log('3️⃣ Testing exact app query...');
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
    
    console.log('App query result:', { data: appQuery, error: appError });
    
    // 4. Test simplified app query
    console.log('4️⃣ Testing simplified app query...');
    const { data: simpleQuery, error: simpleError } = await supabase
      .from('conversations')
      .select(`
        id,
        conversation_participants(
          user_id,
          user_profiles(id, username, full_name)
        )
      `)
      .eq('id', conversationId);
    
    console.log('Simple query result:', { data: simpleQuery, error: simpleError });
    
    // 5. Test with LEFT JOIN instead of INNER JOIN
    console.log('5️⃣ Testing with different join approach...');
    const { data: leftJoinQuery, error: leftJoinError } = await supabase
      .from('conversations')
      .select(`
        id,
        conversation_participants!left(
          user_id,
          user_profiles(id, username, full_name)
        )
      `)
      .eq('id', conversationId);
    
    console.log('Left join query result:', { data: leftJoinQuery, error: leftJoinError });
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  }
}

debugQuery();
