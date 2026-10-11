import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DetailActionBar({ actions }) {
  return (
    <View testID="detail-action-bar" style={styles.container}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.id}
          testID={action.testID}
          accessibilityRole="button"
          style={[
            styles.button,
            { backgroundColor: action.color },
            action.inactive && styles.inactive,
          ]}
          onPress={action.onPress}
        >
          <Ionicons name={action.icon} size={20} color="#ffffff" />
          <Text style={styles.label}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    padding: 0,
    margin: 0,
    borderRadius: 0,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 4,
  },
  inactive: {
    opacity: 0.55,
  },
});
