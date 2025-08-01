import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Star, Shield, MessageCircle, Trash2, Plus, X } from 'lucide-react-native';
import { useUser } from '@/contexts/UserContext';
import { dataService } from '@/services/dataService';
import { Review, User } from '@/types';

interface ReviewsSectionProps {
  user: User;
  onRefresh?: () => void;
}

interface ReviewItemProps {
  review: Review & {
    reviewerName?: string;
    reviewerAvatar?: string;
    canDelete?: boolean;
  };
  onDelete: (reviewId: string) => void;
}

const ReviewItem: React.FC<ReviewItemProps> = ({ review, onDelete }) => {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={16}
        color={index < rating ? '#FFD700' : '#333'}
        fill={index < rating ? '#FFD700' : 'none'}
      />
    ));
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View style={styles.reviewerAvatar}>
            <Text style={[styles.avatarText, { fontFamily: 'Inter_600SemiBold' }]}>
              {review.reviewerName?.charAt(0) || 'U'}
            </Text>
          </View>
          <View style={styles.reviewerDetails}>
            <Text style={[styles.reviewerName, { fontFamily: 'Inter_600SemiBold' }]}>
              {review.reviewerName || 'Anonymous'}
            </Text>
            <Text style={[styles.reviewDate, { fontFamily: 'Inter_400Regular' }]}>
              {formatDate(review.createdAt || '')}
            </Text>
          </View>
        </View>
        {review.canDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(review.id)}
          >
            <Trash2 size={16} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.ratingContainer}>
        {renderStars(review.rating)}
        <Text style={[styles.ratingText, { fontFamily: 'Inter_500Medium' }]}>
          {review.rating}/5
        </Text>
      </View>
      
      {review.comment && (
        <Text style={[styles.reviewComment, { fontFamily: 'Inter_400Regular' }]}>
          {review.comment}
        </Text>
      )}
    </View>
  );
};

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ user, onRefresh }) => {
  const { user: currentUser } = useUser();
  const [reviews, setReviews] = useState<(Review & { reviewerName?: string; reviewerAvatar?: string; canDelete?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddReview, setShowAddReview] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const loadReviews = async () => {
    try {
      setLoading(true);
      const userReviews = await dataService.review.getUserReviews(
        user.id,
        currentUser?.id
      );
      setReviews(userReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [user.id]);

  const handleDeleteReview = async (reviewId: string) => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await dataService.review.deleteReview(
                reviewId,
                currentUser?.id || ''
              );
              if (success) {
                setReviews(reviews.filter(r => r.id !== reviewId));
                onRefresh?.();
              } else {
                Alert.alert('Error', 'Failed to delete review');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete review');
            }
          },
        },
      ]
    );
  };

  const handleAddReview = async () => {
    if (!currentUser) return;

    try {
      setSubmitting(true);
      
      // Check if user has already reviewed
      const hasReviewed = await dataService.review.hasUserReviewed(
        currentUser.id,
        user.id
      );

      if (hasReviewed) {
        Alert.alert('Already Reviewed', 'You have already reviewed this user.');
        return;
      }

      const review = await dataService.review.createReview({
        reviewerId: currentUser.id,
        reviewedId: user.id,
        rating: newReview.rating,
        comment: newReview.comment.trim() || undefined,
      });

      if (review) {
        setReviews([review, ...reviews]);
        setShowAddReview(false);
        setNewReview({ rating: 5, comment: '' });
        onRefresh?.();
        Alert.alert('Success', 'Review submitted successfully!');
      } else {
        Alert.alert('Error', 'Failed to submit review');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const canAddReview = currentUser && currentUser.id !== user.id;

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return '#00D46A';
    if (score >= 60) return '#FFA500';
    if (score >= 40) return '#FF6B6B';
    return '#999';
  };

  const getTrustScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Trust Score Section */}
      <View style={styles.trustScoreSection}>
        <View style={styles.trustScoreHeader}>
          <Shield size={20} color={getTrustScoreColor(user.communityTrustScore || 0)} />
          <Text style={[styles.trustScoreTitle, { fontFamily: 'Inter_600SemiBold' }]}>
            Community Trust Score
          </Text>
        </View>
        
        <View style={styles.trustScoreContent}>
          <View style={styles.scoreCircle}>
            <Text style={[styles.scoreNumber, { fontFamily: 'Inter_600SemiBold' }]}>
              {user.communityTrustScore || 0}
            </Text>
            <Text style={[styles.scoreLabel, { fontFamily: 'Inter_400Regular' }]}>
              /100
            </Text>
          </View>
          
          <View style={styles.scoreDetails}>
            <Text style={[styles.scoreStatus, { 
              fontFamily: 'Inter_500Medium',
              color: getTrustScoreColor(user.communityTrustScore || 0)
            }]}>
              {getTrustScoreLabel(user.communityTrustScore || 0)}
            </Text>
            <Text style={[styles.scoreDescription, { fontFamily: 'Inter_400Regular' }]}>
              Based on {user.totalReviews || 0} reviews, profile completion, and verification status
            </Text>
          </View>
        </View>
      </View>

      {/* Reviews Header */}
      <View style={styles.reviewsHeader}>
        <View style={styles.reviewsTitleContainer}>
          <MessageCircle size={20} color="#6C5CE7" />
          <Text style={[styles.reviewsTitle, { fontFamily: 'Inter_600SemiBold' }]}>
            Reviews ({reviews.length})
          </Text>
        </View>
        
        {canAddReview && (
          <TouchableOpacity
            style={styles.addReviewButton}
            onPress={() => setShowAddReview(true)}
          >
            <Plus size={16} color="#6C5CE7" />
            <Text style={[styles.addReviewText, { fontFamily: 'Inter_500Medium' }]}>
              Add Review
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Reviews List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { fontFamily: 'Inter_400Regular' }]}>
            Loading reviews...
          </Text>
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageCircle size={48} color="#666" />
          <Text style={[styles.emptyTitle, { fontFamily: 'Inter_600SemiBold' }]}>
            No reviews yet
          </Text>
          <Text style={[styles.emptyText, { fontFamily: 'Inter_400Regular' }]}>
            Be the first to review this user
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReviewItem review={item} onDelete={handleDeleteReview} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.reviewsList}
        />
      )}

      {/* Add Review Modal */}
      <Modal
        visible={showAddReview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddReview(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowAddReview(false)}
              style={styles.closeButton}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { fontFamily: 'Inter_600SemiBold' }]}>
              Write a Review
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalSubtitle, { fontFamily: 'Inter_500Medium' }]}>
              Rate your experience with {user.username}
            </Text>

            {/* Rating Selection */}
            <View style={styles.ratingSelection}>
              <Text style={[styles.ratingLabel, { fontFamily: 'Inter_500Medium' }]}>
                Rating
              </Text>
              <View style={styles.starsContainer}>
                {Array.from({ length: 5 }, (_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setNewReview(prev => ({ ...prev, rating: index + 1 }))}
                  >
                    <Star
                      size={32}
                      color={index < newReview.rating ? '#FFD700' : '#333'}
                      fill={index < newReview.rating ? '#FFD700' : 'none'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.ratingText, { fontFamily: 'Inter_400Regular' }]}>
                {newReview.rating}/5 stars
              </Text>
            </View>

            {/* Comment Input */}
            <View style={styles.commentContainer}>
              <Text style={[styles.commentLabel, { fontFamily: 'Inter_500Medium' }]}>
                Comment (Optional)
              </Text>
              <TextInput
                style={[styles.commentInput, { fontFamily: 'Inter_400Regular' }]}
                placeholder="Share your experience..."
                placeholderTextColor="#666"
                value={newReview.comment}
                onChangeText={(text) => setNewReview(prev => ({ ...prev, comment: text }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleAddReview}
              disabled={submitting}
            >
              <Text style={[styles.submitButtonText, { fontFamily: 'Inter_600SemiBold' }]}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A0A0A',
  },
  trustScoreSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  trustScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trustScoreTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  trustScoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scoreNumber: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#888',
  },
  scoreDetails: {
    flex: 1,
  },
  scoreStatus: {
    fontSize: 16,
    marginBottom: 4,
  },
  scoreDescription: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewsTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addReviewText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#888',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  reviewsList: {
    paddingBottom: 20,
  },
  reviewItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#888',
  },
  deleteButton: {
    padding: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 24,
  },
  ratingSelection: {
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  commentContainer: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  commentInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 100,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  submitButton: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export default ReviewsSection; 