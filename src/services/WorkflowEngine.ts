/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║                    MAVIINCI ERP — WORKFLOW ENGINE                     ║
 * ║                                                                       ║
 * ║  Ye file poori Rail-Gadi ERP ki jaan hai.                             ║
 * ║  Saari station transitions, permissions aur scan logic yahi se        ║
 * ║  control hota hai.                                                    ║
 * ║                                                                       ║
 * ║  ⚠️  IS FILE KO BINA SAMJHE EDIT MAT KARNA!                          ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * ─── ORDER LIFECYCLE (14 Stations) ─────────────────────────────────────
 *
 *  PHASE 1 — Parent QR (Sabhi items ek saath chalte hain)
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │  1. PENDING              → Order banaya gaya                       │
 *  │  2. AGGREGATOR_ACCEPTED  → Aggregator ne accept kiya               │
 *  │  3. FABRIC_ISSUED        → Store ne kapda nikala                   │
 *  │  4. FABRIC_RECEIVED      → Aggregator ne kapda receive kiya        │
 *  └─────────────────────────────────────────────────────────────────────┘
 *                              ↓ (HEAD scans → items SPLIT into children)
 *
 *  PHASE 2 — Child QRs (Har piece apna alag rasta)
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │  5. AT_BRANCH_HEAD       → Tailor Head ke paas                     │
 *  │  6. CUTTING_DONE         → Master ne cutting ki                    │
 *  │  7. EMB_DONE             → Embroidery ho gayi (agar zaroorat thi)  │
 *  │     ↳ Agar emb nahi hai → seedha STITCH_DONE par skip             │
 *  │  8. STITCH_DONE          → Stitching complete                      │
 *  │  9. QUALITY_PASS         → Checker ne approve kiya                 │
 *  │ 10. BACK_AT_AG           → Finisher ne bheja, wapis Aggregator par │
 *  │ 11. PIECE_COLLECTED      → Aggregator ne collect kiya              │
 *  └─────────────────────────────────────────────────────────────────────┘
 *                              ↓ (Sabhi pieces merge hote hain)
 *
 *  PHASE 3 — Merge & Dispatch (Wapis Parent QR active)
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │ 12. PACKED_PIECE         → Packer ne piece pack kiya               │
 *  │     PACKED_DONE          → Sabhi pieces pack (auto-promote)        │
 *  │ 13. READY_COURIER        → Aggregator ne box ready kiya            │
 *  │ 14. COMPLETED            → Courier dispatch ho gaya                │
 *  └─────────────────────────────────────────────────────────────────────┘
 *
 * ─── EMBROIDERY TYPES ──────────────────────────────────────────────────
 *
 *  'NONE'    → No embroidery, Cutting ke baad seedha Stitching
 *  'MACHINE' → Machine embroidery → MACHINE_EMB role scan karega
 *  'HAND'    → Hand embroidery    → HAND_EMB role scan karega
 *  'BOTH'    → Dono required      → MACHINE_EMB scan karega
 *
 *  Embroidery SINGLE STEP hai:
 *    CUTTING_DONE → [Embroiderer scans] → EMB_DONE → [Stitcher scans]
 *
 * ─── ROLES & BRANCHES ──────────────────────────────────────────────────
 *
 *  Branch-specific roles (Branch-locked, sirf apni branch ke items):
 *    MASTAN_HEAD, MASTAN_MASTER, MASTAN_STITCH, MASTAN_CHECKER, MASTAN_FINISHER
 *    DELUXE_HEAD, DELUXE_MASTER, DELUXE_STITCH, DELUXE_CHECKER, DELUXE_FINISHER
 *
 *  Generic roles (Koi bhi branch ka item scan kar sakte hain):
 *    AGGREGATOR, STORE, MACHINE_EMB, HAND_EMB, PACKER, COURIER
 *
 *  Admin roles:
 *    FOUNDER (sab kuch kar sakta hai)
 */

import { STATIONS } from '../constants/Stations';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📍 STATION ORDER — Graph rendering ke liye (SafarMap mein use hota hai)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const STATION_ORDER = [
  // Phase 1 — Parent QR (Index 0-4)
  STATIONS.PENDING,              // 0
  STATIONS.AGGREGATOR_ACCEPTED,  // 1
  STATIONS.FABRIC_ISSUED,        // 2
  STATIONS.FABRIC_RECEIVED,      // 3
  STATIONS.AT_BRANCH_HEAD,       // 4

  // Phase 2 — Child QRs (Index 5-11)
  STATIONS.CUTTING_DONE,         // 5
  [STATIONS.EMB_MACHINE, STATIONS.EMB_HAND, STATIONS.EMB_DONE], // 6 (emb group)
  STATIONS.STITCH_DONE,          // 7
  STATIONS.QUALITY_PASS,         // 8
  STATIONS.BACK_AT_AG,           // 9
  STATIONS.PIECE_COLLECTED,      // 10
  STATIONS.PACKED_PIECE,         // 11

  // Phase 3 — Merge & Dispatch (Index 12-14)
  STATIONS.PACKED_DONE,          // 12
  STATIONS.READY_COURIER,        // 13
  STATIONS.COMPLETED             // 14
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔢 INDEX LOOKUP — Kisi bhi status ka index nikaalo
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getStationIndex = (status: string): number => {
  return STATION_ORDER.findIndex(s =>
    Array.isArray(s) ? s.includes(status.toUpperCase()) : s === status.toUpperCase()
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 SUMMARY STATUS — Multi-item order ka ek overall status nikaalein
//    Bottleneck approach: jo sabse peeche hai, uska status dikhao
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getSummaryStatus = (items: any[]): string => {
  if (!items || items.length === 0) return STATIONS.PENDING;

  // Agar sabhi complete hain
  if (items.every(i => i.status === STATIONS.COMPLETED)) return STATIONS.COMPLETED;

  // Agar sabhi pack/dispatch stage mein hain
  if (items.every(i => [STATIONS.PACKED_DONE, STATIONS.READY_COURIER, STATIONS.COMPLETED].includes(i.status))) {
    return STATIONS.PACKED_DONE;
  }

  // Warna, sabse peeche wale item ka status dikhao (bottleneck)
  const indices = items.map(i => getStationIndex(i.status));
  const minIdx = Math.min(...indices);
  const bottleneckItem = items.find(i => getStationIndex(i.status) === minIdx);
  return bottleneckItem?.status || STATIONS.PENDING;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⏭️  NEXT STATION — Current status se agla status kya hoga?
//    Ye function scan hone ke baad bulaya jaata hai
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getNextStation = (currentStation: string, itemDetails: any): string => {
  const s = currentStation.toUpperCase();
  const emb = (itemDetails.embroideryType || 'NONE').toUpperCase();

  switch (s) {
    // ── Phase 1: Parent QR Stations ──────────────────────────────────
    case STATIONS.PENDING:              return STATIONS.AGGREGATOR_ACCEPTED;   // 1 → 2
    case STATIONS.AGGREGATOR_ACCEPTED:  return STATIONS.FABRIC_ISSUED;         // 2 → 3
    case STATIONS.FABRIC_ISSUED:        return STATIONS.FABRIC_RECEIVED;       // 3 → 4
    case STATIONS.FABRIC_RECEIVED:      return STATIONS.AT_BRANCH_HEAD;        // 4 → 5

    // ── Phase 2: Child QR Stations ───────────────────────────────────
    case STATIONS.AT_BRANCH_HEAD:       return STATIONS.CUTTING_DONE;          // 5 → 6

    case STATIONS.CUTTING_DONE:                                                // 6 → 7 or 8
      // Agar embroidery hai → EMB_DONE par bhejo (single step)
      // Agar nahi hai → seedha STITCH_DONE par skip
      if (emb === 'MACHINE' || emb === 'HAND' || emb === 'BOTH') return STATIONS.EMB_DONE;
      return STATIONS.STITCH_DONE;

    // Legacy intermediate states — purane atke hue pieces ko aage dhakelein
    case STATIONS.EMB_MACHINE:          return STATIONS.EMB_DONE;
    case STATIONS.EMB_HAND:             return STATIONS.EMB_DONE;

    case STATIONS.EMB_DONE:             return STATIONS.STITCH_DONE;           // 7 → 8
    case STATIONS.STITCH_DONE:          return STATIONS.QUALITY_PASS;          // 8 → 9
    case STATIONS.QUALITY_PASS:         return STATIONS.BACK_AT_AG;            // 9 → 10

    // ── Phase 3: Merge & Dispatch ────────────────────────────────────
    case STATIONS.BACK_AT_AG:           return STATIONS.PIECE_COLLECTED;       // 10 → 11
    case STATIONS.PIECE_COLLECTED:      return STATIONS.PACKED_PIECE;          // 11 → 12 (piece)
    // Note: PACKED_PIECE → PACKED_DONE auto-promote FirebaseService mein hota hai
    case STATIONS.PACKED_DONE:          return STATIONS.READY_COURIER;         // 12 → 13
    case STATIONS.READY_COURIER:        return STATIONS.COMPLETED;             // 13 → 14

    default: return s; // Unknown status → koi change nahi
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⏪ REWORK STATION — Quality fail hone par kahan bhejein?
//    Checker ke paas 2 options hain: Master ko wapis ya Stitcher ko wapis
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getReworkStation = (target: string): string => {
  switch (target.toUpperCase()) {
    case 'CUTTING':   return STATIONS.AT_BRANCH_HEAD;  // Master ke paas wapis
    case 'STITCHING': return STATIONS.CUTTING_DONE;    // Stitcher ke paas wapis
    default:          return STATIONS.CUTTING_DONE;
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔐 PERMISSION CHECK — Kya ye role is status par scan kar sakta hai?
//
//    Returns true agar allowed hai, false agar nahi
//
//    Arguments:
//      item       → Piece ka data (status, embroideryType, etc.)
//      qr         → QR string (parent ya child — underscore se pata chalta hai)
//      allItems   → Order ke sabhi items (HEAD ke partial claim logic ke liye)
//      activeRole → User ka current role (e.g. 'MASTAN_MASTER', 'HAND_EMB')
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const checkPermission = (item: any, qr: string, allItems: any[] = [], activeRole: string): boolean => {
  const s = item.status.toUpperCase();
  const isChild = qr.includes('_');
  const emb = (item.embroideryType || 'NONE').toUpperCase();
  const hasRole = (rolePart: string) => activeRole.includes(rolePart) || activeRole === 'FOUNDER';

  // ── PARENT QR PERMISSIONS ──────────────────────────────────────────
  if (!isChild) {
    if (s === STATIONS.PENDING)              return hasRole('AGGREGATOR');  // Aggregator accepts order
    if (s === STATIONS.AGGREGATOR_ACCEPTED)  return hasRole('STORE');       // Store issues fabric
    if (s === STATIONS.FABRIC_ISSUED)        return hasRole('AGGREGATOR');  // Aggregator receives fabric
    if (s === STATIONS.FABRIC_RECEIVED)      return hasRole('HEAD');        // Head claims items

    // HEAD can scan parent even if SOME items are already claimed (partial claim)
    if (hasRole('HEAD') && allItems.some(i => i.status === STATIONS.FABRIC_RECEIVED)) return true;

    if (s === STATIONS.PACKED_DONE)          return hasRole('AGGREGATOR');  // Aggregator readies box
    if (s === STATIONS.READY_COURIER)        return hasRole('COURIER');     // Courier dispatches

    return false;
  }

  // ── CHILD QR PERMISSIONS ───────────────────────────────────────────
  if (isChild) {
    // Station 5: Master does cutting
    if (s === STATIONS.AT_BRANCH_HEAD)       return hasRole('MASTER');

    // Station 6: After cutting → embroidery (if needed) or stitching
    if (s === STATIONS.CUTTING_DONE) {
      if (emb === 'MACHINE' || emb === 'BOTH') return hasRole('MACHINE');  // Machine emb picks up
      if (emb === 'HAND')                       return hasRole('HAND');     // Hand emb picks up
      return hasRole('STITCH');                                             // No emb → stitcher picks up
    }

    // Legacy intermediate emb states — allow them to be pushed forward
    if (s === STATIONS.EMB_MACHINE)          return hasRole('MACHINE') || hasRole('HAND');
    if (s === STATIONS.EMB_HAND)             return hasRole('HAND');

    // Station 7: After embroidery → stitcher picks up
    if (s === STATIONS.EMB_DONE)             return hasRole('STITCH') || hasRole('MASTER');

    // Station 8: Stitching done → checker inspects
    if (s === STATIONS.STITCH_DONE)          return hasRole('CHECKER');

    // Station 9: Quality pass → finisher processes
    if (s === STATIONS.QUALITY_PASS)         return hasRole('FINISHER');

    // Station 10: Back at aggregator
    if (s === STATIONS.BACK_AT_AG)           return hasRole('AGGREGATOR');

    // Station 11-12: Packing
    if (s === STATIONS.PIECE_COLLECTED)      return hasRole('PACKER');
    if (s === STATIONS.PACKED_PIECE)         return hasRole('PACKER');
  }

  return false;
};