import { STATIONS } from '../constants/Stations';

export const getNextStation = (currentStation: string, itemDetails: any) => {
  const s = currentStation.toUpperCase();
  const emb = (itemDetails.embroideryType || 'NONE').toUpperCase();

  switch (s) {
    // Phase 1: Parent QR
    case STATIONS.PENDING: return STATIONS.AGGREGATOR_ACCEPTED;         // Station 1 -> 2
    case STATIONS.AGGREGATOR_ACCEPTED: return STATIONS.FABRIC_ISSUED;   // Station 2 -> 3
    case STATIONS.FABRIC_ISSUED: return STATIONS.FABRIC_RECEIVED;       // Station 3 -> 4
    case STATIONS.FABRIC_RECEIVED: return STATIONS.AT_BRANCH_HEAD;      // Station 4 -> 5
    
    // Phase 2: Split to Child QRs
    case STATIONS.AT_BRANCH_HEAD: return STATIONS.CUTTING_DONE;         // Station 5 -> 6
    
    case STATIONS.CUTTING_DONE:                                         // Station 6 -> 7 (or 8)
      if (emb === 'MACHINE' || emb === 'BOTH') return STATIONS.EMB_MACHINE;
      if (emb === 'HAND') return STATIONS.EMB_HAND;
      return STATIONS.STITCH_DONE;

    case STATIONS.EMB_MACHINE:
      return (emb === 'BOTH') ? STATIONS.EMB_HAND : STATIONS.EMB_DONE;

    case STATIONS.EMB_HAND: return STATIONS.EMB_DONE;
    case STATIONS.EMB_DONE: return STATIONS.STITCH_DONE;                // Station 7 -> 8

    case STATIONS.STITCH_DONE: return STATIONS.QUALITY_PASS;            // Station 8 -> 9
    case STATIONS.QUALITY_PASS: return STATIONS.BACK_AT_AG;             // Station 9 -> 10
    
    // Phase 3: The Merge
    case STATIONS.BACK_AT_AG: return STATIONS.PIECE_COLLECTED;          // Station 10 -> 11
    case STATIONS.PIECE_COLLECTED: return STATIONS.PACKED_PIECE;        // Station 11 -> 12 (Piece)
    
    // Station 12 (PACKED_DONE) is handled in FirebaseService via auto-promote
    case STATIONS.PACKED_DONE: return STATIONS.READY_COURIER;           // Station 12 -> 13
    case STATIONS.READY_COURIER: return STATIONS.COMPLETED;             // Station 13 -> 14
    
    default: return s;
  }
};

// Rework logic
export const getReworkStation = (target: string) => {
  switch(target.toUpperCase()) {
    case 'CUTTING': return STATIONS.AT_BRANCH_HEAD; // Fail to Master
    case 'STITCHING': return STATIONS.CUTTING_DONE; // Fail to Stitcher (goes back to post-cutting state so stitcher can re-scan)
    default: return STATIONS.CUTTING_DONE;
  }
};