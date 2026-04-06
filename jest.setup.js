global.__reanimatedWorkletInit = () => {};

jest.mock('@expo/vector-icons', () => {
	const React = require('react');
	const { Text } = require('react-native');

	return {
		Ionicons: ({ name }) => React.createElement(Text, null, name),
		MaterialCommunityIcons: ({ name }) => React.createElement(Text, null, name),
	};
});