import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { CameraView } from 'expo-camera';
import { FirebaseService } from '../services/FirebaseService';

interface Props {
  onClose: () => void;
  visible: boolean; // 👈 Modal visibility
}

export const InfoScanner: React.FC<Props> = ({ onClose, visible }) => {
  const [loading, setLoading] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      setScannedData(null);
      setLoading(false);
    }
  }, [visible]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (loading || scannedData) return;
    setLoading(true);
    try {
      const info = await FirebaseService.getInfoByQR(data);
      setScannedData(info);
    } catch (e) {
      Alert.alert("Error", "Details nahi mili");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.fullscreen}>
        <CameraView 
          style={StyleSheet.absoluteFillObject} 
          onBarcodeScanned={scannedData ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <View style={styles.tag}><Text style={styles.tagText}>📖 INFO SCAN (Passport)</Text></View>
        </View>

        <Modal visible={!!scannedData} transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>📄 Piece Passport</Text>
              <ScrollView>
                <Text style={styles.infoText}>Item: <Text style={{color:'#fff', fontWeight: 'bold'}}>{scannedData?.name}</Text></Text>
                <Text style={styles.infoText}>Stage: <Text style={{color:'#3498db', fontWeight: 'bold'}}>{scannedData?.status}</Text></Text>
                <Text style={styles.infoText}>Holder: <Text style={{color:'#fff'}}>{scannedData?.holder}</Text></Text>
                <Text style={styles.infoText}>Embroidery: <Text style={{color:'#e67e22'}}>{scannedData?.embroideryType || 'NONE'}</Text></Text>
                
                {scannedData?.measurement && (
                  <View style={styles.productionCard}>
                    <Text style={styles.cardHeader}>📏 MEASUREMENTS (Logic B)</Text>
                    <View style={styles.measureRow}>
                      <View style={styles.measureBox}>
                        <Text style={styles.measureLabel}>LENGTH</Text>
                        <Text style={styles.measureValue}>{scannedData.measurement.length}</Text>
                      </View>
                      <View style={styles.measureBox}>
                        <Text style={styles.measureLabel}>CHEST</Text>
                        <Text style={styles.measureValue}>{scannedData.measurement.chest}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>
              <TouchableOpacity style={styles.closeInfoBtn} onPress={() => setScannedData(null)}>
                <Text style={{color:'#fff', fontWeight:'bold', letterSpacing: 1}}>CLOSE PASSPORT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={{color:'#fff', fontWeight:'bold'}}>EXIT CAMERA</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullscreen: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scanFrame: { width: 250, height: 250, borderWidth: 3, borderColor: '#3498db', borderRadius: 30 },
  tag: { position: 'absolute', top: 100, backgroundColor: '#3498db', padding: 12, borderRadius: 10 },
  tagText: { color: '#fff', fontWeight: 'bold' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111', padding: 30, height: '60%', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  infoText: { color: '#888', marginBottom: 10, fontSize: 16 },
  
  productionCard: { marginTop: 20, backgroundColor: '#0a0a0a', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#333' },
  cardHeader: { color: '#f39c12', fontSize: 14, fontWeight: '900', marginBottom: 15, letterSpacing: 1 },
  measureRow: { flexDirection: 'row', justifyContent: 'space-between' },
  measureBox: { backgroundColor: '#1a1a1a', padding: 15, borderRadius: 10, width: '48%', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  measureLabel: { color: '#666', fontSize: 10, fontWeight: 'bold', marginBottom: 5, letterSpacing: 1 },
  measureValue: { color: '#fff', fontSize: 24, fontWeight: '900' },

  closeInfoBtn: { backgroundColor: '#3498db', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  closeBtn: { position: 'absolute', bottom: 60, alignSelf: 'center', backgroundColor: '#e74c3c', padding: 15, borderRadius: 30 }
});