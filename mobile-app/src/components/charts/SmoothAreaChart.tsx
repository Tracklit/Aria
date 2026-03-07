import React from 'react';
import { View } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Text as SvgText,
} from 'react-native-svg';
import { useColors } from '../../theme';

interface SmoothAreaChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  gradientColors?: [string, string];
  strokeColor?: string;
  strokeWidth?: number;
  showDots?: boolean;
}

const PADDING_LEFT = 4;
const PADDING_RIGHT = 4;
const PADDING_TOP = 8;
const LABEL_HEIGHT = 16;

function catmullRomToBezier(
  points: { x: number; y: number }[],
): string {
  if (points.length < 2) return '';

  const pts = [points[0], ...points, points[points.length - 1]];
  let path = `M ${points[0].x},${points[0].y}`;

  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return path;
}

const SmoothAreaChart = React.memo(function SmoothAreaChart({
  data,
  labels,
  height = 120,
  gradientColors,
  strokeColor = '#00E5FF',
  strokeWidth = 2.5,
  showDots = false,
}: SmoothAreaChartProps) {
  const colors = useColors();

  if (!data || data.length === 0) {
    return <View style={{ height }} />;
  }

  const gradColors = gradientColors ?? ['#00E5FF', 'rgba(0,229,255,0)'];
  const hasLabels = labels && labels.length > 0;
  const chartHeight = hasLabels ? height - LABEL_HEIGHT : height;
  const drawHeight = chartHeight - PADDING_TOP;

  return (
    <View style={{ height }}>
      <Svg width="100%" height={height} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={gradColors[0]} stopOpacity="0.4" />
            <Stop offset="1" stopColor={gradColors[1]} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <SmoothAreaChartInner
          data={data}
          labels={hasLabels ? labels : undefined}
          chartHeight={chartHeight}
          drawHeight={drawHeight}
          totalHeight={height}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          showDots={showDots}
          textColor={colors.text.tertiary}
        />
      </Svg>
    </View>
  );
});

interface InnerProps {
  data: number[];
  labels?: string[];
  chartHeight: number;
  drawHeight: number;
  totalHeight: number;
  strokeColor: string;
  strokeWidth: number;
  showDots: boolean;
  textColor: string;
}

const SmoothAreaChartInner = React.memo(function SmoothAreaChartInner({
  data,
  labels,
  chartHeight,
  drawHeight,
  totalHeight,
  strokeColor,
  strokeWidth: sw,
  showDots,
  textColor,
}: InnerProps) {
  // Use a viewBox for consistent coordinate space
  const viewBoxWidth = 300;
  const usableWidth = viewBoxWidth - PADDING_LEFT - PADDING_RIGHT;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: PADDING_LEFT + (data.length === 1 ? usableWidth / 2 : (i / (data.length - 1)) * usableWidth),
    y: PADDING_TOP + drawHeight - ((v - min) / range) * drawHeight,
  }));

  const linePath = catmullRomToBezier(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x},${chartHeight} L ${points[0].x},${chartHeight} Z`;

  return (
    <Svg width="100%" height={totalHeight} viewBox={`0 0 ${viewBoxWidth} ${totalHeight}`}>
      <Defs>
        <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={strokeColor} stopOpacity="0.35" />
          <Stop offset="1" stopColor={strokeColor} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Path d={areaPath} fill="url(#areaGrad)" />
      <Path d={linePath} fill="none" stroke={strokeColor} strokeWidth={sw} strokeLinecap="round" />

      {showDots &&
        points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={strokeColor} />
        ))}

      {labels &&
        labels.map((label, i) => {
          const x =
            PADDING_LEFT +
            (labels.length === 1 ? usableWidth / 2 : (i / (labels.length - 1)) * usableWidth);
          return (
            <SvgText
              key={i}
              x={x}
              y={totalHeight - 2}
              fontSize={9}
              fill={textColor}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
    </Svg>
  );
});

export default SmoothAreaChart;
