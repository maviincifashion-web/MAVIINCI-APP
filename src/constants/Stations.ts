export const STATIONS = {
  // Phase 1 (Parent QR)
  PENDING: 'PENDING',                     // Station 1
  AGGREGATOR_ACCEPTED: 'AGGREGATOR_ACCEPTED', // Station 2
  FABRIC_ISSUED: 'FABRIC_ISSUED',         // Station 3
  FABRIC_RECEIVED: 'FABRIC_RECEIVED',     // Station 4
  
  // Phase 2 (Child QRs)
  AT_BRANCH_HEAD: 'AT_BRANCH_HEAD',       // Station 5
  CUTTING_DONE: 'CUTTING_DONE',           // Station 6
  EMB_MACHINE: 'EMB_MACHINE',             // Station 7 (Sub-step)
  EMB_HAND: 'EMB_HAND',                   // Station 7 (Sub-step)
  EMB_DONE: 'EMB_DONE',                   // Station 7
  STITCH_DONE: 'STITCH_DONE',             // Station 8
  QUALITY_PASS: 'QUALITY_PASS',           // Station 9
  BACK_AT_AG: 'BACK_AT_AG',               // Station 10 (Finisher finishes)
  PIECE_COLLECTED: 'PIECE_COLLECTED',     // Station 11 (AG collects)
  
  // Phase 3 (Merge)
  PACKED_PIECE: 'PACKED_PIECE',           // Station 12 (Sub-step: Packer scans)
  PACKED_DONE: 'PACKED_DONE',             // Station 12 (All packed -> Parent QR active)
  READY_COURIER: 'READY_COURIER',         // Station 13 (AG Box pickup)
  COMPLETED: 'COMPLETED'                  // Station 14 (Courier Dispatch)
};