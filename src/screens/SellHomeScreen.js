import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';

const LISTING_TYPES = [
  {
    id: 'horse',
    title_ar: 'بيع خيل',
    title_en: 'Sell a Horse',
    subtitle_ar: 'إضافة إعلان حصان جديد',
    subtitle_en: 'Add a new horse listing',
    icon: 'paw-outline',
    screen: 'CreateListingMain',
  },
  {
    id: 'equipment',
    title_ar: 'مستلزمات الخيل',
    title_en: 'Horse Equipment',
    subtitle_ar: 'سروج، ألجمة، أدوات عناية',
    subtitle_en: 'Saddles, bridles, grooming',
    icon: 'shield-outline',
    screen: 'CreateEquipmentScreen',
  },
  {
    id: 'rider_gear',
    title_ar: 'مستلزمات الفارس',
    title_en: 'Rider Gear',
    subtitle_ar: 'خوذات، أحذية، ملابس ركوب',
    subtitle_en: 'Helmets, boots, apparel',
    icon: 'shirt-outline',
    screen: 'CreateRiderGearScreen',
  },
  {
    id: 'services',
    title_ar: 'الخدمات والإيواء',
    title_en: 'Services',
    subtitle_ar: 'إيواء، تدريب، رعاية صحية',
    subtitle_en: 'Boarding, training, care',
    icon: 'construct-outline',
    screen: 'CreateServiceScreen',
  },
];

export default function SellHomeScreen({ navigation }) {
  const { language, isRTL } = useLanguage();
  const isArabic = language === 'ar';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {isArabic ? 'ماذا تريد أن تبيع؟' : 'What do you want to sell?'}
          </Text>
          <Text style={[styles.headerSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {isArabic ? 'اختر نوع الإعلان للمتابعة' : 'Choose a listing type to continue'}
          </Text>
        </View>

        {LISTING_TYPES.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={26} color={COLORS.primary} />
            </View>
            <View style={[styles.cardTextWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isArabic ? item.title_ar : item.title_en}
              </Text>
              <Text style={[styles.cardSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isArabic ? item.subtitle_ar : item.subtitle_en}
              </Text>
            </View>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={20}
              color={COLORS.textLight}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    ...FONTS.h1,
    color: COLORS.primary,
  },
  headerSubtitle: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  card: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
    marginHorizontal: SPACING.md,
  },
  cardTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  cardSubtitle: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
