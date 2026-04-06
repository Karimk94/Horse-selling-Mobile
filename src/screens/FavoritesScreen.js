import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, FONTS } from '../config/theme';
import HorseCard from '../components/HorseCard';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import * as apiService from '../services/api';

export default function FavoritesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { t, isRTL } = useLanguage();
  const [favorites, setFavorites] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setFavorites([]);
      setFavoriteIds(new Set());
      return;
    }
    try {
      const res = await apiService.getFavorites();
      const data = res.data;
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.horses)
        ? data.horses
        : Array.isArray(data?.favorites)
        ? data.favorites
        : [];
      setFavorites(items);
      setFavoriteIds(new Set(items.map((f) => f.horse_id || f.id)));
    } catch (err) {
      console.log('Error fetching favorites:', err.message);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchFavorites().finally(() => setLoading(false));
    }, [fetchFavorites])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  };

  const removeFavorite = async (horse) => {
    const id = horse.id || horse.horse_id;
    setFavorites((prev) => prev.filter((f) => (f.id || f.horse_id) !== id));
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    try {
      await apiService.removeFavorite(id);
    } catch {
      fetchFavorites();
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('stable')}</Text>
          <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>{t('savedHorses')}</Text>
        </View>
        <EmptyState
          icon="log-in-outline"
          title={t('signInToViewStable')}
          subtitle={t('signInToViewStableSubtitle')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('stable')}</Text>
        <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
          {t('savedCount', favorites.length)}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => (item.id || item.horse_id)?.toString()}
          renderItem={({ item }) => {
            const horse = item.horse || item;
            return (
              <HorseCard
                horse={horse}
                onPress={() =>
                  navigation.navigate('HorseDetail', { horse })
                }
                onFavorite={() => removeFavorite(horse)}
                isFavorited={true}
              />
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title={t('noFavorites')}
              subtitle={t('noFavoritesSubtitle')}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    ...FONTS.h1,
    color: COLORS.primary,
  },
  headerSubtitle: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerRTL: {
    alignItems: 'flex-end',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  listContent: {
    paddingBottom: SPACING.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
