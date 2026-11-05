import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { expectedPoints, LABELS, type Label } from '../lib/classify';
import { colors } from '../lib/theme';

/** White's winning chances move by move: above the middle line favors White. Tap to jump to a move. */
export function EvalChart({ whiteEvals, labels, ply, onPick, height = 64 }: { whiteEvals: number[]; labels: (Label | null)[]; ply: number; onPick: (ply: number) => void; height?: number }) {
  const [width, setWidth] = useState(0);
  const count = Math.max(whiteEvals.length - 1, 1);
  const pad = 6;
  const x = (i: number) => pad + (i / count) * (width - pad * 2);
  const y = (cp: number) => pad + (1 - expectedPoints(cp)) * (height - pad * 2);
  const line = whiteEvals.map((cp, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(cp).toFixed(1)}`).join('');

  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel={`Evaluation graph, move ${Math.ceil(ply / 2)} of ${Math.ceil(count / 2)}`}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onPress={(e) => {
        if (!width) return;
        onPick(Math.max(0, Math.min(count, Math.round(((e.nativeEvent.locationX - pad) / (width - pad * 2)) * count))));
      }}
      style={{ height, borderRadius: 12, backgroundColor: colors.wash, overflow: 'hidden' }}
    >
      <View pointerEvents="none">
        {width > 0 && (
          <Svg width={width} height={height}>
            <Line x1={0} x2={width} y1={height / 2} y2={height / 2} stroke={colors.lineLip} strokeWidth={1} />
            <Line x1={x(ply)} x2={x(ply)} y1={0} y2={height} stroke={colors.faint} strokeWidth={1} />
            <Path d={line} fill="none" stroke={colors.ink} strokeWidth={2} strokeLinejoin="round" />
            {labels.map((l, i) =>
              l === 'blunder' || l === 'mistake' || l === 'brilliant' || l === 'great' ? (
                <Circle key={i} cx={x(i + 1)} cy={y(whiteEvals[i + 1] ?? 0)} r={4.5} fill={LABELS[l].color} stroke={colors.wash} strokeWidth={2} />
              ) : null,
            )}
          </Svg>
        )}
      </View>
    </Pressable>
  );
}

/** The classic bar beside the board: white's share of the bar is White's winning chance. */
export function EvalBar({ whiteCp, height, flipped }: { whiteCp: number; height: number; flipped: boolean }) {
  const share = expectedPoints(whiteCp);
  return (
    <View accessibilityLabel={`White winning chances ${Math.round(share * 100)} percent`} style={{ width: 12, height, borderRadius: 6, backgroundColor: '#3A444F', borderWidth: 1, borderColor: colors.faint, overflow: 'hidden', justifyContent: flipped ? 'flex-start' : 'flex-end' }}>
      <View style={{ height: height * share, backgroundColor: '#F4F6F8' }} />
    </View>
  );
}
