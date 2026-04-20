import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import { FirebaseService } from '../services/FirebaseService';

interface Props {
  onClose: () => void;
  visible: boolean; // 👈 Modal visibility
}

export const InfoScanner: React.FC<Props> = ({ onClose, visible }) => {
  const [loading, setLoading] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);

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
              <Text style={styles.modalTitle}>📄 Piece Details</Text>
              <ScrollView>
                <Text style={styles.infoText}>Item: <Text style={{color:'#fff'}}>{scannedData?.name}</Text></Text>
                <Text style={styles.infoText}>Stage: <Text style={{color:'#3498db'}}>{scannedData?.status}</Text></Text>
                <Text style={styles.infoText}>Holder: {scannedData?.holder}</Text>
              </ScrollView>
              <TouchableOpacity style={styles.closeInfoBtn} onPress={() => setScannedData(null)}>
                <Text style={{color:'#fff', fontWeight:'bold'}}>CLOSE INFO</Text>
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
  closeInfoBtn: { backgroundColor: '#3498db', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  closeBtn: { position: 'absolute', bottom: 60, alignSelf: 'center', backgroundColor: '#e74c3c', padding: 15, borderRadius: 30 }
});