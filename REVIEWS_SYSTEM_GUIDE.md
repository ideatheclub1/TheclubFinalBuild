# 🔍 Reviews System & Community Trust Score

## 📋 Overview

The Reviews System provides a comprehensive way for users to rate and review each other, with an automated Community Trust Score that reflects user credibility and reliability.

## ✨ Features

### 🛡️ Community Trust Score
- **Dynamic Calculation**: Automatically calculated based on multiple factors
- **Real-time Updates**: Updates whenever relevant data changes
- **Visual Indicators**: Color-coded scores (Green = Excellent, Orange = Good, Red = Fair, Gray = Poor)

### 📝 Review System
- **Star Ratings**: 1-5 star rating system
- **Optional Comments**: Users can add detailed feedback
- **One Review Per User**: Users can only review each other once
- **Delete Permissions**: Users can delete their own reviews (but not edit them)

### 🔒 Security & Permissions
- **No Self-Reviews**: Users cannot review themselves
- **No Editing**: Reviews cannot be edited once posted
- **Delete Only**: Users can only delete their own reviews
- **RLS Protected**: All operations are protected by Row Level Security

## 🏗️ Technical Implementation

### Database Structure

#### Reviews Table
```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    reviewed_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### User Profiles Enhancement
```sql
-- Added to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN community_trust_score INTEGER DEFAULT 0;
```

### Trust Score Calculation

The Community Trust Score is calculated using this formula:

```
Trust Score = Base Score + Review Bonus + Completion Bonus + Verification Bonus + Host Bonus

Where:
- Base Score: Rating × 10 (0-50 points)
- Review Bonus: Based on number of reviews (0-20 points)
  - 50+ reviews: 20 points
  - 20+ reviews: 15 points
  - 10+ reviews: 10 points
  - 5+ reviews: 5 points
- Completion Bonus: Profile completion % × 0.15 (0-15 points)
- Verification Bonus: 10 points if verified
- Host Bonus: 5 points if host
```

### RLS Policies

```sql
-- Users can view all reviews
CREATE POLICY "Users can view all reviews" ON reviews
    FOR SELECT USING (true);

-- Users can create reviews (but not for themselves)
CREATE POLICY "Users can create reviews" ON reviews
    FOR INSERT WITH CHECK (
        auth.uid() = reviewer_id AND 
        reviewer_id != reviewed_id
    );

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews" ON reviews
    FOR DELETE USING (auth.uid() = reviewer_id);

-- No UPDATE policy = no editing allowed
```

## 🎯 Usage

### For Users

#### Viewing Reviews
1. Navigate to any user's profile
2. Scroll down to the "Reviews" section
3. View the Community Trust Score and individual reviews
4. See star ratings, comments, and reviewer information

#### Adding a Review
1. Click "Add Review" button on another user's profile
2. Select a star rating (1-5 stars)
3. Optionally add a comment
4. Submit the review

#### Deleting Your Review
1. Find your review in the reviews list
2. Click the trash icon next to your review
3. Confirm deletion

### For Developers

#### API Endpoints

```typescript
// Get user reviews
const reviews = await dataService.review.getUserReviews(userId, currentUserId);

// Create a review
const review = await dataService.review.createReview({
  reviewerId: currentUserId,
  reviewedId: targetUserId,
  rating: 5,
  comment: "Great experience!"
});

// Delete a review
const success = await dataService.review.deleteReview(reviewId, currentUserId);

// Check if user has already reviewed
const hasReviewed = await dataService.review.hasUserReviewed(reviewerId, reviewedId);
```

#### Components

```typescript
// ReviewsSection component
<ReviewsSection 
  user={userProfile} 
  onRefresh={() => {
    // Refresh user data to get updated trust score
  }}
/>
```

## 🔄 Automatic Updates

### Triggers
- **Rating Updates**: Automatically recalculates when reviews are added/removed
- **Trust Score Updates**: Updates when profile completion, verification, or host status changes
- **User Stats**: Updates total_reviews count automatically

### Real-time Features
- Trust score updates immediately after review changes
- Review counts update in real-time
- User profile data refreshes automatically

## 🎨 UI Components

### ReviewsSection
- **Trust Score Display**: Circular score with color coding
- **Reviews List**: Scrollable list of all reviews
- **Add Review Modal**: Star rating and comment input
- **Delete Functionality**: Trash icon for user's own reviews

### Visual Elements
- **Star Ratings**: Interactive 5-star system
- **Color Coding**: Green (80+), Orange (60+), Red (40+), Gray (<40)
- **Status Labels**: Excellent, Good, Fair, Poor
- **Reviewer Avatars**: Initial-based avatars for reviewers

## 🚀 Setup Instructions

### 1. Database Setup
Run the SQL script in `database_reviews_system.sql`:

```bash
# Execute in Supabase SQL Editor
# This will create:
# - RLS policies for reviews
# - Trust score calculation functions
# - Automatic update triggers
# - Community trust score column
```

### 2. Frontend Integration
The ReviewsSection component is automatically integrated into ProfileScreen.

### 3. Testing
1. Create test reviews between users
2. Verify trust score calculations
3. Test delete functionality
4. Confirm RLS policies work correctly

## 🔧 Configuration

### Trust Score Weights
You can modify the trust score calculation by editing the `calculate_community_trust_score` function:

```sql
-- Adjust these values in the function:
-- Base score multiplier (currently 10)
-- Review bonus thresholds (currently 5, 10, 20, 50)
-- Completion bonus multiplier (currently 0.15)
-- Verification bonus (currently 10)
-- Host bonus (currently 5)
```

### Review Limits
- Users can only review each other once
- Reviews cannot be edited
- Users can only delete their own reviews

## 📊 Analytics

### Available Metrics
- Total reviews per user
- Average rating per user
- Trust score distribution
- Review activity over time

### Database Queries
```sql
-- Get user review statistics
SELECT 
  reviewed_id,
  COUNT(*) as total_reviews,
  AVG(rating) as average_rating,
  community_trust_score
FROM reviews r
JOIN user_profiles up ON r.reviewed_id = up.id
GROUP BY reviewed_id, community_trust_score;

-- Get trust score distribution
SELECT 
  CASE 
    WHEN community_trust_score >= 80 THEN 'Excellent'
    WHEN community_trust_score >= 60 THEN 'Good'
    WHEN community_trust_score >= 40 THEN 'Fair'
    ELSE 'Poor'
  END as trust_level,
  COUNT(*) as user_count
FROM user_profiles
GROUP BY trust_level;
```

## 🔮 Future Enhancements

### Planned Features
- **Review Responses**: Allow reviewed users to respond to reviews
- **Review Categories**: Different types of reviews (hosting, conversation, etc.)
- **Review Moderation**: Admin tools for managing inappropriate reviews
- **Review Analytics**: Detailed insights and trends
- **Review Notifications**: Notify users of new reviews

### Potential Improvements
- **Weighted Reviews**: Recent reviews count more than old ones
- **Reviewer Credibility**: Factor in reviewer's own trust score
- **Review Sentiment Analysis**: Analyze comment sentiment
- **Review Photos**: Allow photo attachments to reviews

## 🛠️ Troubleshooting

### Common Issues

#### Trust Score Not Updating
- Check if triggers are properly installed
- Verify RLS policies are active
- Ensure user profile data is current

#### Reviews Not Loading
- Check network connectivity
- Verify user authentication
- Confirm RLS policies allow access

#### Cannot Add Review
- Ensure user is not reviewing themselves
- Check if user has already reviewed
- Verify authentication status

### Debug Queries
```sql
-- Check if triggers exist
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE '%review%';

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'reviews';

-- Check trust score calculation
SELECT 
  id,
  rating,
  total_reviews,
  profile_completion_percentage,
  is_verified,
  is_host,
  community_trust_score
FROM user_profiles 
WHERE id = 'your-user-id';
```

## 📝 Best Practices

### For Users
- Write constructive, honest reviews
- Consider the impact of your rating
- Use comments to provide specific feedback
- Respect the one-review-per-user rule

### For Developers
- Always check permissions before operations
- Handle edge cases (no reviews, deleted users, etc.)
- Provide clear error messages
- Cache trust scores for performance

### For Admins
- Monitor review patterns for abuse
- Regularly check trust score calculations
- Maintain review quality standards
- Update trust score weights as needed

---

This reviews system provides a robust foundation for user credibility and community trust, with automatic scoring and comprehensive review management capabilities. 