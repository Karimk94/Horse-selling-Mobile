import React from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, FONTS, RADIUS, SPACING } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { navigationRef } from './navigationService';
import BrandLogo from '../components/BrandLogo';

// Screens
import HomeScreen from '../screens/HomeScreen';
import HorseDetailScreen from '../screens/HorseDetailScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import CreateListingScreen from '../screens/CreateListingScreen';
import SellHomeScreen from '../screens/SellHomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SavedAlertsScreen from '../screens/SavedAlertsScreen';
import OffersScreen from '../screens/OffersScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';
import AdminEditUserScreen from '../screens/AdminEditUserScreen';
import AdminEditHorseScreen from '../screens/AdminEditHorseScreen';
import AdminPushLogsScreen from '../screens/AdminPushLogsScreen';
import AdminOfferAuditScreen from '../screens/AdminOfferAuditScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

// Marketplace Expansion Screens
import MarketplaceHomeScreen from '../screens/MarketplaceHomeScreen';
import EquipmentListScreen from '../screens/EquipmentListScreen';
import EquipmentDetailScreen from '../screens/EquipmentDetailScreen';
import CreateEquipmentScreen from '../screens/CreateEquipmentScreen';
import RiderGearListScreen from '../screens/RiderGearListScreen';
import RiderGearDetailScreen from '../screens/RiderGearDetailScreen';
import CreateRiderGearScreen from '../screens/CreateRiderGearScreen';
import ServiceListScreen from '../screens/ServiceListScreen';
import ServiceDetailScreen from '../screens/ServiceDetailScreen';
import CreateServiceScreen from '../screens/CreateServiceScreen';
import AdminModerationDashboardScreen from '../screens/AdminModerationDashboardScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}

function BrowseStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MarketplaceHomeScreen" component={MarketplaceHomeScreen} />
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen
        name="HorseDetail"
        component={HorseDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="HorseListScreen" component={HomeScreen} />
      <Stack.Screen name="EquipmentListScreen" component={EquipmentListScreen} />
      <Stack.Screen name="EquipmentDetailScreen" component={EquipmentDetailScreen} />
      <Stack.Screen name="CreateEquipmentScreen" component={CreateEquipmentScreen} />
      <Stack.Screen name="RiderGearListScreen" component={RiderGearListScreen} />
      <Stack.Screen name="RiderGearDetailScreen" component={RiderGearDetailScreen} />
      <Stack.Screen name="CreateRiderGearScreen" component={CreateRiderGearScreen} />
      <Stack.Screen name="ServiceListScreen" component={ServiceListScreen} />
      <Stack.Screen name="ServiceDetailScreen" component={ServiceDetailScreen} />
      <Stack.Screen name="CreateServiceScreen" component={CreateServiceScreen} />
      <Stack.Screen name="AdminModerationDashboardScreen" component={AdminModerationDashboardScreen} />
    </Stack.Navigator>
  );
}

function FavoritesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FavoritesMain" component={FavoritesScreen} />
      <Stack.Screen
        name="HorseDetail"
        component={HorseDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="EquipmentListScreen" component={EquipmentListScreen} />
      <Stack.Screen name="EquipmentDetailScreen" component={EquipmentDetailScreen} />
      <Stack.Screen name="RiderGearListScreen" component={RiderGearListScreen} />
      <Stack.Screen name="RiderGearDetailScreen" component={RiderGearDetailScreen} />
      <Stack.Screen name="ServiceListScreen" component={ServiceListScreen} />
      <Stack.Screen name="ServiceDetailScreen" component={ServiceDetailScreen} />
    </Stack.Navigator>
  );
}

function SellStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SellHome" component={SellHomeScreen} />
      <Stack.Screen name="CreateListingMain" component={CreateListingScreen} />
      <Stack.Screen name="CreateEquipmentScreen" component={CreateEquipmentScreen} />
      <Stack.Screen name="CreateRiderGearScreen" component={CreateRiderGearScreen} />
      <Stack.Screen name="CreateServiceScreen" component={CreateServiceScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="SavedAlerts" component={SavedAlertsScreen} />
      <Stack.Screen name="Offers" component={OffersScreen} />
      <Stack.Screen
        name="HorseDetail"
        component={HorseDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="EquipmentDetailScreen" component={EquipmentDetailScreen} />
      <Stack.Screen name="RiderGearDetailScreen" component={RiderGearDetailScreen} />
      <Stack.Screen name="ServiceDetailScreen" component={ServiceDetailScreen} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminMain" component={AdminPanelScreen} />
      <Stack.Screen name="AdminModerationDashboardScreen" component={AdminModerationDashboardScreen} />
      <Stack.Screen name="AdminPushLogs" component={AdminPushLogsScreen} />
      <Stack.Screen name="AdminOfferAudit" component={AdminOfferAuditScreen} />
      <Stack.Screen name="AdminEditUser" component={AdminEditUserScreen} />
      <Stack.Screen name="AdminEditHorse" component={AdminEditHorseScreen} />
      <Stack.Screen
        name="HorseDetail"
        component={HorseDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const isAdmin = user?.role === 'admin';

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 8);
  const tabHeight = (Platform.OS === 'ios' ? 58 : 56) + bottomPadding;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarButton: (props) => (
          <TouchableOpacity
            {...props}
            testID={`tab-${route.name.toLowerCase()}`}
            activeOpacity={0.8}
          />
        ),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Browse':
              iconName = focused ? 'compass' : 'compass-outline';
              break;
            case 'Stable':
              iconName = focused ? 'bookmark' : 'bookmark-outline';
              break;
            case 'Sell':
              iconName = 'add';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Admin':
              iconName = focused ? 'shield-checkmark' : 'shield-outline';
              break;
            default:
              iconName = 'ellipse-outline';
          }

          if (route.name === 'Sell') {
            return (
              <View style={styles.sellButtonContainer}>
                <View style={[styles.sellButton, focused && styles.sellButtonFocused]}>
                  <Ionicons name="add" size={26} color={COLORS.white} />
                </View>
              </View>
            );
          }

          if (route.name === 'Admin') {
            const adminColor = focused ? COLORS.accentDark : '#9C7733';
            return <Ionicons name={iconName} size={23} color={adminColor} />;
          }

          return <Ionicons name={iconName} size={23} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderLight,
          height: tabHeight,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          ...SHADOWS.card,
        },
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen name="Browse" component={BrowseStack} options={{ title: t('tabBrowse') }} />
      <Tab.Screen name="Stable" component={FavoritesStack} options={{ title: t('tabStable') }} />
      <Tab.Screen name="Sell" component={SellStack} options={{ title: t('tabSell') }} />
      {isAdmin && <Tab.Screen name="Admin" component={AdminStack} options={{ title: t('tabAdmin') }} />}
      <Tab.Screen name="Profile" component={ProfileStack} options={{ title: t('tabProfile') }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { loading } = useAuth();
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  if (loading) {
    return (
      <View testID="app-loading-screen" style={styles.loading}>
        <BrandLogo
          title="SteedMarket"
          subtitle={isArabic ? 'سوق الفروسية الأول في الخليج' : 'Gulf Equestrian Marketplace'}
          iconSize={54}
        />
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loadingSpinner} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="GlobalHorseDetail"
          component={HorseDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AuthStack"
          component={AuthStack}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingSpinner: {
    marginTop: SPACING.xl,
  },
  sellButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
  },
  sellButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  sellButtonFocused: {
    borderColor: COLORS.white,
    backgroundColor: '#1E6B49',
  },
});
