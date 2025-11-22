import React, { useMemo } from 'react';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  spent: number;
  saved: number;
  remaining: number;
  size?: number;
  strokeWidth?: number;
};

const DonutChart: React.FC<Props> = ({ spent, saved, remaining, size = 180, strokeWidth = 18 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    const clampedRemaining = Math.max(remaining, 0);
    const total = Math.max(spent + saved + clampedRemaining, 1);
    return [
      { value: spent / total, color: '#ef4444' },
      { value: saved / total, color: '#10b981' },
      { value: clampedRemaining / total, color: '#2563eb' },
    ];
  }, [remaining, saved, spent]);

  let offset = 0;

  return (
    <Svg width={size} height={size}>
      {segments.map((segment, index) => {
        const dash = segment.value * circumference;
        const circle = (
          <Circle
            key={index}
            stroke={segment.color}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
          />
        );
        offset += dash;
        return circle;
      })}
    </Svg>
  );
};

export default DonutChart;
