global.__reanimatedWorkletInit = () => {};

jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock(
	'expo-location',
	() => ({
		requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
		getCurrentPositionAsync: jest.fn().mockResolvedValue({
			coords: { latitude: 25.2048, longitude: 55.2708 },
		}),
		Accuracy: { Balanced: 3 },
	}),
	{ virtual: true }
);

jest.mock(
	'expo-notifications',
	() => ({
		setNotificationHandler: jest.fn(),
		getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
		requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
		getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
		addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
	}),
	{ virtual: true }
);

jest.mock('react-native-safe-area-context', () => {
	const React = require('react');
	const { View } = require('react-native');
	const insets = { top: 0, bottom: 0, left: 0, right: 0 };
	const frame = { x: 0, y: 0, width: 390, height: 844 };
	return {
		useSafeAreaInsets: () => insets,
		useSafeAreaFrame: () => frame,
		SafeAreaView: ({ children, style }) => React.createElement(View, { style }, children),
		SafeAreaProvider: ({ children }) => children,
		SafeAreaConsumer: ({ children }) => children(insets),
		SafeAreaInsetsContext: React.createContext(insets),
		SafeAreaFrameContext: React.createContext(frame),
		initialWindowMetrics: {
			insets,
			frame,
		},
	};
});

jest.mock('@expo/vector-icons', () => {
	const React = require('react');
	const { Text } = require('react-native');

	return {
		Ionicons: ({ name }) => React.createElement(Text, null, name),
		MaterialCommunityIcons: ({ name }) => React.createElement(Text, null, name),
	};
});

jest.mock(
	'react-native-toast-notifications',
	() => ({
		useToast: () => ({
			show: jest.fn(),
		}),
	}),
	{ virtual: true }
);

jest.mock('./src/contexts/LanguageContext', () => ({
	useLanguage: () => ({
		language: 'en',
		isRTL: false,
		setLanguage: jest.fn(),
		toggleLanguage: jest.fn(),
		t: (key) => key,
	}),
	LanguageProvider: ({ children }) => children,
}));