import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plus, Trophy } from 'lucide-react-native';
import AchievementCard from './AchievementCard';
import ImageViewerModal from './ImageViewerModal';
import AddAchievementModal from './AddAchievementModal';

interface Achievement {
  id: string;
  title: string;
  smallImage: string;
  fullImage: string;
  createdAt: string;
}

const STORAGE_KEY = '@achievements';

// Mock achievements for initial data
const mockAchievements: Achievement[] = [
  {
    id: '1',
    title: 'Best AI ever: ChatGPT 🏆',
    smallImage: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=400',
    fullImage: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=800',
    createdAt: 'Jan 15, 2024',
  },
  {
    id: '2',
    title: 'Completed 100 Days of Code Challenge 💻',
    smallImage: 'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=400',
    fullImage: 'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=800',
    createdAt: 'Feb 2, 2024',
  },
  {
    id: '3',
    title: 'First React Native App Published 🚀',
    smallImage: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=400',
    fullImage: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=800',
    createdAt: 'Mar 10, 2024',
  },
];

export default function AchievementsSection() {
  const [fontsLoaded] = useFonts({
    PatrickHand_400Regular,
  });

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAchievements(JSON.parse(stored));
      } else {
        // Initialize with mock data
        setAchievements(mockAchievements);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mockAchievements));
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
      setAchievements(mockAchievements);
    } finally {
      setLoading(false);
    }
  };

  const saveAchievements = async (newAchievements: Achievement[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newAchievements));
    } catch (error) {
      console.error('Failed to save achievements:', error);
    }
  };

  const handleImagePress = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setShowImageViewer(true);
  };

  const handleAddAchievement = async (newAchievement: Omit<Achievement, 'id' | 'createdAt'>) => {
    const achievement: Achievement = {
      ...newAchievement,
      id: Date.now().toString(),
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };

    const updatedAchievements = [achievement, ...achievements];
    setAchievements(updatedAchievements);
    await saveAchievements(updatedAchievements);
    setShowAddModal(false);
  };

  const renderAchievement = ({ item, index }: { item: Achievement; index: number }) => (
    <AchievementCard
      achievement={item}
      onImagePress={handleImagePress}
      index={index}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Trophy size={48} color="#A259FF" />
      <Text style={[styles.emptyTitle, { fontFamily: 'PatrickHand_400Regular' }]}>
        No achievements yet
      </Text>
      <Text style={[styles.emptySubtitle, { fontFamily: 'PatrickHand_400Regular' }]}>
        Add your first achievement to get started!
      </Text>
    </View>
  );

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading achievements...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Trophy size={20} color="#A259FF" />
          <Text style={[styles.sectionTitle, { fontFamily: 'PatrickHand_400Regular' }]}>
            Achievements
          </Text>
        </View>
        <Text style={[styles.achievementCount, { fontFamily: 'PatrickHand_400Regular' }]}>
          {achievements.length} achievement{achievements.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Achievements List */}
      {achievements.length > 0 ? (
        <FlatList
          data={achievements}
          renderItem={renderAchievement}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
        />
      ) : (
        renderEmptyState()
      )}

      {/* Add Achievement Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <LinearGradient
          colors={['#A259FF', '#7A4AE6']}
          style={styles.addButtonGradient}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={[styles.addButtonText, { fontFamily: 'PatrickHand_400Regular' }]}>
            Add Achievement
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Image Viewer Modal */}
      <ImageViewerModal
        visible={showImageViewer}
        note={selectedAchievement ? {
          id: selectedAchievement.id,
          title: selectedAchievement.title,
          smallImage: selectedAchievement.smallImage,
          fullImage: selectedAchievement.fullImage,
          createdAt: selectedAchievement.createdAt,
          type: 'sticky'
        } : null}
        onClose={() => setShowImageViewer(false)}
      />

      {/* Add Achievement Modal */}
      <AddAchievementModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddAchievement}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'normal',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  achievementCount: {
    fontSize: 16,
    color: '#888888',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'normal',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
  },
  addButton: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: 'normal',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#888888',
  },
});