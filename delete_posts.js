// Quick script to delete specific posts
import { createClient } from '@supabase/supabase-js';

// You'll need to add your Supabase credentials
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY; // Use service role key for admin operations

const supabase = createClient(supabaseUrl, supabaseKey);

async function deletePosts() {
  const postIds = [
    '22e869de-c158-4e59-a4b4-20a3e3f3944c',
    '25322aa4-aec6-4e79-a179-20ec83900932'
  ];

  try {
    console.log('Deleting posts...');
    
    const { data, error } = await supabase
      .from('posts')
      .delete()
      .in('id', postIds);

    if (error) {
      console.error('Error deleting posts:', error);
      return;
    }

    console.log('Successfully deleted posts:', postIds);
    console.log('Deleted data:', data);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the deletion
deletePosts();

