import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Dashboard } from '../screens/Dashboard';
import { CreateOrder } from '../screens/CreateOrder';
import { ROLES } from '../constants/Roles';

const AppContent = () => {
  // loading aur user AuthContext se hi mil rahe hain
  const { user, loading, register, logout } = useAuth();
  
  const [view, setView] = useState('dashboard');
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // 1. Global Loading State (Jab tak Firebase se data na aaye)
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={{color: '#fff', marginTop: 10}}>Maviinci Junction Se Jud Rahe Hain...</Text>
      </View>
    );
  }

  // 2. Register UI
  if (!user) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}>MAVIINCI JUNCTION</Text>
        
        <Text style={styles.label}>Select Your Role:</Text>
        <View style={styles.roleGrid}>
          {Object.keys(ROLES).map(r => (
            <TouchableOpacity 
              key={r} 
              style={[styles.roleBtn, roleInput === r && styles.activeBtn]}
              onPress={() => setRoleInput(r)}
            >
              <Text style={styles.roleText}>{r.replace('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput 
          style={styles.input} 
          placeholder="Aapka Naam" 
          placeholderTextColor="#666"
          value={nameInput} 
          onChangeText={setNameInput} 
        />
        
        {roleInput !== 'FOUNDER' && (
          <TextInput 
            style={styles.input} 
            placeholder="Invite Code (Required)" 
            placeholderTextColor="#666"
            value={joinCode} 
            onChangeText={setJoinCode} 
          />
        )}

        <TouchableOpacity 
          style={styles.mainBtn} 
          onPress={() => {
            if (!nameInput || !roleInput) Alert.alert("Hold up!", "Naam aur Role zaroori hai!");
            else register(nameInput, roleInput, joinCode);
          }}
        >
          <Text style={{fontWeight: '900', color: '#000', fontSize: 16, letterSpacing: 1}}>JOIN SYSTEM</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // 3. Approval Check
  if (user.status === 'pending') {
    return (
      <View style={styles.center}>
        <Text style={{color: '#fff', fontSize: 20, fontWeight: 'bold'}}>Approval Pending ⏳</Text>
        <Text style={styles.infoText}>Aapka account pending hai. Apne inviter se approve karwayein.</Text>
        <TouchableOpacity style={[styles.mainBtn, {marginTop: 30, width: '100%'}]} onPress={logout}>
          <Text style={{fontWeight: 'bold'}}>LOGOUT</Text>
        </TouchableOpacity>
      </View>
    );
  }


  // 4. Main Views Controller
  if (view === 'create_order') {
    return <CreateOrder onComplete={() => setView('dashboard')} />;
  }

  return (
    <View style={{flex: 1, backgroundColor: '#000'}}>
      <Dashboard />
      
      {/* SaaS Floating Button for Founder & Aggregator */}
      {(user.role === 'FOUNDER' || user.role === 'AGGREGATOR') && (
        <TouchableOpacity style={styles.fab} onPress={() => setView('create_order')}>
          <Text style={{fontWeight: 'bold', color: '#000'}}>+ ORDER</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// --- ROOT WRAPPER ---
export default function MaviinciRoot() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 25 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 20 },
  logo: { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 20, letterSpacing: 3 },
  input: { backgroundColor: '#111', color: '#fff', padding: 18, borderRadius: 15, marginBottom: 20, fontSize: 16, borderWidth: 1, borderColor: '#1e1e1e' },
  label: { color: '#888', marginBottom: 15, fontSize: 12, fontWeight: 'bold' },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
  roleBtn: { padding: 12, borderRadius: 10, backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1e1e1e', minWidth: '30%' },
  activeBtn: { backgroundColor: '#3498db', borderColor: '#3498db' },
  roleText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  mainBtn: { backgroundColor: '#fff', padding: 20, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  infoText: { color: '#888', textAlign: 'center', marginTop: 20, lineHeight: 22 },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#fff', paddingHorizontal: 25, paddingVertical: 18, borderRadius: 35, elevation: 10, shadowColor: '#3498db', shadowOpacity: 0.5, shadowRadius: 10 }
});