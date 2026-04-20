import { STATIONS } from '../constants/Stations';

export const getNextStation = (currentStation: string, itemDetails: any) => {
  const s = currentStation.toUpperCase();
  const emb = (itemDetails.embroideryType || 'NONE').toUpperCase();

  switch (s) {
    // 1. Order -> AGGREGATOR
    case STATIONS.PENDING: return STATIONS.AGGREGATOR_ACCEPTED;
    
    // 2. AGGREGATOR -> STORE
    case STATIONS.AGGREGATOR_ACCEPTED: return STATIONS.FABRIC_ISSUED;
    
    // 3. STORE -> AGGREGATOR
    case STATIONS.FABRIC_ISSUED: return STATIONS.FABRIC_RECEIVED;
    
    // 4. AGGREGATOR -> TAILOR HEAD
    case STATIONS.FABRIC_RECEIVED: return STATIONS.AT_BRANCH_HEAD;
    
    // 5. TAILOR HEAD -> TAILOR MASTER
    case STATIONS.AT_BRANCH_HEAD: return STATIONS.CUTTING_DONE;
    
    // 6. TAILOR MASTER -> EMBROIDERY DEPT
    case STATIONS.CUTTING_DONE:
      if (emb === 'MACHINE' || emb === 'BOTH') return STATIONS.EMB_MACHINE;
      if (emb === 'HAND') return STATIONS.EMB_HAND;
      return STATIONS.READY_STITCH; // Go to Ready Stitch if no embroidery

    case STATIONS.EMB_MACHINE:
      return (emb === 'BOTH') ? STATIONS.EMB_HAND : STATIONS.EMB_DONE;

    case STATIONS.EMB_HAND: return STATIONS.EMB_DONE;

    // 7. EMBROIDERY -> TAILOR STITCH
    case STATIONS.EMB_DONE: return STATIONS.READY_STITCH;

    // 8. TAILOR STITCH START -> FINISH
    case STATIONS.READY_STITCH: return STATIONS.STITCH_DONE;

    // 9. TAILOR STITCH -> CHECKER
    case STATIONS.STITCH_DONE: return STATIONS.QUALITY_PASS;

    // 10. CHECKER -> FINISHER
    case STATIONS.QUALITY_PASS: return STATIONS.FINISH_DONE;

    // 10. FINISHER -> AGGREGATOR
    case STATIONS.FINISH_DONE: return STATIONS.PIECE_COLLECTED;

    // 11. AGGREGATOR -> PACKER
    case STATIONS.PIECE_COLLECTED: return STATIONS.READY_PACK;

    case STATIONS.READY_PACK: return STATIONS.PACK_DONE;

    // 12. PACKER -> AGGREGATOR
    case STATIONS.PACK_DONE: return STATIONS.READY_COURIER;

    // 13. AGGREGATOR -> COURIER
    case STATIONS.READY_COURIER: return STATIONS.COMPLETED;
    
    default: return s;
  }
};