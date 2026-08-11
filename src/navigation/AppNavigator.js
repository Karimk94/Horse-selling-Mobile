import React from 'react';
import { View, StyleSheet, Platform, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS, FONTS } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { navigationRef } from './navigationService';

// Screens
import HomeScreen from '../screens/HomeScreen';
import HorseDetailScreen from '../screens/HorseDetailScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import CreateListingScreen from '../screens/CreateListingScreen';
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
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen
        name="HorseDetail"
        component={HorseDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
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
    </Stack.Navigator>
  );
}

function SellStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CreateListingMain" component={CreateListingScreen} />
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
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminMain" component={AdminPanelScreen} />
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
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === 'admin';
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Browse':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Stable':
              iconName = focused ? 'star' : 'star-outline';
              break;
            case 'Sell':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
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
          if (route.name === 'Admin') {
            const adminColor = focused ? COLORS.warning : '#C08A2E';
            return <Ionicons name={iconName} size={24} color={adminColor} />;
          }
          return <Ionicons name={iconName} size={route.name === 'Sell' ? 28 : 24} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          ...SHADOWS.tabBar,
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

  if (loading) {
    return (
      <View style={styles.loading}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
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
  },
});
