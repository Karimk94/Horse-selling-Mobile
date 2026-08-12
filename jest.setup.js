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

jest.mock('react-native-safe-area-context', () => {
	const React = require('react');
	const { View } = require('react-native');
	return {
		useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
		SafeAreaView: ({ children, style }) => React.createElement(View, { style }, children),
		SafeAreaProvider: ({ children }) => children,
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
