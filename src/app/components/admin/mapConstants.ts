import {
  Circle, Square, Diamond, Hexagon, ArrowUp, ArrowUpRight, ArrowRight,
  ArrowDownRight, ArrowDown, ArrowDownLeft, ArrowLeft, ArrowUpLeft,
} from 'lucide-react';

export const SHAPES = [
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'square', label: 'Square', icon: Square },
  { id: 'diamond', label: 'Diamond', icon: Diamond },
  { id: 'hexagon', label: 'Hexagon', icon: Hexagon },
  { id: 'rounded', label: 'Rounded', icon: Square },
  { id: 'arrow', label: 'Arrow', icon: ArrowUp },
] as const;


export const HOTSPOT_COLORS = [
  '#F97316', '#3B82F6', '#10B981', '#EF4444',
  '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4',
  '#6366F1', '#84CC16',
];

export const ARROW_DIRECTIONS = [
  { angle: 0, label: '↑', Icon: ArrowUp },
  { angle: 45, label: '↗', Icon: ArrowUpRight },
  { angle: 90, label: '→', Icon: ArrowRight },
  { angle: 135, label: '↘', Icon: ArrowDownRight },
  { angle: 180, label: '↓', Icon: ArrowDown },
  { angle: 225, label: '↙', Icon: ArrowDownLeft },
  { angle: 270, label: '←', Icon: ArrowLeft },
  { angle: 315, label: '↖', Icon: ArrowUpLeft },
];