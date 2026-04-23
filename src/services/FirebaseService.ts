import { doc, getDoc, updateDoc, collection, query, onSnapshot, orderBy, where, setDoc } from 'firebase/firestore';
import { db } from '../constants/FirebaseConfig';
import { getNextStation } from './WorkflowEngine';
import { STATIONS } from '../constants/Stations';
import { GoogleSheetsService } from './GoogleSheetsService';

export const FirebaseService = {
  performActionScan: async (qrData: string, userRole: string, userId: string, branch: string, overrideNextStatus?: string, selectedChildIds?: string[]) => {
    const pId = qrData.includes('_') ? qrData.split('_')[0] : qrData;
    const orderRef = doc(db, "erp_orders", pId);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) throw new Error("Order not found");

    const orderData = snap.data();
    let items = [...orderData.items];
    const isChild = qrData.includes('_');
    let finalStatus = '';

    if (!isChild) {
      // UNIT LOGIC (Or Partial Unit Logic if selectedChildIds is passed)
      if (selectedChildIds && selectedChildIds.length > 0) {
        items = items.map(i => {
          if (selectedChildIds.includes(i.childId)) {
            const nextS = overrideNextStatus || getNextStation(i.status, i);
            finalStatus = nextS.toUpperCase();
            return { ...i, status: finalStatus, holder: userId.toUpperCase(), branchOwner: branch };
          }
          return i;
        });
      } else {
        const nextS = overrideNextStatus || getNextStation(items[0].status, items[0]);
        finalStatus = nextS.toUpperCase();
        items = items.map(i => ({ ...i, status: finalStatus, holder: userId.toUpperCase() }));
      }
    } else {
      // PIECE LOGIC
      const idx = items.findIndex(i => i.childId === qrData);
      const nextS = overrideNextStatus || getNextStation(items[idx].status, items[idx]);
      finalStatus = nextS.toUpperCase();
      
      items[idx] = { 
        ...items[idx], 
        status: finalStatus, 
        holder: userId.toUpperCase(),
        branchOwner: (items[idx].status === STATIONS.FABRIC_RECEIVED && userRole.includes('HEAD')) ? branch : items[idx].branchOwner
      };

      // 🔥 PACKER AUTO-SWITCH: If all child items are packed, promote the whole order to PACKED_DONE
      if (finalStatus === STATIONS.PACKED_PIECE) {
         const allPacked = items.every(i => i.status === STATIONS.PACKED_PIECE);
         if (allPacked) {
            finalStatus = STATIONS.PACKED_DONE;
            items = items.map(i => ({ ...i, status: STATIONS.PACKED_DONE, holder: 'PACKING_DEPT' }));
         }
      }
    }

    await updateDoc(orderRef, { items });
    
    // Log to Google Sheets
    await GoogleSheetsService.logAction(pId, isChild ? qrData : 'UNIT', finalStatus, userId, userRole);
    
    return { success: true, nextStatus: finalStatus };
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