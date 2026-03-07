import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

function catmullRomToBezier(points: { x: number; y: number }[]): string {
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

const SparklineChart = React.memo(function SparklineChart({
  data,
  width = 100,
  height = 30,
  color = '#00E5FF',
  strokeWidth = 2,
}: SparklineChartProps) {
  if (!data || data.length < 2) {
    return null;
  }

  const padding = 2;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * usableWidth,
    y: padding + usableHeight - ((v - min) / range) * usableHeight,
  }));

  const path = catmullRomToBezier(points);

  return (
    <Svg width={width} height={height}>
      <Path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
});

export default SparklineChart;
