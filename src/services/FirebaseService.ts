import { doc, getDoc, updateDoc, collection, query, onSnapshot, orderBy, where, setDoc } from 'firebase/firestore';
import { db } from '../constants/FirebaseConfig';
import { getNextStation } from './WorkflowEngine';
import { STATIONS } from '../constants/Stations';

export const FirebaseService = {
  performActionScan: async (qrData: string, userRole: string, userId: string, branch: string) => {
    const pId = qrData.includes('_') ? qrData.split('_')[0] : qrData;
    const orderRef = doc(db, "erp_orders", pId);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) throw new Error("Order not found");

    const orderData = snap.data();
    let items = [...orderData.items];
    const isChild = qrData.includes('_');

    if (!isChild) {
      // UNIT LOGIC
      const nextS = getNextStation(items[0].status, items[0]);
      items = items.map(i => ({ ...i, status: nextS.toUpperCase(), holder: userId.toUpperCase() }));
    } else {
      // PIECE LOGIC
      const idx = items.findIndex(i => i.childId === qrData);
      const nextS = getNextStation(items[idx].status, items[idx]);
      items[idx] = { 
        ...items[idx], 
        status: nextS.toUpperCase(), 
        holder: userId.toUpperCase(),
        branchOwner: (items[idx].status === STATIONS.FABRIC_RECEIVED && userRole.includes('HEAD')) ? branch : items[idx].branchOwner
      };

      // 🔥 PACKER AUTO-SWITCH: If all child items are packed, move order to READY_COURIER
      if (nextS === STATIONS.PACK_DONE) {
         const allPacked = items.every(i => i.status === STATIONS.PACK_DONE);
         if (allPacked) {
            items = items.map(i => ({ ...i, status: STATIONS.READY_COURIER, holder: 'PACKING_DEPT' }));
         }
      }
    }

    await updateDoc(orderRef, { items });
    return { success: true, nextStatus: items[0].status };
  },

  getInfoByQR: async (qrData: string) => {
    const pId = qrData.includes('_') ? qrData.split('_')[0] : qrData;
    const snap = await getDoc(doc(db, "erp_orders", pId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return qrData.includes('_') ? data.items.find((i: any) => i.childId === qrData) : { ...data, isParent: true, status: data.items[0].status };
  },

  listenToOrders: (companyId: string, callback: (orders: any[]) => void) => {
    if (!companyId) return () => {};
    const q = query(collection(db, "erp_orders"), where("companyId", "==", companyId));
    return onSnapshot(q, (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  },

  createOrder: async (orderId: string, items: any, createdBy: string, companyId: string) => {
    await setDoc(doc(db, "erp_orders", orderId), { orderId, createdBy, companyId, createdAt: new Date().toISOString(), items });
    return { success: true };
  }
};