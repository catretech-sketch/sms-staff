// src/components/icons/Icon.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { ICONS, type IconName } from './paths';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#000',
  strokeWidth = 2,
}) => {
  const def = ICONS[name];
  return (
    <Svg
      width={size}
      height={size}
      viewBox={def.viewBox}
      accessibilityLabel={name}
    >
      {def.paths.map((p, i) =>
        p.mode === 'fill' ? (
          <Path key={i} d={p.d} fill={color} />
        ) : (
          <Path
            key={i}
            d={p.d}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ),
      )}
    </Svg>
  );
};
