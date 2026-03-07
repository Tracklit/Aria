import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useColors } from '../../theme';

interface CircularGaugeProps {
  value: number;
  maxValue: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  unit?: string;
  valueFormatter?: (v: number) => string;
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

const CircularGauge = React.memo(function CircularGauge({
  value,
  maxValue,
  size = 80,
  strokeWidth = 8,
  color = '#00E5FF',
  backgroundColor = 'rgba(255,255,255,0.1)',
  label,
  unit,
  valueFormatter,
}: CircularGaugeProps) {
  const colors = useColors();
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const percentage = maxValue > 0 ? Math.min(value / maxValue, 1) : 0;

  const displayValue = valueFormatter ? valueFormatter(value) : String(Math.round(value));

  const sweepAngle = percentage * 360;
  const arcPath = sweepAngle > 0 ? describeArc(cx, cy, r, 0, Math.min(sweepAngle, 359.99)) : '';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        {arcPath ? (
          <Path
            d={arcPath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.labelContainer]}>
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.valueText,
              { color: colors.text.primary, fontSize: size * 0.22 },
            ]}
          >
            {displayValue}
          </Text>
          {unit ? (
            <Text
              style={[
                styles.unitText,
                { color: colors.text.tertiary, fontSize: size * 0.12 },
              ]}
            >
              {unit}
            </Text>
          ) : null}
          {label ? (
            <Text
              style={[
                styles.labelText,
                { color: colors.text.secondary, fontSize: size * 0.11 },
              ]}
            >
              {label}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  labelContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  valueText: {
    fontWeight: '700',
  },
  unitText: {
    marginTop: -2,
  },
  labelText: {
    marginTop: 1,
  },
});

export default CircularGauge;
