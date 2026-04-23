import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface ToggleableQRProps {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export const ToggleableQR: React.FC<ToggleableQRProps> = ({ value, size = 80, color = '#000', backgroundColor = '#fff' }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.container}>
      <View style={[styles.qrWrapper, { width: size + 10, height: size + 10, backgroundColor }]}>
        {isVisible ? (
          <QRCode value={value} size={size} color={color} backgroundColor={backgroundColor} />
        ) : (
          <View style={[styles.hiddenOverlay, { width: size, height: size }]}>
            <Text style={styles.hiddenText}>QR HIDDEN</Text>
          </View>
        )}
      </View>
      <TouchableOpacity 
        style={styles.eyeBtn} 
        onPress={() => setIsVisible(!isVisible)}
      >
        <Text style={styles.eyeIcon}>{isVisible ? '👁️' : '👁️‍🗨️'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'relative',
  },
  qrWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
  },
  hiddenOverlay: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  hiddenText: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    elevation: 3,
  },
  eyeIcon: {
    fontSize: 14,
  }
});
