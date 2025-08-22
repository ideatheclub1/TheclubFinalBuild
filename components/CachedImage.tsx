import React, { useState, useEffect } from 'react';
import { Image, ImageProps, View, ActivityIndicator, StyleSheet } from 'react-native';
import { cacheService, useCachedMedia } from '@/services/cacheService';
import { debugLogger } from '@/utils/debugLogger';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  fallbackSource?: { uri: string };
  showLoader?: boolean;
  cacheType?: 'image' | 'thumbnail';
  placeholder?: React.ReactNode;
}

export const CachedImage: React.FC<CachedImageProps> = ({
  source,
  fallbackSource,
  showLoader = true,
  cacheType = 'image',
  placeholder,
  style,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Only use caching for URI sources
  const shouldCache = typeof source === 'object' && 'uri' in source;
  const originalUri = shouldCache ? source.uri : null;

  const { localPath, loading: cacheLoading, error: cacheError } = useCachedMedia(
    originalUri,
    cacheType
  );

  const finalSource = shouldCache ? { uri: localPath } : source;

  useEffect(() => {
    if (cacheError) {
      debugLogger.error('CACHED_IMAGE', 'CACHE_ERROR', `Failed to cache image: ${originalUri}`, cacheError);
      setImageError(false); // Still try to load original
    }
  }, [cacheError, originalUri]);

  const handleLoad = () => {
    setIsLoading(false);
    // Significantly reduce logging - only log once per 100 loads
    if (shouldCache && __DEV__ && Math.random() < 0.01) {
      debugLogger.info('CACHED_IMAGE', 'LOAD_SUCCESS', `Image loaded: ${originalUri}`);
    }
  };

  const handleError = () => {
    setIsLoading(false);
    setImageError(true);
    // Only log errors for debugging purposes
    if (shouldCache && __DEV__) {
      debugLogger.error('CACHED_IMAGE', 'LOAD_ERROR', `Failed to load image: ${originalUri}`);
    }
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  // Show placeholder while caching
  if (shouldCache && cacheLoading && showLoader) {
    return (
      <View style={[styles.container, style]}>
        {placeholder || <ActivityIndicator size="small" color="#666" />}
      </View>
    );
  }

  // Show fallback image if error and fallback is provided
  if (imageError && fallbackSource) {
    return (
      <Image
        {...props}
        source={fallbackSource}
        style={style}
        onLoad={handleLoad}
        onError={handleError}
        onLoadStart={handleLoadStart}
      />
    );
  }

  // Show placeholder if image failed and no fallback
  if (imageError && !fallbackSource) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        {placeholder || <View style={styles.errorPlaceholder} />}
      </View>
    );
  }

  return (
    <>
      <Image
        {...props}
        source={finalSource}
        style={style}
        onLoad={handleLoad}
        onError={handleError}
        onLoadStart={handleLoadStart}
      />
      {isLoading && showLoader && (
        <View style={[styles.loaderOverlay, StyleSheet.absoluteFill]}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: '#e0e0e0',
  },
  errorPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#d0d0d0',
  },
  loaderOverlay: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CachedImage;


