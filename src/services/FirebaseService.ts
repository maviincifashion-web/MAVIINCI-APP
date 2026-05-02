/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║                MAVIINCI ERP — FIREBASE SERVICE                       ║
 * ║                                                                       ║
 * ║  Database operations: scan actions, order CRUD, real-time listeners  ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

import { doc, getDoc, updateDoc, collection, query, onSnapshot, orderBy, where, setDoc } from 'firebase/firestore';
import { db } from '../constants/FirebaseConfig';
import { getNextStation } from './WorkflowEngine';
import { STATIONS } from '../constants/Stations';
import { GoogleSheetsService } from './GoogleSheetsService';

export const FirebaseService = {

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⚡ PERFORM ACTION SCAN — QR scan hone par Firestore update karo
  //
  //   qrData            → Scanned QR value (parent "123" or child "123_COAT")
  //   userRole          → Active role (e.g. "MASTAN_MASTER")
  //   userId            → Firebase UID
  //   branch            → User's branch prefix (e.g. "MASTAN")
  //   overrideNextStatus→ Rework ke liye: manually set next status
  //   selectedChildIds  → Partial claim: sirf selected items ka status badlo
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  performActionScan: async (
    qrData: string,
    userRole: string,
    userId: string,
    branch: string,
    overrideNextStatus?: string,
    selectedChildIds?: string[]
  ) => {
    const pId = qrData.includes('_') ? qrData.split('_')[0] : qrData;
    const orderRef = doc(db, "erp_orders", pId);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) throw new Error("Order not found");

    const orderData = snap.data();
    let items = [...orderData.items];
    const isChild = qrData.includes('_');
    let finalStatus = '';

    if (!isChild) {
      // ── PARENT QR LOGIC ────────────────────────────────────────────
      if (selectedChildIds && selectedChildIds.length > 0) {
        // PARTIAL CLAIM: Sirf selected items ka status badlo (HEAD ka use-case)
        items = items.map(i => {
          if (selectedChildIds.includes(i.childId)) {
            const nextS = overrideNextStatus || getNextStation(i.status, i);
            finalStatus = nextS.toUpperCase();
            return { ...i, status: finalStatus, holder: userId.toUpperCase(), branchOwner: branch };
          }
          return i;
        });
      } else {
        // FULL UNIT: Sabhi items ka status ek saath badlo
        const nextS = overrideNextStatus || getNextStation(items[0].status, items[0]);
        finalStatus = nextS.toUpperCase();
        items = items.map(i => ({ ...i, status: finalStatus, holder: userId.toUpperCase() }));
      }
    } else {
      // ── CHILD QR (PIECE) LOGIC ─────────────────────────────────────
      const idx = items.findIndex(i => i.childId === qrData);
      if (idx === -1) throw new Error("Piece not found in order");

      const nextS = overrideNextStatus || getNextStation(items[idx].status, items[idx]);
      finalStatus = nextS.toUpperCase();

      items[idx] = {
        ...items[idx],
        status: finalStatus,
        holder: userId.toUpperCase(),
        // Branch ownership sirf HEAD claim karte waqt set hota hai
        branchOwner: (items[idx].status === STATIONS.FABRIC_RECEIVED && userRole.includes('HEAD'))
          ? branch
          : items[idx].branchOwner
      };

      // 🔥 PACKER AUTO-MERGE: Agar sabhi pieces pack ho gaye → PACKED_DONE
      if (finalStatus === STATIONS.PACKED_PIECE) {
        const allPacked = items.every(i => i.status === STATIONS.PACKED_PIECE);
        if (allPacked) {
          finalStatus = STATIONS.PACKED_DONE;
          items = items.map(i => ({ ...i, status: STATIONS.PACKED_DONE, holder: 'PACKING_DEPT' }));
        }
      }
    }

    // Firestore update
    await updateDoc(orderRef, { items });

    // Google Sheets log
    await GoogleSheetsService.logAction(pId, isChild ? qrData : 'UNIT', finalStatus, userId, userRole);

    return { success: true, nextStatus: finalStatus };
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔍 GET INFO BY QR — QR scan karke item/order ka data laao
  //    Parent QR → poora order + isParent flag
  //    Child QR  → specific item ka data
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  getInfoByQR: async (qrData: string) => {
    const pId = qrData.includes('_') ? qrData.split('_')[0] : qrData;
    const snap = await getDoc(doc(db, "erp_orders", pId));
    if (!snap.exists()) return null;
    const data = snap.data();

    if (qrData.includes('_')) {
      // Child QR → specific piece return karo
      return data.items.find((i: any) => i.childId === qrData);
    } else {
      // Parent QR → full order with isParent flag
      return { ...data, isParent: true, status: data.items[0].status };
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 👂 LISTEN TO ORDERS — Real-time Firestore listener (Dashboard ke liye)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  listenToOrders: (companyId: string, callback: (orders: any[]) => void) => {
    if (!companyId) return () => {};
    const q = query(collection(db, "erp_orders"), where("companyId", "==", companyId));
    return onSnapshot(q, (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ➕ CREATE ORDER — Naya order banao
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  createOrder: async (orderId: string, items: any, createdBy: string, companyId: string) => {
    await setDoc(doc(db, "erp_orders", orderId), {
      orderId,
      createdBy,
      companyId,
      createdAt: new Date().toISOString(),
      items
    });
    return { success: true };
  }
};