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

export const ActionScanner = ({ onClose, testRole, visible }: any) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [itemsToPick, setItemsToPick] = useState<any[] | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [scannedParentData, setScannedParentData] = useState<string>('');
  const [dispatchMode, setDispatchMode] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState('');
  const [showPackedDoneQR, setShowPackedDoneQR] = useState<string | null>(null);
  const player = useAudioPlayer('https://www.soundjay.com/buttons/beep-07a.mp3');

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setLoading(false);
    }
  }, [visible]);

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

  const checkPermission = (item: any, qr: string, allItems: any[] = []) => {
    const s = item.status.toUpperCase();
    const isChild = qr.includes('_');
    const emb = (item.embroideryType || 'NONE').toUpperCase();

    // --- 🏷️ STEP-BY-STEP WORKFLOW ENFORCEMENT ---
    if (!isChild) {
      if (s === STATIONS.PENDING) return hasRole('AGGREGATOR');
      if (s === STATIONS.AGGREGATOR_ACCEPTED) return hasRole('STORE');
      if (s === STATIONS.FABRIC_ISSUED) return hasRole('AGGREGATOR');
      if (s === STATIONS.FABRIC_RECEIVED) return hasRole('HEAD');
      
      // 🛠️ FIX: Allow second Head to scan if ANY item is still available
      if (hasRole('HEAD') && allItems.some(i => i.status === STATIONS.FABRIC_RECEIVED)) return true;

      if (s === STATIONS.PACKED_DONE) return hasRole('AGGREGATOR');
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
      if (s === STATIONS.EMB_DONE) return hasRole('STITCH');

      // Step 8: TAILOR STITCH -> Step 9: CHECKER
      if (s === STATIONS.STITCH_DONE) return hasRole('CHECKER');

      // Step 9: QUALITY & FINISHING
      if (s === STATIONS.QUALITY_PASS) return hasRole('FINISHER');
      if (s === STATIONS.BACK_AT_AG) return hasRole('AGGREGATOR');
      if (s === STATIONS.PIECE_COLLECTED) return hasRole('PACKER');
      if (s === STATIONS.PACKED_PIECE) return hasRole('PACKER');
    }
    return false;
  };

  const processScan = async (data: string, overrideStatus?: string) => {
    try {
      const res = await FirebaseService.performActionScan(data, activeRole, user.uid, userBranch, overrideStatus);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await playBeep();
      
      if (res.nextStatus === STATIONS.PACKED_DONE && data.includes('_')) {
         // The last child piece was packed. Show Parent QR.
         setShowPackedDoneQR(data.split('_')[0]);
         setLoading(false);
         return; // Wait for them to dismiss the big QR
      }
      
      Alert.alert("Kaamyabi ✅", overrideStatus ? "Piece Rework me chala gaya." : "Order next stage par bhej diya gaya hai.");
      onClose();
    } catch (e: any) {
      Alert.alert("Masla!", e.message);
      setScanned(false);
    }
    setLoading(false);
  };

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

  const handleScan = async ({ data }: any) => {
    if (scanned || !data) return;
    setScanned(true); setLoading(true);
    try {
      const info = await FirebaseService.getInfoByQR(data);
      if (!info) throw new Error("Ye QR system mein nahi mila. Kirpiya sahi QR scan karein.");
      
      const itemData = info.isParent ? info.items[0] : info;
      const isChild = data.includes('_');

      if (!checkPermission(itemData, data, info.isParent ? info.items : [info])) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        throw new Error(`Ghalt Role! Aapka role (${activeRole}) is waqt (${itemData.status}) scan nahi kar sakta.`);
      }

      // 🔒 BRANCH LOCKING
      if (isChild && itemData.branchOwner && !hasRole('AGGREGATOR') && !hasRole('FOUNDER')) {
        // If user is a branch specific role (like MASTAN_HEAD, DELUXE_MASTER)
        // Ensure userBranch (MASTAN/DELUXE) matches itemData.branchOwner
        // Generic roles that don't have a branch prefix (like MACHINE_EMB, HAND_EMB, PACKER) bypass this.
        const isGenericRole = ['MACHINE', 'HAND', 'WORKER', 'PACKER'].includes(userBranch);
        
        if (!isGenericRole && userBranch !== itemData.branchOwner) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            throw new Error(`Branch Lock 🔒! Ye piece ${itemData.branchOwner} branch ka hai. Aap isay scan nahi kar sakte.`);
        }
      }

      // ✂️ SPLIT PHASE: Head scanning parent QR
      if (!isChild && hasRole('HEAD')) {
         // Show all items, let them pick available ones.
         setItemsToPick(info.items);
         setSelectedItemIds([]);
         setScannedParentData(data);
         setLoading(false);
         return; // Wait for user to select items
      }

      // 📦 DISPATCH LOGIC (Courier)
      if (!isChild && itemData.status === STATIONS.READY_COURIER && hasRole('COURIER')) {
         setDispatchMode(data);
         setTrackingId('');
         setLoading(false);
         return;
      }

      // ⏪ REWORK LOGIC (Quality Pass)
      if (isChild && itemData.status === STATIONS.STITCH_DONE && hasRole('CHECKER')) {
         setLoading(false); // Stop loading for the alert
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

      await processScan(data);
    } catch (e: any) { 
      Alert.alert("Masla!", e.message); 
      setScanned(false); 
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{flex:1, backgroundColor:'#000'}}>
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
                   // In real app, upload result.assets[0].uri to Firebase Storage here
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

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  frame: { width: 260, height: 260, borderWidth: 4, borderColor: '#10b981', borderStyle: 'solid', borderRadius: 30 },
  tag: { color: '#fff', marginTop: 25, backgroundColor: '#10b981', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, fontWeight: '900', letterSpacing: 1 },
  hint: { color: '#888', marginTop: 10, fontSize: 12, fontWeight: 'bold' },
  close: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: '#ef4444', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 20 },
  
  // Picker UI
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