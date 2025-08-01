# Authentication Guide

This guide explains how the authentication system works in your app and how to protect routes from unauthenticated users.

## How It Works

The authentication system is built around the `UserContext` which:

1. **Manages User State**: Tracks if a user is authenticated, loading state, and user data
2. **Listens to Supabase Auth Changes**: Automatically detects when users sign in/out or tokens expire
3. **Handles Automatic Redirects**: Redirects unauthenticated users to the login page
4. **Persists User Data**: Stores user information in AsyncStorage for app restarts

## Key Features

### Automatic Redirect to Login
- When a user is not authenticated, they are automatically redirected to `/login`
- This happens both on app startup and during the session if authentication is lost
- The redirect uses `router.replace('/login')` to prevent back navigation

### Supabase Auth State Listener
The context listens to Supabase auth state changes:
- `SIGNED_OUT`: User manually logged out
- `TOKEN_REFRESHED` with no session: Token expired
- `SIGNED_IN`: User successfully authenticated

### Manual Authentication Check
You can manually check authentication status and redirect using:
```typescript
const { checkAuthAndRedirect } = useUser();
checkAuthAndRedirect();
```

## Usage Examples

### 1. Using ProtectedRoute Component (Recommended)

Wrap any screen or component that requires authentication:

```typescript
import ProtectedRoute from '@/components/ProtectedRoute';

export default function MyProtectedScreen() {
  return (
    <ProtectedRoute>
      <YourScreenContent />
    </ProtectedRoute>
  );
}
```

### 2. Manual Authentication Check

In any component that uses the `useUser` hook:

```typescript
import { useUser } from '@/contexts/UserContext';

export default function MyScreen() {
  const { isAuthenticated, isLoading, checkAuthAndRedirect } = useUser();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      checkAuthAndRedirect();
    }
  }, [isAuthenticated, isLoading, checkAuthAndRedirect]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return null; // Will redirect automatically
  }

  return <YourContent />;
}
```

### 3. Checking Authentication Status

```typescript
const { isAuthenticated, user, isLoading } = useUser();

if (isLoading) {
  // Still checking authentication
  return <LoadingSpinner />;
}

if (!isAuthenticated) {
  // User is not logged in
  return <LoginPrompt />;
}

// User is authenticated, render protected content
return <ProtectedContent />;
```

## Authentication Flow

1. **App Startup**: 
   - Loads user data from AsyncStorage
   - Checks Supabase session
   - Redirects to login if no valid session

2. **During App Use**:
   - Supabase auth listener monitors for changes
   - If session expires or user logs out, redirects to login
   - If user signs in, updates context and allows access

3. **Manual Logout**:
   - Calls `logout()` function
   - Clears AsyncStorage
   - Signs out from Supabase
   - Redirects to login page

## Files Modified

- `contexts/UserContext.tsx`: Added auth state listener and redirect logic
- `components/ProtectedRoute.tsx`: New component for protecting routes
- `app/(tabs)/profile.tsx`: Example of using ProtectedRoute
- `screens/FeedScreen.tsx`: Added manual auth check

## Best Practices

1. **Use ProtectedRoute for Tab Screens**: Wrap all tab screens that require authentication
2. **Handle Loading States**: Always check `isLoading` before checking `isAuthenticated`
3. **Don't Block Login Page**: The login page should not be wrapped in ProtectedRoute
4. **Test Token Expiry**: The system automatically handles expired tokens

## Troubleshooting

### User Not Redirecting to Login
- Check that the UserProvider is wrapping your app in `_layout.tsx`
- Verify that `isAuthenticated` is false when user should be logged out
- Ensure the login route exists at `/login`

### Infinite Redirect Loop
- Make sure the login page is not wrapped in ProtectedRoute
- Check that the login page doesn't call `checkAuthAndRedirect`

### Authentication State Not Updating
- Verify Supabase configuration is correct
- Check that the auth state listener is properly set up
- Ensure AsyncStorage is working correctly 