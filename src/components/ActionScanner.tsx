import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import { FirebaseService } from '../services/FirebaseService';
import { useAuth } from '../context/AuthContext';
import { STATIONS } from '../constants/Stations';

export const ActionScanner = ({ onClose, testRole, visible }: any) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const player = useAudioPlayer('https://www.soundjay.com/buttons/beep-07a.mp3');

  const playBeep = async () => {
    try {
      if (player) {
        // Reset to start if it was played before
        await player.seekTo(0);
        player.play();
      } else {
        console.log("Audio player not initialized");
      }
    } catch (e) { 
      console.log("Sound play error:", e); 
    }
  };

  const activeRole = (testRole || user?.role || 'WORKER').toUpperCase();
  const userBranch = activeRole.split('_')[0]; // MASTAN / DELUXE / AGGREGATOR

  const hasRole = (rolePart: string) => activeRole.includes(rolePart) || activeRole === 'FOUNDER';

  const checkPermission = (item: any, qr: string) => {
    const s = item.status.toUpperCase();
    const isChild = qr.includes('_');
    const emb = (item.embroideryType || 'NONE').toUpperCase();

    // --- 🏷️ STEP-BY-STEP WORKFLOW ENFORCEMENT ---
    if (!isChild) {
      if (s === STATIONS.PENDING) return hasRole('AGGREGATOR');
      if (s === STATIONS.AGGREGATOR_ACCEPTED) return hasRole('STORE');
      if (s === STATIONS.FABRIC_ISSUED) return hasRole('AGGREGATOR');
      if (s === STATIONS.FABRIC_RECEIVED) return hasRole('HEAD');
      if (s === STATIONS.FINISH_DONE) return hasRole('AGGREGATOR');
      if (s === STATIONS.PACK_DONE) return hasRole('AGGREGATOR');
      if (s === STATIONS.READY_COURIER) return hasRole('COURIER');
      return false;
    }

    // --- ✂️ PIECE ACTIONS (Child QR) ---
    if (isChild) {
      if (s === STATIONS.AT_BRANCH_HEAD) return hasRole('MASTER');
      
      // Step 6: EMBROIDERY (Dual-scan support: Start & Finish)
      if (s === STATIONS.CUTTING_DONE) {
         if (emb === 'MACHINE' || emb === 'BOTH') return hasRole('MACHINE');
         if (emb === 'HAND') return hasRole('HAND');
         return hasRole('STITCH'); // Direct to stitch if no embroidery
      }
      
      if (s === STATIONS.EMB_MACHINE) return hasRole('MACHINE') || hasRole('HAND');
      if (s === STATIONS.EMB_HAND) return hasRole('HAND');
      if (s === STATIONS.EMB_DONE) return hasRole('STITCH') || hasRole('HEAD');

      // Step 7: TAILOR STITCH (Now with READY_STITCH)
      if (s === STATIONS.READY_STITCH) return hasRole('STITCH');
      if (s === STATIONS.STITCH_DONE) return hasRole('CHECKER');

      // Step 9: QUALITY & FINISHING
      if (s === STATIONS.QUALITY_PASS) return hasRole('FINISHER');
      if (s === STATIONS.PIECE_COLLECTED) return hasRole('AGGREGATOR'); // Aggregator prepares for packing
      if (s === STATIONS.READY_PACK) return hasRole('PACKER');
    }
    return false;
  };

  const handleScan = async ({ data }: any) => {
    if (scanned || !data) return;
    setScanned(true); setLoading(true);
    try {
      const info = await FirebaseService.getInfoByQR(data);
      if (!info) throw new Error("Ye QR system mein nahi mila. Kirpiya sahi QR scan karein.");
      
      const itemData = info.isParent ? info.items[0] : info;
      if (!checkPermission(itemData, data)) {
        // Clear vibration for error
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        throw new Error(`Ghalt Role! Aapka role (${activeRole}) is waqt (${itemData.status}) scan nahi kar sakta.`);
      }

      await FirebaseService.performActionScan(data, activeRole, user.uid, userBranch);
      
      // 🎉 Success Feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await playBeep();

      Alert.alert("Kaamyabi ✅", "Order next stage par bhej diya gaya hai.");
      onClose();
    } catch (e: any) { 
      Alert.alert("Masla!", e.message); 
      setScanned(false); 
    }
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{flex:1, backgroundColor:'#000'}}>
        <CameraView style={StyleSheet.absoluteFillObject} onBarcodeScanned={handleScan} />
        <View style={styles.overlay}>
          <View style={styles.frame} />
          <Text style={styles.tag}>ROLE: {activeRole}</Text>
          <Text style={styles.hint}>Scan order QR here</Text>
        </View>
        <TouchableOpacity style={styles.close} onPress={onClose}>
          <Text style={{color:'#fff', fontWeight:'bold'}}>WAPIS</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  frame: { width: 260, height: 260, borderWidth: 4, borderColor: '#10b981', borderStyle: 'solid', borderRadius: 30 },
  tag: { color: '#fff', marginTop: 25, backgroundColor: '#10b981', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, fontWeight: '900', letterSpacing: 1 },
  hint: { color: '#888', marginTop: 10, fontSize: 12, fontWeight: 'bold' },
  close: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: '#ef4444', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 20 }
});