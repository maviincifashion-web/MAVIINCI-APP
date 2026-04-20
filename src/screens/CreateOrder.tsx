import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { FirebaseService } from '../services/FirebaseService';

const ITEMS_MASTER = ["Coat", "Pant", "Sadri", "Kurta", "Pajama", "Shirt", "Jubba", "Vest Coat"];

export const CreateOrder = ({ onComplete }: { onComplete: () => void }) => {
  const { user } = useAuth();
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any>({});

  const handleToggle = (item: string) => {
    let t = { ...selectedItems };
    if (t[item]) delete t[item]; else t[item] = 'NONE';
    setSelectedItems(t);
  };

  const handleSave = async () => {
    // 🛡️ Company ID Check
    if (!user || !user.companyId) {
      Alert.alert("Error", "Aapki Company ID nahi mili. Ek baar Logout karke naye naam se login karein.");
      return;
    }

    if (!orderId.trim() || Object.keys(selectedItems).length === 0) {
      Alert.alert("Error", "Bhai, ID aur Items bhariye!");
      return;
    }

    setLoading(true);
    try {
      const items = Object.keys(selectedItems).map(name => ({
        childId: `${orderId}_${name.toUpperCase()}`,
        name, 
        status: 'PENDING', 
        holder: 'INVENTORY',
        embroideryType: selectedItems[name],
        measurement: { length: "42", chest: "40" }
      }));

      // Firebase Service call
      await FirebaseService.createOrder(orderId, items, user.id, user.companyId);
      
      Alert.alert("Mubarak Ho! ✅", "Order line mein lag gaya.");
      onComplete();
    } catch (e: any) {
      Alert.alert("Firebase Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nayi Rail Gadi 🚂</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Order ID likhein" 
        placeholderTextColor="#444" 
        value={orderId} 
        onChangeText={setOrderId} 
        keyboardType="numeric" 
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {ITEMS_MASTER.map(item => (
          <View key={item} style={styles.row}>
            <TouchableOpacity onPress={() => handleToggle(item)} style={{ flex: 1 }}>
              <Text style={{ color: selectedItems[item] ? '#fff' : '#444', fontSize: 18, fontWeight: 'bold' }}>{item}</Text>
            </TouchableOpacity>
            {selectedItems[item] && (
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {['MACHINE', 'HAND', 'BOTH'].map(t => (
                  <TouchableOpacity key={t} onPress={() => setSelectedItems({ ...selectedItems, [item]: t })}>
                    <View style={[styles.badge, selectedItems[item] === t && { backgroundColor: '#e67e22' }]}>
                      <Text style={{ color: '#fff', fontSize: 8 }}>{t}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>CREATE LINE 🚀</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={onComplete} style={{ marginTop: 20 }}>
        <Text style={{ color: '#555', textAlign: 'center' }}>CANCEL</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 25, paddingTop: 50 },
  title: { fontSize: 28, color: '#fff', fontWeight: 'bold', marginBottom: 20 },
  input: { backgroundColor: '#111', color: '#fff', padding: 18, borderRadius: 15, marginBottom: 20, fontSize: 18, borderWidth: 1, borderColor: '#1e1e1e' },
  row: { flexDirection: 'row', padding: 15, backgroundColor: '#0a0a0a', marginBottom: 10, borderRadius: 15, alignItems: 'center' },
  badge: { padding: 8, borderRadius: 5, backgroundColor: '#222' },
  saveBtn: { backgroundColor: '#2ecc71', padding: 20, borderRadius: 15, alignItems: 'center', marginTop: 10 }
});