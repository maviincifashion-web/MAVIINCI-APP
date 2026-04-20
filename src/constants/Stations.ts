export const STATIONS = {
  PENDING: 'PENDING',
  AGGREGATOR_ACCEPTED: 'AGGREGATOR_ACCEPTED',
  FABRIC_ISSUED: 'FABRIC_ISSUED',
  FABRIC_RECEIVED: 'FABRIC_RECEIVED', // AG confirms fabric
  AT_BRANCH_HEAD: 'AT_BRANCH_HEAD',     // Branch Head picks pieces
  CUTTING_DONE: 'CUTTING_DONE',
  EMB_MACHINE: 'EMB_MACHINE',
  EMB_HAND: 'EMB_HAND',
  EMB_DONE: 'EMB_DONE',
  READY_STITCH: 'READY_STITCH',
  STITCH_DONE: 'STITCH_DONE',
  QUALITY_PASS: 'QUALITY_PASS',
  FINISH_DONE: 'FINISH_DONE',         // Finisher completes ironing/finishing
  PIECE_COLLECTED: 'PIECE_COLLECTED', // AG receives piece from Finisher
  READY_PACK: 'READY_PACK',           // AG sends bundle to Packer
  PACK_DONE: 'PACK_DONE',             // Packer finishes box
  READY_COURIER: 'READY_COURIER',     // AG receives box for Courier
  COMPLETED: 'COMPLETED'
};