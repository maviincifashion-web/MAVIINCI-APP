import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Image, Dimensions, SafeAreaView, StatusBar } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../context/AuthContext';
import { FirebaseService } from '../services/FirebaseService';
import { ActionScanner } from '../components/ActionScanner';
import { InfoScanner } from '../components/InfoScanner';
import { Colors } from '../constants/theme';

const { width } = Dimensions.get('window');

export const Dashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionScan, setActionScan] = useState(false);
  const [infoScan, setInfoScan] = useState(false);
  const [safar, setSafar] = useState<any>(null);
  const [testRole, setTestRole] = useState(user?.role || 'FOUNDER');

  useEffect(() => {
    if (user?.companyId) {
      const unsub = FirebaseService.listenToOrders(user.companyId, (data) => {
        setOrders(data); setLoading(false);
      });
      return () => unsub();
    }
  }, [user]);

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase() || '';
    if (['DONE', 'COMPLETED', 'READY_COURIER', 'PACK_DONE'].includes(s)) return '#10b981'; // Success (Emerald)
    if (['PENDING', 'AGGREGATOR_ACCEPTED'].includes(s)) return '#f59e0b'; // Attention (Amber)
    if (s.includes('READY') || s.includes('ISSUED')) return '#8b5cf6'; // Transition (Violet)
    if (s.includes('EMB') || s.includes('STITCH') || s.includes('CUTTING')) return '#3b82f6'; // Work in Progress (Blue)
    if (s.includes('PASS') || s.includes('RECEIVED') || s.includes('COLLECTED')) return '#06b6d4'; // Validation/Receipt (Cyan)
    return '#6366f1'; // Default (Indigo)
  };

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
          {['FOUNDER', 'AGGREGATOR', 'STORE', 'MASTAN_HEAD', 'DELUXE_HEAD', 'TAILOR_MASTER', 'MACHINE_EMB', 'HAND_EMB', 'TAILOR_STITCH', 'CHECKER', 'FINISHER', 'PACKER', 'COURIER'].map(r => (
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
            <Text style={styles.statVal}>{orders.length}</Text>
            <Text style={styles.statLab}>Active Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{orders.filter(o => o.items?.[0]?.status === 'DONE').length}</Text>
            <Text style={styles.statLab}>Completed</Text>
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

        <Text style={styles.sectionTitle}>Recent Orders</Text>
        <View>
          {orders.map(o => {
            const status = o.items?.[0]?.status || 'PENDING';
            return (
              <View key={o.id} style={styles.card}>
                <View style={styles.cardContent}>
                  <View style={{flex:1}}>
                    <View style={styles.orderLabelRow}>
                      <Text style={styles.orderId}>#{o.orderId}</Text>
                      <View style={[styles.statusBadge, {backgroundColor: getStatusColor(status) + '20'}]}>
                        <View style={[styles.statusDot, {backgroundColor: getStatusColor(status)}]} />
                        <Text style={[styles.statusText, {color: getStatusColor(status)}]}>{status.replace('_', ' ')}</Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity onPress={() => setSafar(o)} style={styles.safarBtn}>
                      <Text style={styles.safarBtnText}>VIEW JOURNEY MAP →</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.qrContainer}>
                    <QRCode 
                      value={o.orderId} 
                      size={110} 
                      color="#fff"
                      backgroundColor="transparent"
                    />
                    <Text style={styles.qrHint}>Scan to Update</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <ActionScanner visible={actionScan} testRole={testRole} onClose={() => setActionScan(false)} />
      <InfoScanner visible={infoScan} onClose={() => setInfoScan(false)} />

      <Modal visible={!!safar} transparent animationType="slide">
        <View style={styles.modal}>
          <View style={styles.mContent}>
            <View style={styles.mHeader}>
              <Text style={styles.mTitle}>🚂 Safar Map: #{safar?.orderId}</Text>
              <TouchableOpacity onPress={() => setSafar(null)} style={styles.mCloseX}>
                <Text style={{color:'#666', fontSize:24}}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {safar?.items.map((i:any, index:number) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineLine}>
                    <View style={[styles.timelineDot, {backgroundColor: getStatusColor(i.status)}]} />
                    {index < safar.items.length - 1 && <View style={styles.timelineConnector} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineName}>{i.name}</Text>
                    <Text style={[styles.timelineStatus, {color: getStatusColor(i.status)}]}>{i.status}</Text>
                    <Text style={styles.timelineHolder}>Holder: {i.holder || 'Not assigned'}</Text>
                  </View>
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

  sectionTitle: { color:'#fff', fontSize:18, fontWeight:'bold', marginBottom:15 },
  card: { backgroundColor:'#111', borderRadius:30, marginBottom:20, overflow:'hidden', borderWidth:1, borderColor:'#1a1a1a' },
  cardContent: { padding:20, flexDirection:'row', alignItems:'center' },
  orderLabelRow: { marginBottom:12 },
  orderId: { color:'#fff', fontSize:22, fontWeight:'bold', marginBottom:6 },
  statusBadge: { flexDirection:'row', alignItems:'center', alignSelf:'flex-start', paddingHorizontal:10, paddingVertical:4, borderRadius:12 },
  statusDot: { width:6, height:6, borderRadius:3, marginRight:6 },
  statusText: { fontSize:11, fontWeight:'900', letterSpacing:0.5 },
  
  safarBtn: { marginTop:10 },
  safarBtnText: { color:'#3b82f6', fontSize:11, fontWeight:'700', letterSpacing:0.5 },
  
  qrContainer: { padding:10, backgroundColor:'#1a1a1a', borderRadius:20, alignItems:'center', justifyContent:'center' },
  qrHint: { color:'#444', fontSize:9, marginTop:8, fontWeight:'bold' },

  modal: { flex:1, backgroundColor:'rgba(0,0,0,0.85)', justifyContent:'flex-end' },
  mContent: { backgroundColor:'#0a0a0a', height:'80%', padding:25, borderTopLeftRadius:40, borderTopRightRadius:40, borderWidth:1, borderColor:'#1a1a1a' },
  mHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:30 },
  mTitle: { color:'#fff', fontSize:22, fontWeight:'900' },
  mCloseX: { width:40, height:40, justifyContent:'center', alignItems:'center' },

  timelineItem: { flexDirection:'row', marginBottom:25 },
  timelineLine: { width:20, alignItems:'center', marginRight:15 },
  timelineDot: { width:12, height:12, borderRadius:6, zIndex:1 },
  timelineConnector: { width:2, flex:1, backgroundColor:'#1a1a1a', marginVertical:4 },
  timelineContent: { flex:1, backgroundColor:'#111', padding:15, borderRadius:20, borderWidth:1, borderColor:'#1a1a1a' },
  timelineName: { color:'#fff', fontSize:16, fontWeight:'bold', marginBottom:4 },
  timelineStatus: { fontSize:12, fontWeight:'800', marginBottom:4 },
  timelineHolder: { color:'#666', fontSize:11 }
});