import { doc, setDoc } from 'firebase/firestore';
import { db } from '../constants/FirebaseConfig';

export const GoogleSheetsService = {
  logAction: async (
    orderId: string, 
    piece: string, 
    station: string, 
    userId: string, 
    userRole: string,
    rate: number = 0
  ) => {
    try {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const logData = {
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        orderId,
        piece,
        station,
        userId,
        userRole,
        rate,
        timestamp: Date.now(),
        syncedToSheets: false // A cloud function can listen to this collection and update real Google Sheets
      };

      // Writing to a 'sheet_logs' collection which acts as a queue for a Cloud Function
      await setDoc(doc(db, "sheet_logs", logId), logData);
      console.log("Logged action for Sheets sync:", logData);
    } catch (e) {
      console.error("Failed to log for Sheets:", e);
    }
  }
};
