import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { X, Palette } from 'lucide-react-native';

interface Filter {
  id: string;
  name: string;
  preview: string;
  overlay?: string;
  tint?: string;
}

interface FilterOverlayProps {
  visible: boolean;
  onClose: () => void;
  filters: Filter[];
  selectedFilterId: string;
  onFilterSelect: (filterId: string) => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function FilterOverlay({
  visible,
  onClose,
  filters,
  selectedFilterId,
  onFilterSelect,
}: FilterOverlayProps) {
  const overlayOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 300 });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const handleFilterSelect = (filterId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFilterSelect(filterId);
    onClose();
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn}>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <View style={styles.backdrop} />
        
        <Animated.View entering={SlideInUp.springify()}>
          <View style={styles.panel}>
            <BlurView intensity={Platform.OS === 'ios' ? 80 : 0} style={styles.panelBlur}>
              <LinearGradient
                colors={['rgba(30, 30, 30, 0.95)', 'rgba(48, 30, 90, 0.95)']}
                style={styles.panelGradient}
              >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Palette size={24} color="#6C5CE7" />
                <Text style={styles.title}>Filters</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Filter Grid */}
            <ScrollView 
              style={styles.filterScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.filterGrid}>
                {filters.map((filter, index) => (
                  <FilterCard
                    key={filter.id}
                    filter={filter}
                    isSelected={filter.id === selectedFilterId}
                    onPress={() => handleFilterSelect(filter.id)}
                    index={index}
                  />
                ))}
              </View>
            </ScrollView>
          </LinearGradient>
        </BlurView>
      </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

interface FilterCardProps {
  filter: Filter;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}

const FilterCard: React.FC<FilterCardProps> = ({ filter, isSelected, onPress, index }) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchableOpacity
      style={[
        styles.filterCard,
        isSelected && styles.selectedFilterCard,
        animatedStyle
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      entering={FadeIn.delay(index * 50)}
    >
      <View style={[styles.filterPreview, filter.overlay && { backgroundColor: filter.overlay }]}>
        <Text style={styles.filterEmoji}>{filter.preview}</Text>
      </View>
      <Text style={[
        styles.filterName,
        isSelected && styles.selectedFilterName
      ]}>
        {filter.name}
      </Text>
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  panelBlur: {
    flex: 1,
  },
  panelGradient: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  filterScroll: {
    flex: 1,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  filterCard: {
    alignItems: 'center',
    width: 80,
    marginBottom: 20,
  },
  selectedFilterCard: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  filterPreview: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterEmoji: {
    fontSize: 24,
  },
  filterName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedFilterName: {
    color: '#6C5CE7',
    fontWeight: '700',
  },
});