/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║                MAVIINCI ERP — ACTION SCANNER                         ║
 * ║                                                                       ║
 * ║  QR Scanner component jo order processing ke liye use hota hai.      ║
 * ║  Ye component 5 modes mein kaam karta hai:                           ║
 * ║                                                                       ║
 * ║  1. CAMERA MODE    → QR scan karo                                    ║
 * ║  2. PICKER MODE    → HEAD: items select karke claim karo             ║
 * ║  3. DISPATCH MODE  → COURIER: tracking ID + receipt photo            ║
 * ║  4. REWORK MODE    → CHECKER: pass/fail decision                     ║
 * ║  5. PACKED QR MODE → Last piece packed → Parent QR dikhao            ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, ScrollView, TextInput } from 'react-native';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import { ToggleableQR } from './ToggleableQR';
import { useAudioPlayer } from 'expo-audio';
import { FirebaseService } from '../services/FirebaseService';
import { useAuth } from '../context/AuthContext';
import { STATIONS } from '../constants/Stations';
import { checkPermission } from '../services/WorkflowEngine';

export const ActionScanner = ({ onClose, testRole, visible }: any) => {
  const { user } = useAuth();

  // ── State Management ────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [itemsToPick, setItemsToPick] = useState<any[] | null>(null);        // Picker mode items
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);       // Selected items for claim
  const [scannedParentData, setScannedParentData] = useState<string>('');     // Parent QR data for claim
  const [dispatchMode, setDispatchMode] = useState<string | null>(null);      // Courier dispatch mode
  const [trackingId, setTrackingId] = useState('');                           // Courier tracking ID
  const [showPackedDoneQR, setShowPackedDoneQR] = useState<string | null>(null); // Packed → show Parent QR
  const player = useAudioPlayer('https://www.soundjay.com/buttons/beep-07a.mp3');

  // Reset state jab scanner open ho
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setLoading(false);
    }
  }, [visible]);

  // ── Helpers ─────────────────────────────────────────────────────────
  const playBeep = async () => {
    try {
      if (player) {
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔄 PROCESS SCAN — Firebase ko status update bhejo
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const processScan = async (data: string, overrideStatus?: string) => {
    try {
      const res = await FirebaseService.performActionScan(data, activeRole, user.uid, userBranch, overrideStatus);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await playBeep();

      // 📦 Agar last piece pack hua → Parent QR dikhao box ke liye
      if (res.nextStatus === STATIONS.PACKED_DONE && data.includes('_')) {
        setShowPackedDoneQR(data.split('_')[0]);
        setLoading(false);
        return;
      }

      Alert.alert("Kaamyabi ✅", overrideStatus ? "Piece Rework me chala gaya." : "Order next stage par bhej diya gaya hai.");
      onClose();
    } catch (e: any) {
      Alert.alert("Masla!", e.message);
      setScanned(false);
    }
    setLoading(false);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ✂️ PARTIAL CLAIM — HEAD ne selected items claim kiye
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const processPartialScan = async () => {
    if (selectedItemIds.length === 0) {
      Alert.alert("Bhai!", "Kam se kam ek item toh select karo!");
      return;
    }
    setLoading(true);
    try {
      await FirebaseService.performActionScan(scannedParentData, activeRole, user.uid, userBranch, undefined, selectedItemIds);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await playBeep();
      Alert.alert("Kaamyabi ✅", "Selected items aapke branch mein aagaye.");
      setItemsToPick(null);
      setSelectedItemIds([]);
      onClose();
    } catch (e: any) {
      Alert.alert("Masla!", e.message);
      setScanned(false);
    }
    setLoading(false);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📸 HANDLE SCAN — Main QR scan handler (decision tree)
  //
  //   Decision flow:
  //   1. QR scan → info laao → permission check
  //   2. Branch lock check (child QR ke liye)
  //   3. Route to correct mode:
  //      - HEAD + Parent QR        → PICKER MODE (items choose karo)
  //      - COURIER + READY_COURIER → DISPATCH MODE (tracking + photo)
  //      - CHECKER + STITCH_DONE   → REWORK MODE (pass/fail)
  //      - Baaki sab               → Direct process (next station)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleScan = async ({ data }: any) => {
    if (scanned || !data) return;
    setScanned(true); setLoading(true);

    try {
      // Step 1: QR data se item/order info fetch karo
      const info = await FirebaseService.getInfoByQR(data);
      if (!info) throw new Error("Ye QR system mein nahi mila. Kirpiya sahi QR scan karein.");

      const itemData = info.isParent ? info.items[0] : info;
      const isChild = data.includes('_');

      // Step 2: Permission check — kya ye role is status par scan kar sakta hai?
      if (!checkPermission(itemData, data, info.isParent ? info.items : [info], activeRole)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        throw new Error(`Ghalt Role! Aapka role (${activeRole}) is waqt (${itemData.status}) scan nahi kar sakta.`);
      }

      // Step 3: 🔒 BRANCH LOCKING — Child piece sirf apni branch ka banda scan kare
      if (isChild && itemData.branchOwner && !hasRole('AGGREGATOR') && !hasRole('FOUNDER')) {
        const isGenericRole = ['MACHINE', 'HAND', 'WORKER', 'PACKER'].includes(userBranch);
        if (!isGenericRole && userBranch !== itemData.branchOwner) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          throw new Error(`Branch Lock 🔒! Ye piece ${itemData.branchOwner} branch ka hai. Aap isay scan nahi kar sakte.`);
        }
      }

      // Step 4: Route to correct mode

      // ✂️ HEAD scanning parent QR → Item picker dikhao
      if (!isChild && hasRole('HEAD')) {
        setItemsToPick(info.items);
        setSelectedItemIds([]);
        setScannedParentData(data);
        setLoading(false);
        return;
      }

      // 📦 COURIER scanning READY_COURIER → Dispatch mode
      if (!isChild && itemData.status === STATIONS.READY_COURIER && hasRole('COURIER')) {
        setDispatchMode(data);
        setTrackingId('');
        setLoading(false);
        return;
      }

      // ⏪ CHECKER scanning STITCH_DONE → Rework decision (Pass / Fail)
      if (isChild && itemData.status === STATIONS.STITCH_DONE && hasRole('CHECKER')) {
        setLoading(false);
        Alert.alert(
          "Gatekeeper Check 🔍",
          "Piece kaisa hai?",
          [
            { text: "FAIL to Master", style: 'destructive', onPress: () => processScan(data, STATIONS.AT_BRANCH_HEAD) },
            { text: "FAIL to Stitcher", style: 'destructive', onPress: () => processScan(data, STATIONS.CUTTING_DONE) },
            { text: "PASS ✅", style: 'default', onPress: () => processScan(data) }
          ],
          { cancelable: false }
        );
        return;
      }

      // ⚡ DEFAULT: Seedha next station par bhejo
      await processScan(data);

    } catch (e: any) {
      Alert.alert("Masla!", e.message);
      setScanned(false);
      setLoading(false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎨 RENDER — 5 modes ka UI
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <Modal visible={visible} animationType="slide">
      <View style={{flex:1, backgroundColor:'#000'}}>

        {/* ── MODE 1: ITEM PICKER (HEAD claim) ──────────────────────── */}
        {itemsToPick ? (
          <View style={styles.pickerOverlay}>
            <Text style={styles.pickerTitle}>Items Choose Karein</Text>
            <ScrollView style={styles.pickerScroll} contentContainerStyle={{paddingBottom: 20}}>
              {itemsToPick.map(item => {
                const isTaken = item.status !== STATIONS.FABRIC_RECEIVED;
                const isSelected = selectedItemIds.includes(item.childId);
                return (
                  <TouchableOpacity
                    key={item.childId}
                    disabled={isTaken}
                    style={[
                      styles.pickRow,
                      isSelected && styles.pickRowSelected,
                      isTaken && { opacity: 0.5, borderColor: '#333' }
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedItemIds(selectedItemIds.filter(id => id !== item.childId));
                      } else {
                        setSelectedItemIds([...selectedItemIds, item.childId]);
                      }
                    }}
                  >
                    <View>
                      <Text style={[styles.pickText, isSelected && {color: '#fff'}]}>{item.name}</Text>
                      {isTaken && <Text style={{color: '#e74c3c', fontSize: 11, marginTop: 4}}>Taken by other tailor head</Text>}
                    </View>
                    {isSelected && <Text style={{color: '#fff', fontSize: 18}}>✅</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.claimBtn} onPress={processPartialScan}>
              {loading ? <ActivityIndicator color="#000"/> : <Text style={styles.claimBtnText}>CLAIM ITEMS</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setItemsToPick(null); setScanned(false); }}>
              <Text style={{color: '#ef4444', fontWeight: 'bold'}}>CANCEL</Text>
            </TouchableOpacity>
          </View>

        /* ── MODE 2: DISPATCH (COURIER) ──────────────────────────── */
        ) : dispatchMode ? (
          <View style={styles.pickerOverlay}>
            <Text style={styles.pickerTitle}>Courier Dispatch 📦</Text>
            <View style={{flex:1, width:'100%', justifyContent:'center'}}>
              <Text style={{color:'#fff', marginBottom: 10, fontSize: 16}}>Enter Tracking ID:</Text>
              <TextInput
                style={{backgroundColor:'#1a1a1a', color:'#fff', padding:15, borderRadius:10, fontSize:18, borderWidth:1, borderColor:'#333'}}
                placeholder="e.g. AWB123456789"
                placeholderTextColor="#666"
                value={trackingId}
                onChangeText={setTrackingId}
              />
              <Text style={{color:'#888', marginTop: 20, fontSize: 12}}>* Receipt photo zaroori hai!</Text>
            </View>
            <TouchableOpacity
              style={styles.claimBtn}
              onPress={async () => {
                if(!trackingId) return Alert.alert("Wait", "Tracking ID zaroori hai!");

                const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                if (permissionResult.granted === false) {
                  Alert.alert("Permission Error", "Camera permission zaroori hai!");
                  return;
                }

                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  quality: 0.5,
                });

                if (!result.canceled) {
                  // TODO: Upload result.assets[0].uri to Firebase Storage
                  processScan(dispatchMode);
                  setDispatchMode(null);
                }
              }}
            >
              <Text style={styles.claimBtnText}>CAPTURE RECEIPT & DISPATCH 🚀</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setDispatchMode(null); setScanned(false); }}>
              <Text style={{color: '#ef4444', fontWeight: 'bold'}}>CANCEL</Text>
            </TouchableOpacity>
          </View>

        /* ── MODE 3: PACKED DONE — Parent QR dikhao ──────────────── */
        ) : showPackedDoneQR ? (
          <View style={styles.pickerOverlay}>
            <Text style={styles.pickerTitle}>MERGE COMPLETE! 📦</Text>
            <Text style={{color: '#fff', textAlign: 'center', marginBottom: 30, fontSize: 16}}>Sabhi pieces pack ho gaye hain. Niche diye gaye Parent QR ko dabbe (box) par lagayein.</Text>
            <View style={{backgroundColor: '#fff', padding: 20, borderRadius: 20, alignSelf: 'center'}}>
              <ToggleableQR value={showPackedDoneQR} size={250} color="#000" backgroundColor="#fff" />
            </View>
            <Text style={{color: '#fff', textAlign: 'center', marginTop: 15, fontSize: 24, fontWeight: '900'}}>#{showPackedDoneQR}</Text>
            <TouchableOpacity
              style={[styles.claimBtn, {marginTop: 40}]}
              onPress={() => {
                setShowPackedDoneQR(null);
                onClose();
              }}
            >
              <Text style={styles.claimBtnText}>DONE</Text>
            </TouchableOpacity>
          </View>

        /* ── MODE 4: CAMERA (Default scan mode) ──────────────────── */
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              onBarcodeScanned={handleScan}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            />
            <View style={styles.overlay}>
              <View style={styles.frame} />
              <Text style={styles.tag}>ROLE: {activeRole}</Text>
              <Text style={styles.hint}>Scan order QR here</Text>
            </View>
            <TouchableOpacity style={styles.close} onPress={onClose}>
              <Text style={{color:'#fff', fontWeight:'bold'}}>WAPIS</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 STYLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const styles = StyleSheet.create({
  // Camera overlay
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  frame: { width: 260, height: 260, borderWidth: 4, borderColor: '#10b981', borderStyle: 'solid', borderRadius: 30 },
  tag: { color: '#fff', marginTop: 25, backgroundColor: '#10b981', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, fontWeight: '900', letterSpacing: 1 },
  hint: { color: '#888', marginTop: 10, fontSize: 12, fontWeight: 'bold' },
  close: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: '#ef4444', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 20 },

  // Picker / Dispatch / PackedQR overlay
  pickerOverlay: { flex: 1, backgroundColor: '#0a0a0a', padding: 20, justifyContent: 'center' },
  pickerTitle: { color: '#10b981', fontSize: 24, fontWeight: '900', marginBottom: 20, marginTop: 40, textAlign: 'center' },
  pickerScroll: { flex: 1, width: '100%' },
  pickRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#111', padding: 20, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  pickRowSelected: { backgroundColor: '#10b981', borderColor: '#10b981' },
  pickText: { color: '#aaa', fontSize: 18, fontWeight: 'bold' },
  claimBtn: { backgroundColor: '#10b981', padding: 20, borderRadius: 15, alignItems: 'center', marginTop: 20 },
  claimBtnText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  cancelBtn: { padding: 20, alignItems: 'center', marginTop: 10 }
});