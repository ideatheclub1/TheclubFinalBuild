import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { debug } from '@/utils/debugLogger';
import { dataService } from '@/services/dataService';
import { useUser } from '@/contexts/UserContext';
import { Post, Reel } from '@/types';

const DeleteFunctionTest = () => {
  const { user: currentUser } = useUser();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReels, setUserReels] = useState<Reel[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUserContent();
  }, []);

  const loadUserContent = async () => {
    if (!currentUser?.id) {
      console.log('❌ No current user');
      return;
    }

    try {
      console.log('📊 Loading user content for:', currentUser.id);
      const posts = await dataService.post.getPostsByUser(currentUser.id);
      const reels = await dataService.reel.getReelsByUser(currentUser.id);
      
      setUserPosts(posts);
      setUserReels(reels);
      
      console.log('✅ Loaded content:', { posts: posts.length, reels: reels.length });
    } catch (error) {
      console.error('❌ Error loading content:', error);
    }
  };

  const testDeletePost = async (postId: string) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'No current user');
      return;
    }

    console.log('🔥 TESTING DELETE POST:', { postId, userId: currentUser.id });

    Alert.alert(
      '🧪 Test Delete Post',
      `Test delete post ${postId}?\n\nThis will actually delete the post if you proceed.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('❌ Delete cancelled')
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              console.log('📞 Calling dataService.post.deletePost...');
              
              const success = await dataService.post.deletePost(postId, currentUser.id);
              console.log('📞 Delete result:', success);
              
              if (success) {
                setUserPosts(prev => prev.filter(p => p.id !== postId));
                Alert.alert('✅ Success', 'Post deleted successfully!');
              } else {
                Alert.alert('❌ Failed', 'Failed to delete post');
              }
            } catch (error) {
              console.error('❌ Delete error:', error);
              Alert.alert('❌ Error', 'Error deleting post: ' + (error as Error).message);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const testDeleteReel = async (reelId: string) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'No current user');
      return;
    }

    console.log('🔥 TESTING DELETE REEL:', { reelId, userId: currentUser.id });

    Alert.alert(
      '🧪 Test Delete Reel',
      `Test delete reel ${reelId}?\n\nThis will actually delete the reel if you proceed.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('❌ Delete cancelled')
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              console.log('📞 Calling dataService.reel.deleteReel...');
              
              const success = await dataService.reel.deleteReel(reelId, currentUser.id);
              console.log('📞 Delete result:', success);
              
              if (success) {
                setUserReels(prev => prev.filter(r => r.id !== reelId));
                Alert.alert('✅ Success', 'Reel deleted successfully!');
              } else {
                Alert.alert('❌ Failed', 'Failed to delete reel');
              }
            } catch (error) {
              console.error('❌ Delete error:', error);
              Alert.alert('❌ Error', 'Error deleting reel: ' + (error as Error).message);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const testDataService = () => {
    console.log('🧪 TESTING DATA SERVICE:');
    console.log('- DataService exists:', !!dataService);
    console.log('- Post service exists:', !!dataService.post);
    console.log('- Reel service exists:', !!dataService.reel);
    console.log('- Delete post method:', typeof dataService.post?.deletePost);
    console.log('- Delete reel method:', typeof dataService.reel?.deleteReel);
    console.log('- Current user:', currentUser?.id);
    console.log('- User posts:', userPosts.length);
    console.log('- User reels:', userReels.length);

    // Test debug logger
    debug.test();

    Alert.alert(
      '🧪 Test Results',
      `DataService: ${!!dataService ? '✅' : '❌'}\n` +
      `Current User: ${currentUser?.id ? '✅' : '❌'}\n` +
      `Posts: ${userPosts.length}\n` +
      `Reels: ${userReels.length}\n` +
      `Delete Methods: ${(typeof dataService.post?.deletePost === 'function') ? '✅' : '❌'}`
    );
  };

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>❌ No current user. Please log in first.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧪 Delete Function Test</Text>
      <Text style={styles.subtitle}>Current User: {currentUser.id}</Text>
      
      <TouchableOpacity style={styles.testButton} onPress={testDataService}>
        <Text style={styles.buttonText}>🔧 Test Data Service</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.refreshButton} onPress={loadUserContent}>
        <Text style={styles.buttonText}>🔄 Refresh Content</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Your Posts ({userPosts.length})</Text>
        {userPosts.length === 0 ? (
          <Text style={styles.emptyText}>No posts found</Text>
        ) : (
          userPosts.slice(0, 3).map((post, index) => (
            <View key={post.id} style={styles.itemContainer}>
              <Text style={styles.itemText}>
                {index + 1}. {post.id.substring(0, 8)}... 
                {post.user.username && ` (${post.user.username})`}
              </Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => testDeletePost(post.id)}
                disabled={isLoading}
              >
                <Text style={styles.deleteButtonText}>
                  {isLoading ? '⏳' : '🗑️ Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎬 Your Reels ({userReels.length})</Text>
        {userReels.length === 0 ? (
          <Text style={styles.emptyText}>No reels found</Text>
        ) : (
          userReels.slice(0, 3).map((reel, index) => (
            <View key={reel.id} style={styles.itemContainer}>
              <Text style={styles.itemText}>
                {index + 1}. {reel.id.substring(0, 8)}...
                {reel.user.username && ` (${reel.user.username})`}
              </Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => testDeleteReel(reel.id)}
                disabled={isLoading}
              >
                <Text style={styles.deleteButtonText}>
                  {isLoading ? '⏳' : '🗑️ Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ Instructions:</Text>
        <Text style={styles.infoText}>1. Tap "Test Data Service" to verify setup</Text>
        <Text style={styles.infoText}>2. Check console for detailed logs</Text>
        <Text style={styles.infoText}>3. Try deleting a post or reel</Text>
        <Text style={styles.infoText}>4. Watch console for API calls and responses</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#1E1E1E',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#6C5CE7',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#2A2A2A',
    padding: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  emptyText: {
    color: '#888888',
    fontStyle: 'italic',
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3A',
  },
  itemText: {
    color: '#CCCCCC',
    fontSize: 14,
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  infoBox: {
    backgroundColor: '#1A4D72',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    color: '#B8D4E3',
    fontSize: 14,
    marginBottom: 4,
  },
});

export default DeleteFunctionTest;
