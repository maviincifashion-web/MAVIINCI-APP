import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Animated } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

import { STATION_ORDER, getStationIndex } from '../services/WorkflowEngine';

const PHASE1_LABELS = ['ORDER CREATED', 'AGGREGATOR ASSIGNED', 'FABRIC REQUESTED', 'FABRIC RECEIVED', 'TAILOR HEAD ASSIGNED'];
const PHASE2_LABELS = ['CUTTING', 'EMBROIDERY', 'STITCHING', 'QUALITY CHECK', 'FINISHING', 'RECEIVED'];
const PHASE3_LABELS = ['PACKING DONE', 'DISPATCHED'];

const PHASE1_ICONS = ['📋', '🤝', '🧵', '📦', '✂️'];
const PHASE3_ICONS = ['📦', '🚚'];

// ─── DESIGN TOKENS ─────────────────────────────────────────────
const NODE_SIZE = 30;
const LINE_HEIGHT = 50;
const LABEL_COL_WIDTH = 75; // reserved width for side labels

const PALETTE = {
  active:   { from: '#10b981', to: '#34d399', text: '#d1fae5' },
  current:  { from: '#3b82f6', to: '#818cf8', text: '#dbeafe' },
  inactive: { from: '#27272a', to: '#18181b', text: '#52525b' },
  bg:       '#020617',
  card:     'rgba(255,255,255,0.04)',
  border:   'rgba(255,255,255,0.06)',
  dimText:  '#64748b',
  label:    '#94a3b8',
};

const getNodeState = (nodeIdx: number, currentIdx: number): 'inactive' | 'active' | 'current' => {
  if (currentIdx === nodeIdx) return 'current';
  if (currentIdx > nodeIdx) return 'active';
  return 'inactive';
};

const getGradient = (state: string) => {
  if (state === 'current') return [PALETTE.current.from, PALETTE.current.to];
  if (state === 'active') return [PALETTE.active.from, PALETTE.active.to];
  return [PALETTE.inactive.from, PALETTE.inactive.to];
};

// ─── PHASE 1 & 3 TRUNK NODE ───────────────────────────────────
const TrunkNode = ({ state, label, icon, isLast = false }: {
  state: 'inactive' | 'active' | 'current'; label: string; icon: string; isLast?: boolean;
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state === 'current') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [state]);

  const colors = getGradient(state);
  const isCurrent = state === 'current';
  const isActive = state === 'active';

  return (
    <View style={styles.trunkNodeRow}>
      {/* Node */}
      <View style={styles.trunkNodeLeft}>
        <Animated.View style={[
          styles.trunkNodeCircleOuter,
          { transform: [{ scale: pulseAnim }] },
          isCurrent && { shadowColor: PALETTE.current.from, shadowOpacity: 0.6, shadowRadius: 14, elevation: 12 },
          isActive && { shadowColor: PALETTE.active.from, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
        ]}>
          <LinearGradient colors={colors} style={styles.trunkNodeCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={{ fontSize: 14 }}>{icon}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Vertical connector */}
        {!isLast && (
          <LinearGradient
            colors={isActive ? [PALETTE.active.from, PALETTE.active.to] : [PALETTE.inactive.from, PALETTE.inactive.to]}
            style={styles.trunkConnector}
          />
        )}
      </View>

      {/* Label */}
      <View style={styles.trunkLabelContainer}>
        <Text style={[
          styles.trunkLabel,
          isCurrent && { color: '#fff', fontWeight: '800' },
          isActive && { color: PALETTE.active.text },
          state === 'inactive' && { color: PALETTE.dimText },
        ]}>
          {label}
        </Text>
        {isCurrent && (
          <Animated.View style={[styles.currentBadge, { opacity: glowAnim }]}>
            <Text style={styles.currentBadgeText}>● CURRENT</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

// ─── PHASE 2 SMALL DOT NODE ───────────────────────────────────
const DotNode = ({ state, isLast = false, dotSize = 18, lineH = 36, skip = false }: {
  state: 'inactive' | 'active' | 'current'; isLast?: boolean; dotSize?: number; lineH?: number; skip?: boolean;
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'current' && !skip) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state, skip]);

  const colors = getGradient(state);

  return (
    <View style={{ alignItems: 'center', height: lineH + dotSize }}>
      {skip ? (
        <View style={{ width: 2, height: dotSize, backgroundColor: state === 'active' ? PALETTE.active.from : PALETTE.inactive.from }} />
      ) : (
        <Animated.View style={[
          { transform: [{ scale: pulseAnim }], zIndex: 2 },
          state === 'current' && { shadowColor: PALETTE.current.from, shadowOpacity: 0.7, shadowRadius: 10, elevation: 8 },
        ]}>
          <LinearGradient colors={colors} style={{ width: dotSize, height: dotSize, borderRadius: dotSize / 2 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        </Animated.View>
      )}
      {!isLast && (
        <View style={{ width: 2, height: lineH, borderRadius: 1, marginTop: skip ? 0 : -1, backgroundColor: state === 'active' ? PALETTE.active.from : PALETTE.inactive.from }} />
      )}
    </View>
  );
};

// ─── PIECE ICON HELPER ─────────────────────────────────────────
const getIconForPiece = (name: string) => {
  const n = (name || '').toLowerCase();
  if (n.includes('shirt') || n.includes('kurta')) return '👔';
  if (n.includes('pant') || n.includes('trouser') || n.includes('pajama')) return '👖';
  if (n.includes('dress') || n.includes('frock')) return '👗';
  if (n.includes('dupatta') || n.includes('scarf')) return '🧣';
  if (n.includes('coat') || n.includes('jacket') || n.includes('blazer')) return '🧥';
  if (n.includes('cap') || n.includes('topi')) return '🧢';
  return '👕';
};

// ─── MAIN COMPONENT ────────────────────────────────────────────
export const SafarMapGraph = ({ order }: { order: any }) => {
  if (!order || !order.items) return null;

  const items = order.items;
  const numItems = items.length;

  const maxIdx = Math.max(...items.map((i: any) => getStationIndex(i.status)));
  const minIdx = Math.min(...items.map((i: any) => getStationIndex(i.status)));

  const hasAnyEmbroidery = items.some((item: any) => item.embroideryType && item.embroideryType !== 'NONE');

  // Calculate overall progress percentage
  const totalSteps = 14;
  const completedSteps = Math.max(0, minIdx + 1);
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  // ─── DYNAMIC SIZING ──────────────────────────────────────
  const availableWidth = width - 32 - 20 - LABEL_COL_WIDTH; // padding + phase2 padding + labels
  const colWidth = Math.max(40, Math.floor(availableWidth / numItems));
  const dotSize = Math.max(12, Math.min(22, colWidth * 0.3));
  const lineH = Math.max(28, Math.min(42, colWidth * 0.5));
  const iconFontSize = Math.max(14, Math.min(22, colWidth * 0.35));
  const nameFontSize = Math.max(7, Math.min(9, colWidth * 0.12));

  // ─── PHASE 1 ─────────────────────────────────────────────
  const renderPhase1 = () => (
    <View style={styles.phaseCard}>
      <View style={styles.phaseHeader}>
        <Text style={styles.phaseTitle}>ORDER PROCESSING</Text>
        <View style={[styles.phaseBadge, maxIdx >= 4 && styles.phaseBadgeDone]}>
          <Text style={styles.phaseBadgeText}>{maxIdx >= 4 ? '✓ DONE' : 'IN PROGRESS'}</Text>
        </View>
      </View>
      {PHASE1_LABELS.map((label, i) => (
        <TrunkNode key={i} state={getNodeState(i, maxIdx)} label={label} icon={PHASE1_ICONS[i]} isLast={i === 4} />
      ))}
    </View>
  );

  // ─── SVG SPLIT CURVES ────────────────────────────────────
  const renderSplit = () => {
    const svgHeight = 70;
    const svgWidth = numItems * colWidth;
    const centerStartX = svgWidth / 2;

    return (
      <View style={styles.svgContainer}>
        <Svg height={svgHeight} width={svgWidth}>
          <Defs>
            <SvgGradient id="splitActive" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={PALETTE.active.from} stopOpacity="1" />
              <Stop offset="1" stopColor={PALETTE.active.to} stopOpacity="0.6" />
            </SvgGradient>
            <SvgGradient id="splitInactive" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#333" stopOpacity="0.4" />
              <Stop offset="1" stopColor="#1a1a1a" stopOpacity="0.2" />
            </SvgGradient>
          </Defs>
          {items.map((_item: any, i: number) => {
            const itemIdx = getStationIndex(_item.status);
            const lineActive = itemIdx >= 5;
            const endX = (svgWidth / 2) - ((numItems - 1) * colWidth / 2) + (i * colWidth);
            const cp1X = centerStartX;
            const cp1Y = svgHeight * 0.55;
            const cp2X = endX;
            const cp2Y = svgHeight * 0.45;

            return (
              <Path
                key={i}
                d={`M ${centerStartX} 0 C ${cp1X} ${cp1Y} ${cp2X} ${cp2Y} ${endX} ${svgHeight}`}
                stroke={lineActive ? 'url(#splitActive)' : 'url(#splitInactive)'}
                strokeWidth={lineActive ? "3" : "2"}
                fill="none"
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
      </View>
    );
  };

  // ─── PHASE 2: PARALLEL COLUMNS ───────────────────────────
  const renderParallelPaths = () => (
    <View style={styles.parallelContainer}>
      {items.map((item: any, i: number) => {
        const idx = getStationIndex(item.status);
        const hasStarted = idx >= 4;
        const pieceProgress = Math.max(0, Math.min(idx - 4, 6));

        return (
          <View key={i} style={[styles.column, { width: colWidth }]}>
            {/* Piece Header Card */}
            <View style={[styles.pieceCard, hasStarted && styles.pieceCardActive, { width: colWidth - 6 }]}>
              <Text style={{ fontSize: iconFontSize }}>{getIconForPiece(item.name)}</Text>
              <Text style={[styles.pieceName, hasStarted && { color: '#fff' }, { fontSize: nameFontSize }]} numberOfLines={1}>
                {item.name || `P${i + 1}`}
              </Text>
              {hasStarted && (
                <View style={styles.pieceProgressBar}>
                  <LinearGradient
                    colors={[PALETTE.active.from, PALETTE.active.to]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.pieceProgressFill, { width: `${(pieceProgress / 6) * 100}%` as any }]}
                  />
                </View>
              )}
            </View>

            {/* Dots */}
            <DotNode state={getNodeState(5, idx)} dotSize={dotSize} lineH={lineH} />
            {hasAnyEmbroidery && (
              <DotNode 
                state={getNodeState(6, idx)} 
                dotSize={dotSize} 
                lineH={lineH} 
                skip={!item.embroideryType || item.embroideryType === 'NONE'} 
              />
            )}
            <DotNode state={getNodeState(7, idx)} dotSize={dotSize} lineH={lineH} />
            <DotNode state={getNodeState(8, idx)} dotSize={dotSize} lineH={lineH} />
            <DotNode state={getNodeState(9, idx)} dotSize={dotSize} lineH={lineH} />
            <DotNode state={getNodeState(10, idx)} dotSize={dotSize} lineH={lineH} isLast />
          </View>
        );
      })}
    </View>
  );

  const renderParallelLabels = () => {
    const activeLabels = hasAnyEmbroidery 
      ? PHASE2_LABELS 
      : PHASE2_LABELS.filter(label => label !== 'EMBROIDERY');

    return (
      <View style={[styles.labelsColumn, { width: LABEL_COL_WIDTH }]}>
        <View style={{ height: 60 + 16 }} />
        {activeLabels.map((label, i) => (
          <View key={i} style={{ height: lineH + dotSize }}>
            <View style={{ height: dotSize, justifyContent: 'center' }}>
              <Text style={styles.sideLabel}>{label}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // ─── SVG MERGE CURVES ────────────────────────────────────
  const renderMerge = () => {
    const svgHeight = 70;
    const svgWidth = numItems * colWidth;
    const centerEndX = svgWidth / 2;

    return (
      <View style={styles.svgContainer}>
        <Svg height={svgHeight} width={svgWidth}>
          <Defs>
            <SvgGradient id="mergeActive" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={PALETTE.active.to} stopOpacity="0.6" />
              <Stop offset="1" stopColor={PALETTE.active.from} stopOpacity="1" />
            </SvgGradient>
          </Defs>
          {items.map((_item: any, i: number) => {
            const itemIdx = getStationIndex(_item.status);
            const lineActive = itemIdx >= 11;
            const startX = (svgWidth / 2) - ((numItems - 1) * colWidth / 2) + (i * colWidth);
            const cp1X = startX;
            const cp1Y = svgHeight * 0.55;
            const cp2X = centerEndX;
            const cp2Y = svgHeight * 0.45;

            return (
              <Path
                key={i}
                d={`M ${startX} 0 C ${cp1X} ${cp1Y} ${cp2X} ${cp2Y} ${centerEndX} ${svgHeight}`}
                stroke={lineActive ? 'url(#mergeActive)' : 'url(#splitInactive)'}
                strokeWidth={lineActive ? "3" : "2"}
                fill="none"
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
      </View>
    );
  };

  // ─── PHASE 3 ─────────────────────────────────────────────
  const renderPhase3 = () => (
    <View style={styles.phaseCard}>
      <View style={styles.phaseHeader}>
        <Text style={styles.phaseTitle}>DISPATCH</Text>
        <View style={[styles.phaseBadge, minIdx >= 13 && styles.phaseBadgeDone]}>
          <Text style={styles.phaseBadgeText}>{minIdx >= 13 ? '✓ DONE' : 'PENDING'}</Text>
        </View>
      </View>
      {PHASE3_LABELS.map((label, i) => (
        <TrunkNode key={i} state={getNodeState(12 + i, minIdx)} label={label} icon={PHASE3_ICONS[i]} isLast={i === 1} />
      ))}
    </View>
  );

  // ─── RENDER ──────────────────────────────────────────────
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mainContainer}>

      {/* Summary Header */}
      <LinearGradient colors={['rgba(16,185,129,0.08)', 'rgba(59,130,246,0.08)']} style={styles.summaryCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryTitle}>{order.customerName || 'Order'}</Text>
            <Text style={styles.summarySubtitle}>{numItems} Pieces • Live Tracking</Text>
          </View>
          <View style={styles.progressCircle}>
            <Text style={styles.progressText}>{progressPercent}%</Text>
          </View>
        </View>
      </LinearGradient>

      {renderPhase1()}

      {/* Phase 2 Section */}
      <View style={styles.phase2Section}>
        <View style={styles.phaseHeader}>
          <Text style={styles.phaseTitle}>PIECE PROCESSING</Text>
          <View style={styles.phaseBadge}>
            <Text style={styles.phaseBadgeText}>{numItems} PIECES</Text>
          </View>
        </View>

        {renderSplit()}

        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {renderParallelPaths()}
          {renderParallelLabels()}
        </View>

        {renderMerge()}
      </View>

      {renderPhase3()}
    </ScrollView>
  );
};

// ─── STYLES ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  mainContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  // ── Summary Card ──
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  summarySubtitle: {
    color: PALETTE.label,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  progressCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: PALETTE.active.from,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  progressText: {
    color: PALETTE.active.from,
    fontSize: 14,
    fontWeight: '900',
  },

  // ── Phase Cards ──
  phaseCard: {
    backgroundColor: PALETTE.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  phase2Section: {
    backgroundColor: PALETTE.card,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  phaseTitle: {
    color: PALETTE.label,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  phaseBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  phaseBadgeDone: {
    backgroundColor: 'rgba(16,185,129,0.15)',
  },
  phaseBadgeText: {
    color: PALETTE.label,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // ── Trunk Node (Phase 1 & 3) ──
  trunkNodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: LINE_HEIGHT + NODE_SIZE,
  },
  trunkNodeLeft: {
    alignItems: 'center',
    width: NODE_SIZE + 8,
    marginRight: 16,
  },
  trunkNodeCircleOuter: {
    zIndex: 2,
  },
  trunkNodeCircle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trunkConnector: {
    width: 3,
    height: LINE_HEIGHT,
    borderRadius: 2,
    marginTop: -1,
  },
  trunkLabelContainer: {
    paddingTop: 5,
    flex: 1,
  },
  trunkLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  currentBadge: {
    marginTop: 4,
  },
  currentBadgeText: {
    color: PALETTE.current.from,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // ── SVG Container ──
  svgContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },

  // ── Phase 2: Parallel Columns ──
  parallelContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'nowrap',
  },
  column: {
    alignItems: 'center',
  },
  pieceCard: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
    height: 60,
    justifyContent: 'center',
  },
  pieceCardActive: {
    backgroundColor: 'rgba(16,185,129,0.06)',
    borderColor: 'rgba(16,185,129,0.2)',
  },
  pieceName: {
    color: PALETTE.dimText,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 4,
    textAlign: 'center',
  },
  pieceProgressBar: {
    width: '80%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  pieceProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // ── Labels Column ──
  labelsColumn: {
    justifyContent: 'flex-start',
    paddingLeft: 8,
  },
  sideLabel: {
    color: PALETTE.dimText,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});