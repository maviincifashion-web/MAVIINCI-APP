import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Image, Dimensions, SafeAreaView, StatusBar } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../context/AuthContext';
import { FirebaseService } from '../services/FirebaseService';
import { ActionScanner } from '../components/ActionScanner';
import { InfoScanner } from '../components/InfoScanner';
import { ToggleableQR } from '../components/ToggleableQR';
import { checkPermission, getSummaryStatus } from '../services/WorkflowEngine';
import { STATIONS } from '../constants/Stations';
import { SafarMapGraph } from '../components/SafarMapGraph';
import { Colors } from '../constants/theme';

const { width } = Dimensions.get('window');

export const Dashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionScan, setActionScan] = useState(false);
  const [infoScan, setInfoScan] = useState(false);
  const [safar, setSafar] = useState<any>(null);
  const [selectedOrderForQRs, setSelectedOrderForQRs] = useState<any>(null);
  const [testRole, setTestRole] = useState(user?.role || 'FOUNDER');

  useEffect(() => {
    if (user?.companyId) {
      const unsub = FirebaseService.listenToOrders(user.companyId, (data) => {
        setOrders(data); setLoading(false);
      });
      return () => unsub();
    }
  }, [user]);

  // Auto-update the open Safar Modal if the background data changes
  useEffect(() => {
    if (safar) {
      const updatedSafar = orders.find(o => o.orderId === safar.orderId);
      if (updatedSafar) setSafar(updatedSafar);
    }
  }, [orders]);

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase() || '';
    if (['DONE', 'COMPLETED', 'READY_COURIER', 'PACK_DONE'].includes(s)) return '#10b981'; // Success (Emerald)
    if (['PENDING', 'AGGREGATOR_ACCEPTED'].includes(s)) return '#f59e0b'; // Attention (Amber)
    if (s.includes('READY') || s.includes('ISSUED')) return '#8b5cf6'; // Transition (Violet)
    if (s.includes('EMB') || s.includes('STITCH') || s.includes('CUTTING')) return '#3b82f6'; // Work in Progress (Blue)
    if (s.includes('PASS') || s.includes('RECEIVED') || s.includes('COLLECTED')) return '#06b6d4'; // Validation/Receipt (Cyan)
    return '#6366f1'; // Default (Indigo)
  };

  const filteredOrders = orders.filter(o => {
    if (['FOUNDER', 'CO_FOUNDER', 'MANAGER', 'STORE', 'AGGREGATOR'].includes(testRole)) return true;

    // Check if any item in the order is permissible for this role
    const isParentActionable = checkPermission(o.items[0], o.orderId, o.items, testRole);
    if (isParentActionable) return true;

    const isAnyChildActionable = o.items.some((i: any) => checkPermission(i, i.childId, o.items, testRole));
    if (isAnyChildActionable) {
       const userBranch = testRole.split('_')[0];
       const isGenericRole = ['MACHINE', 'HAND', 'WORKER', 'PACKER'].includes(userBranch);
       
       if (isGenericRole) return true;
       // For branch-specific roles, they must match branchOwner or branchOwner isn't set yet (they can claim it)
       return o.items.some((i: any) => i.branchOwner === userBranch || !i.branchOwner);
    }
    
    // Always show orders if their branch owns any piece, so they can track progress
    const userBranch = testRole.split('_')[0];
    const isGenericRole = ['MACHINE', 'HAND', 'WORKER', 'PACKER'].includes(userBranch);
    if (!isGenericRole) {
        return o.items.some((i: any) => i.branchOwner === userBranch);
    }
    return false;
  });

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#fff" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Scrollable Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.roleName}>{user?.name || 'User'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{testRole}</Text>
            </View>
          </View>
          <Image 
            source={require('../../assets/images/logo-glow.png')} 
            style={styles.logo}
            defaultSource={require('../../assets/images/icon.png')}
          />
        </View>

        {/* Role Switcher - Now more visible */}
        <Text style={styles.sectionLabel}>Switch Workspace</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.tabContainer}
          contentContainerStyle={{ paddingRight: 20 }}
        >
          {[
            'FOUNDER', 'AGGREGATOR', 'STORE', 
            'MASTAN_HEAD', 'MASTAN_MASTER', 'MASTAN_STITCH', 'MASTAN_CHECKER', 'MASTAN_FINISHER',
            'DELUXE_HEAD', 'DELUXE_MASTER', 'DELUXE_STITCH', 'DELUXE_CHECKER', 'DELUXE_FINISHER',
            'MACHINE_EMB', 'HAND_EMB', 
            'PACKER', 'COURIER'
          ].map(r => (
            <TouchableOpacity 
              key={r} 
              onPress={() => setTestRole(r)} 
              style={[styles.tab, testRole === r && styles.activeTab]}
            >
              <Text style={[styles.tabText, testRole === r && styles.activeTabText]}>{r.replace('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{filteredOrders.length}</Text>
            <Text style={styles.statLab}>Workspace Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{orders.filter(o => o.items?.[0]?.status === 'COMPLETED').length}</Text>
            <Text style={styles.statLab}>Global Completed</Text>
          </View>
        </View>

        <View style={styles.scanRow}>
          <TouchableOpacity style={[styles.scanBtn, {backgroundColor:'#10b981'}]} onPress={() => setActionScan(true)}>
            <Text style={styles.btnT}>⚡ ACTION SCAN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.scanBtn, {backgroundColor:'#3b82f6'}]} onPress={() => setInfoScan(true)}>
            <Text style={styles.btnT}>🔍 INFO SCAN</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>🚂 Workspace Queue</Text>
        {filteredOrders.length === 0 && <Text style={{color: '#888', fontStyle: 'italic', marginBottom: 20}}>No orders require action in this workspace right now.</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
          {filteredOrders.map(o => {
            const status = getSummaryStatus(o.items);
            
            const totalItems = o.items.length;
            const itemsPackedOrDone = o.items.filter((i:any) => [STATIONS.PACKED_PIECE, STATIONS.PACKED_DONE, STATIONS.READY_COURIER, STATIONS.COMPLETED].includes(i.status)).length;
            const hasUnclaimed = o.items.some((i:any) => i.status === STATIONS.FABRIC_RECEIVED);
            const hasClaimed = o.items.some((i:any) => i.status !== STATIONS.FABRIC_RECEIVED && i.status !== STATIONS.PENDING && i.status !== STATIONS.AGGREGATOR_ACCEPTED && i.status !== STATIONS.FABRIC_ISSUED);

            const userBranch = testRole.split('_')[0];
            const itemsAtMyBranch = o.items.filter((i:any) => i.branchOwner === userBranch).length;
            
            const showParentQR = [STATIONS.PENDING, STATIONS.AGGREGATOR_ACCEPTED, STATIONS.FABRIC_ISSUED, STATIONS.FABRIC_RECEIVED, STATIONS.PACKED_DONE, STATIONS.READY_COURIER, STATIONS.COMPLETED].includes(status) || 
                                 (testRole.includes('HEAD') && hasUnclaimed);
            
            const showPieceButton = hasClaimed && ![STATIONS.PACKED_DONE, STATIONS.READY_COURIER, STATIONS.COMPLETED].includes(status);

            return (
              <View key={o.id} style={styles.trainCard}>
                <View style={styles.trainHeader}>
                  <Text style={styles.orderId}>#{o.orderId}</Text>
                  <TouchableOpacity onPress={() => setSafar(o)} style={styles.safarIconBtn}>
                    <Text style={styles.safarIconText}>🗺️</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.railContainer}>
                  <View style={[styles.railLine, { backgroundColor: getStatusColor(status) }]} />
                  <View style={[styles.trainNode, { borderColor: getStatusColor(status) }]}>
                    <View style={[styles.trainInnerNode, { backgroundColor: getStatusColor(status) }]} />
                  </View>
                </View>
                
                <View style={styles.trainContent}>
                  <Text style={[styles.stationText, {color: getStatusColor(status)}]}>{status.replace(/_/g, ' ')}</Text>
                  
                  {o.items[0].status === 'FABRIC_RECEIVED' || o.items[0].status === 'AT_BRANCH_HEAD' || o.items[0].status === 'CUTTING_DONE' ? (
                     <View style={{backgroundColor: '#1a1a1a', padding: 8, borderRadius: 8, marginBottom: 10, width: '100%'}}>
                       <Text style={{color: '#fff', fontSize: 10, textAlign: 'center'}}>Items at Branch: {itemsAtMyBranch}</Text>
                     </View>
                  ) : (
                     <View style={{backgroundColor: '#1a1a1a', padding: 8, borderRadius: 8, marginBottom: 10, width: '100%'}}>
                       <Text style={{color: '#fff', fontSize: 10, textAlign: 'center'}}>Progress: {itemsPackedOrDone}/{totalItems} Finished</Text>
                     </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    {showParentQR && (
                      <View style={{alignItems: 'center'}}>
                        <View style={styles.qrContainerRail}>
                          <ToggleableQR value={o.orderId} size={80} color="#fff" backgroundColor="transparent" />
                        </View>
                        <Text style={styles.qrHint}>{testRole.includes('HEAD') && hasClaimed ? 'Parent QR' : 'Tap 👁️ reveal'}</Text>
                      </View>
                    )}

                    {showPieceButton && (
                      <View style={{alignItems: 'center'}}>
                        <TouchableOpacity 
                          style={[styles.qrContainerRail, { paddingVertical: showParentQR ? 12 : 15, width: showParentQR ? 80 : 100 }]} 
                          onPress={() => setSelectedOrderForQRs(o)}
                        >
                          <Text style={{ fontSize: showParentQR ? 24 : 32 }}>📱</Text>
                          <Text style={{ color: '#fff', fontSize: 8, fontWeight: 'bold', marginTop: 4, textAlign: 'center' }}>
                            {showParentQR ? 'PIECES' : 'Tap for\nPiece QRs'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </ScrollView>

      <ActionScanner visible={actionScan} testRole={testRole} onClose={() => setActionScan(false)} />
      <InfoScanner visible={infoScan} onClose={() => setInfoScan(false)} />

      <Modal visible={!!safar} animationType="slide" statusBarTranslucent>
        <SafeAreaView style={styles.safarFullPage}>
          <StatusBar barStyle="light-content" backgroundColor="#020617" />
          {/* Sticky Header */}
          <View style={styles.safarHeader}>
            <TouchableOpacity onPress={() => setSafar(null)} style={styles.safarBackBtn}>
              <Text style={styles.safarBackIcon}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.safarTitle}>🚂 Safar Map</Text>
              <Text style={styles.safarSubtitle}>Order #{safar?.orderId}</Text>
            </View>
          </View>

          {/* Full Page Graph */}
          <SafarMapGraph order={safar} />
        </SafeAreaView>
      </Modal>

      {/* CHILD QRs MODAL */}
      <Modal visible={!!selectedOrderForQRs} transparent animationType="fade">
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.qrModalHeader}>
              <View>
                <Text style={styles.qrModalTitle}>Piece QRs</Text>
                <Text style={styles.qrModalSub}>Order #{selectedOrderForQRs?.orderId}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedOrderForQRs(null)} style={styles.qrModalClose}>
                <Text style={{color:'#fff', fontSize:20}}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.qrGrid}>
              {selectedOrderForQRs?.items?.map((item: any, idx: number) => (
                <View key={item.childId || idx} style={styles.childQrCard}>
                  <Text style={styles.childQrName} numberOfLines={1}>{item.name || `Piece ${idx + 1}`}</Text>
                  <Text style={styles.childQrId}>#{item.childId}</Text>
                  
                  <View style={{ marginTop: 10, padding: 5, backgroundColor: '#fff', borderRadius: 10 }}>
                    <ToggleableQR value={item.childId} size={90} color="#000" backgroundColor="#fff" />
                  </View>
                  
                  <Text style={[styles.childQrStatus, { color: getStatusColor(item.status) }]}>
                    {item.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#000', paddingHorizontal:20 },
  center: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#000' },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, marginTop:10 },
  greeting: { color:'#666', fontSize:14 },
  roleName: { color:'#fff', fontSize:26, fontWeight:'900', marginTop:2 },
  roleBadge: { backgroundColor:'#1a1a1a', paddingHorizontal:10, paddingVertical:4, borderRadius:8, alignSelf:'flex-start', marginTop:8 },
  roleBadgeText: { color:'#3b82f6', fontSize:10, fontWeight:'bold', letterSpacing:1 },
  logo: { width:60, height:60, borderRadius:15 },
  
  sectionLabel: { color:'#444', fontSize:10, fontWeight:'bold', textTransform:'uppercase', letterSpacing:1, marginBottom:10 },
  tabContainer: { maxHeight:55, marginBottom:25 },
  tab: { paddingHorizontal:16, paddingVertical:10, marginRight:10, backgroundColor:'#111', borderRadius:12, borderWidth:1, borderColor:'#222', height: 40 },
  activeTab: { backgroundColor:'#3b82f6', borderColor:'#3b82f6' },
  tabText: { color:'#666', fontSize:11, fontWeight:'600' },
  activeTabText: { color:'#fff' },

  statsRow: { flexDirection:'row', gap:15, marginBottom:25 },
  statCard: { flex:1, backgroundColor:'#111', padding:15, borderRadius:20, borderWidth:1, borderColor:'#222' },
  statVal: { color:'#fff', fontSize:22, fontWeight:'bold' },
  statLab: { color:'#666', fontSize:12, marginTop:4 },

  scanRow: { flexDirection:'row', gap:12, marginBottom:30 },
  scanBtn: { flex:1, padding:18, borderRadius:20, alignItems:'center', elevation:5, shadowColor:'#000', shadowOffset:{width:0, height:4}, shadowOpacity:0.3, shadowRadius:5 },
  btnT: { color:'#fff', fontWeight:'900', fontSize:13, letterSpacing:0.5 },

  sectionTitle: { color:'#fff', fontSize:18, fontWeight:'bold', marginBottom:15, letterSpacing:1 },
  
  // RAILROAD STYLES
  trainCard: { backgroundColor:'#111', borderRadius:20, marginRight:15, width: 220, overflow:'hidden', borderWidth:1, borderColor:'#1a1a1a', paddingBottom: 15 },
  trainHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#1a1a1a' },
  orderId: { color:'#fff', fontSize:18, fontWeight:'900' },
  safarIconBtn: { backgroundColor: '#1a1a1a', padding: 5, borderRadius: 8 },
  safarIconText: { fontSize: 16 },
  
  railContainer: { flexDirection: 'row', alignItems: 'center', height: 40, marginVertical: 10 },
  railLine: { position: 'absolute', top: '50%', left: 0, right: 0, height: 4, zIndex: 0 },
  trainNode: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', marginLeft: '50%', transform: [{translateX: -12}], zIndex: 1 },
  trainInnerNode: { width: 10, height: 10, borderRadius: 5 },
  
  trainContent: { alignItems: 'center', paddingHorizontal: 15 },
  stationText: { fontSize:12, fontWeight:'900', letterSpacing:0.5, marginBottom: 15, textAlign: 'center' },
  qrContainerRail: { padding:8, backgroundColor:'#1a1a1a', borderRadius:15, alignItems:'center', justifyContent:'center' },
  qrHint: { color:'#444', fontSize:10, marginTop:8, fontWeight:'bold' },

  // SAFAR MAP FULL PAGE
  safarFullPage: { flex: 1, backgroundColor: '#020617' },
  safarHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  safarBackBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  safarBackIcon: { color: '#fff', fontSize: 20, fontWeight: '900' },
  safarTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
  safarSubtitle: { color: '#64748b', fontSize: 12, fontWeight: '600', marginTop: 2 },
  
  // CHILD QRs MODAL
  qrModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  qrModalContent: { backgroundColor: '#111', borderRadius: 24, padding: 20, maxHeight: '80%', borderWidth: 1, borderColor: '#222' },
  qrModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
  qrModalTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  qrModalSub: { color: '#888', fontSize: 12, marginTop: 2 },
  qrModalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  qrGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 20 },
  childQrCard: { width: '48%', backgroundColor: '#0a0a0a', borderRadius: 16, padding: 12, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#1a1a1a' },
  childQrName: { color: '#fff', fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  childQrId: { color: '#666', fontSize: 10, marginTop: 2 },
  childQrStatus: { fontSize: 10, fontWeight: 'bold', marginTop: 10, textAlign: 'center' }
});