import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../constants/FirebaseConfig';
import { Alert } from 'react-native';

const AuthContext = createContext<any>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);

  useEffect(() => {
    checkLocalSession();
  }, []);

  const checkLocalSession = async () => {
    try {
      const savedId = await AsyncStorage.getItem('erp_user_id');
      if (savedId) {
        startUserListener(savedId);
      } else {
        // 🔥 AUTO-LOGIN FOR TESTING
        setUser({
          id: "TEST_ID_123",
          uid: "TEST_ID_123",
          name: "MAVI TESTER",
          role: "FOUNDER",
          companyId: "MAVI_TEST",
          status: "active"
        });
        setLoading(false);
      }
    } catch (e) {
      setLoading(false);
    }
  };

  const startUserListener = (userId: string) => {
    return onSnapshot(doc(db, "erp_users", userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // 🔥 ID aur CompanyId ko force load karna
        setUser({ 
          ...data, 
          id: docSnap.id, 
          uid: docSnap.id,
          companyId: data.companyId || "MAVI_TEMP" // Fallback taaki crash na ho
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  };

  const register = async (name: string, role: string, joinCode: string | null) => {
    setLoading(true);
    try {
      const newId = "id_" + Math.random().toString(36).substr(2, 9);
      const isF = role === 'FOUNDER';
      
      // Founder ke liye nayi ID, Worker ke liye Join Code
      let cId = "";
      if (isF) {
        cId = "MAVI_" + Math.random().toString(36).substr(2, 4).toUpperCase();
      } else {
        if (!joinCode) throw new Error("Join Code (Invite Code) zaroori hai!");
        cId = joinCode.toUpperCase().trim();
      }

      const status = isF ? 'active' : 'pending';

      const userData = { 
        id: newId, 
        uid: newId, 
        name: name.trim(), 
        role, 
        status, 
        companyId: cId, 
        createdAt: new Date().toISOString() 
      };

      await setDoc(doc(db, "erp_users", newId), userData);
      await AsyncStorage.setItem('erp_user_id', newId);
      // Dashboard listener apne aap trigger ho jayega
    } catch (error: any) {
      Alert.alert("Registration Error", error.message);
    }
    setLoading(false);
  };

  const logout = async () => {
    await AsyncStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, logout, pendingUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);