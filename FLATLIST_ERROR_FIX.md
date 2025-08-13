# 🛠️ FlatList onViewableItemsChanged Error Fix

## 🚨 Error Fixed

**Error Message:**
```
Uncaught Error: Changing onViewableItemsChanged on the fly is not supported
```

**Root Cause:**
The FlatList component in React Native doesn't support changing the `onViewableItemsChanged` prop after the component has been mounted. This error occurs when the prop reference changes between renders.

## ✅ Solution Applied

### **Problem:**
The `onViewableItemsChanged` callback was being recreated on every render due to:
1. `useCallback` with dependencies that might change
2. Functions being redefined in the component body

### **Fix:**
Used `useRef` to create stable references for both `onViewableItemsChanged` and `viewabilityConfig`:

```typescript
// Create stable references for FlatList props to prevent re-render issues
const viewabilityConfigRef = useRef({
  itemVisiblePercentThreshold: 50,
});

const onViewableItemsChangedRef = useRef(({ viewableItems }: { viewableItems: any[] }) => {
  if (viewableItems.length > 0) {
    const newIndex = viewableItems[0].index;
    const previousIndex = currentIndexRef.current;
    
    debug.userAction('Reel view changed', { 
      previousIndex, 
      newIndex
    });
    
    setCurrentIndex(newIndex);
    currentIndexRef.current = newIndex;
    
    // Increment view count for the viewed reel using ref to avoid dependency issues
    const reelId = reelsRef.current[newIndex]?.id;
    if (reelId) {
      reelService.incrementView(reelId).catch(error => {
        debug.dbError('reel_view', 'INCREMENT', { error: (error as Error).message });
      });
    }
  }
});
```

### **FlatList Implementation:**
```typescript
<FlatList
  ref={flatListRef}
  data={reels}
  renderItem={renderReel}
  keyExtractor={(item) => item.id}
  pagingEnabled
  showsVerticalScrollIndicator={false}
  snapToInterval={SCREEN_HEIGHT}
  snapToAlignment="start"
  decelerationRate="fast"
  onViewableItemsChanged={onViewableItemsChangedRef.current}  // ✅ Stable reference
  viewabilityConfig={viewabilityConfigRef.current}           // ✅ Stable reference
  refreshControl={...}
/>
```

## 🔍 Why This Works

### **useRef Benefits:**
1. **Stable Reference**: `useRef` creates a mutable reference that persists across renders
2. **No Re-creation**: The callback function is created once and reused
3. **Performance**: Avoids unnecessary FlatList re-renders
4. **Compliance**: Follows React Native's requirements for FlatList props

### **Key Principles:**
- `onViewableItemsChanged` must be a stable reference
- `viewabilityConfig` should also be stable for consistency
- Use `useRef` for callbacks that shouldn't change
- Avoid `useCallback` for FlatList viewability props

## 🚀 Files Modified

### **screens/ReelsScreen.tsx**
- ✅ Replaced `useCallback` with `useRef` for `onViewableItemsChanged`
- ✅ Used `useRef` for `viewabilityConfig`
- ✅ Updated FlatList props to use stable references

## 🧪 Testing

### **Before Fix:**
- ❌ Error: "Changing onViewableItemsChanged on the fly is not supported"
- ❌ App crashes when navigating to ReelsScreen
- ❌ FlatList re-renders unnecessarily

### **After Fix:**
- ✅ No onViewableItemsChanged errors
- ✅ Smooth navigation to ReelsScreen
- ✅ Proper reel viewing and tracking
- ✅ Stable performance

## 📚 Best Practices for FlatList

### **Do:**
```typescript
// ✅ Use useRef for stable callbacks
const onViewableItemsChangedRef = useRef((info) => {
  // Handle viewability change
});

// ✅ Use stable references in FlatList
<FlatList
  onViewableItemsChanged={onViewableItemsChangedRef.current}
  viewabilityConfig={viewabilityConfigRef.current}
/>
```

### **Don't:**
```typescript
// ❌ Don't use useCallback for viewability props
const onViewableItemsChanged = useCallback((info) => {
  // This can cause the error
}, [dependencies]);

// ❌ Don't create objects inline
<FlatList
  viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}  // Creates new object each render
/>
```

## 🎯 Summary

The error was caused by React Native's FlatList receiving a new `onViewableItemsChanged` reference on each render. By using `useRef` to create stable references for both the callback and configuration, we ensure:

1. **No Re-renders**: FlatList doesn't think props are changing
2. **Better Performance**: Fewer unnecessary re-renders
3. **Error Prevention**: Complies with React Native's requirements
4. **Stable Functionality**: Viewability tracking works consistently

The fix is now applied and the ReelsScreen should work without the "onViewableItemsChanged" error! 🎉


