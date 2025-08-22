import React, { useState, useEffect, forwardRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Video, VideoProps, ResizeMode } from 'expo-av';
import { cacheService, useCachedMedia } from '@/services/cacheService';
import { debugLogger } from '@/utils/debugLogger';

interface CachedVideoProps extends Omit<VideoProps, 'source'> {
  source: { uri: string };
  showLoader?: boolean;
  placeholder?: React.ReactNode;
  onCacheComplete?: (localPath: string) => void;
  priority?: 'high' | 'low'; // For future priority-based caching
}

export const CachedVideo = forwardRef<Video, CachedVideoProps>(({
  source,
  showLoader = true,
  placeholder,
  style,
  onCacheComplete,
  priority = 'high',
  ...props
}, ref) => {
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { localPath, loading: cacheLoading, error: cacheError } = useCachedMedia(
    source.uri,
    'video'
  );

  const finalSource = { uri: localPath || source.uri };

  useEffect(() => {
    if (cacheError) {
      debugLogger.error('CACHED_VIDEO', 'CACHE_ERROR', `Failed to cache video: ${source.uri}`, cacheError);
    }
  }, [cacheError, source.uri]);

  useEffect(() => {
    if (localPath && localPath !== source.uri && onCacheComplete) {
      onCacheComplete(localPath);
    }
  }, [localPath, source.uri, onCacheComplete]);

  const handleLoad = () => {
    setIsLoading(false);
    debugLogger.info('CACHED_VIDEO', 'LOAD_SUCCESS', `Video loaded: ${source.uri}`);
  };

  const handleError = (error: any) => {
    setIsLoading(false);
    setVideoError(true);
    debugLogger.error('CACHED_VIDEO', 'LOAD_ERROR', `Failed to load video: ${source.uri}`, error);
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  // Show placeholder while caching
  if (cacheLoading && showLoader) {
    return (
      <View style={[styles.container, style]}>
        {placeholder || <ActivityIndicator size="large" color="#666" />}
      </View>
    );
  }

  // Show error placeholder if video failed to load
  if (videoError) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        {placeholder || <View style={styles.errorPlaceholder} />}
      </View>
    );
  }

  return (
    <View style={style}>
      <Video
        ref={ref}
        {...props}
        source={finalSource}
        style={StyleSheet.absoluteFill}
        onLoad={handleLoad}
        onError={handleError}
        onLoadStart={handleLoadStart}
        resizeMode={ResizeMode.COVER}
      />
      {isLoading && showLoader && (
        <View style={[styles.loaderOverlay, StyleSheet.absoluteFill]}>
          <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
        </View>
      )}
    </View>
  );
});

CachedVideo.displayName = 'CachedVideo';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: '#333',
  },
  errorPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#444',
  },
  loaderOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});

export default CachedVideo;











