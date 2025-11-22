import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, Text } from 'react-native';

type Props = {
  onPress: () => void;
  style?: ViewStyle;
};

const FloatingActionButton: React.FC<Props> = ({ onPress, style }) => (
  <TouchableOpacity style={[styles.button, style]} onPress={onPress} activeOpacity={0.9}>
    <Text style={styles.plus}>＋</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  plus: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 32,
  },
});

export default FloatingActionButton;
