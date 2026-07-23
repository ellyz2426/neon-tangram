import {
  createSystem,
  World,
  Entity,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Color,
  Group,
  BoxGeometry,
  Shape,
  ExtrudeGeometry,
  RayInteractable,
  Pressed,
  Hovered,
  InputComponent,
  PanelUI,
  DoubleSide,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  AudioSource,
  AudioUtils,
  SphereGeometry,
  AdditiveBlending,
  Vector3,
} from '@iwsdk/core';

export type GameMode = 'classic' | 'speed' | 'zen' | 'challenge';
export type GameState = 'menu' | 'playing' | 'paused' | 'won' | 'levelselect' | 'settings' | 'achievements' | 'tutorial';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type PieceType = 'lgTri1' | 'lgTri2' | 'mdTri' | 'smTri1' | 'smTri2' | 'square' | 'para';

const PIECE_DEPTH = 0.03;
const S = 0.3;

function makePieceShape(type: PieceType): Shape {
  const s = new Shape();
  switch (type) {
    case 'lgTri1':
    case 'lgTri2':
      s.moveTo(-S, -S / 2);
      s.lineTo(S, -S / 2);
      s.lineTo(0, S / 2);
      s.closePath();
      break;
    case 'mdTri':
      { const h = S * 0.5;
        s.moveTo(-h, -h / 2);
        s.lineTo(h, -h / 2);
        s.lineTo(0, h / 2);
        s.closePath();
      }
      break;
    case 'smTri1':
    case 'smTri2':
      { const q = S * 0.35;
        s.moveTo(-q, -q / 2);
        s.lineTo(q, -q / 2);
        s.lineTo(0, q / 2);
        s.closePath();
      }
      break;
    case 'square':
      { const a = S * 0.35;
        s.moveTo(-a, -a);
        s.lineTo(a, -a);
        s.lineTo(a, a);
        s.lineTo(-a, a);
        s.closePath();
      }
      break;
    case 'para':
      { const w = S * 0.5, h = S * 0.25;
        s.moveTo(-w + h, -h);
        s.lineTo(w + h, -h);
        s.lineTo(w - h, h);
        s.lineTo(-w - h, h);
        s.closePath();
      }
      break;
  }
  return s;
}

const PIECE_TYPES: PieceType[] = ['lgTri1', 'lgTri2', 'mdTri', 'smTri1', 'smTri2', 'square', 'para'];

export const COLOR_SCHEMES: Record<string, number[][]> = {
  cyan: [[0x00ffff,0x009999],[0xff00ff,0x990099],[0x00ff44,0x009933],[0xff8800,0x995500],[0xffff00,0x999900],[0xff0044,0x990033],[0x4488ff,0x335599]],
  green: [[0x44ff88,0x33aa55],[0xff4488,0xaa3355],[0x4488ff,0x3355aa],[0xffaa00,0xaa7700],[0xddff00,0x88aa00],[0xff2244,0xaa1133],[0x00ddff,0x0088aa]],
  magenta: [[0xff44ff,0xaa33aa],[0x44ffff,0x33aaaa],[0xffff44,0xaaaa33],[0x44ff44,0x33aa33],[0xff4444,0xaa3333],[0x4444ff,0x3333aa],[0xff8844,0xaa5533]],
  gold: [[0xffcc00,0xaa8800],[0x00ccff,0x0088aa],[0xff4400,0xaa3300],[0x44ff00,0x33aa00],[0xcc00ff,0x8800aa],[0xff0066,0xaa0044],[0x00ff99,0x00aa66]],
};

interface PiecePlacement { x: number; y: number; rot: number; flip?: boolean; }
interface PuzzleDef { name: string; pieces: PiecePlacement[]; }

const PUZZLES: Record<Difficulty, PuzzleDef[]> = {
  easy: [
    { name: 'Square', pieces: [
      { x: -0.15, y: 0.15, rot: Math.PI*0.75 }, { x: 0.15, y: -0.15, rot: -Math.PI*0.25 },
      { x: 0.15, y: 0.15, rot: 0 }, { x: -0.08, y: -0.15, rot: Math.PI },
      { x: 0.08, y: -0.15, rot: 0 }, { x: -0.18, y: -0.05, rot: 0 },
      { x: 0, y: 0, rot: 0 },
    ]},
    { name: 'Triangle', pieces: [
      { x: -0.1, y: -0.1, rot: 0 }, { x: 0.1, y: -0.1, rot: Math.PI },
      { x: 0, y: 0.1, rot: Math.PI }, { x: -0.2, y: -0.18, rot: 0 },
      { x: 0.2, y: -0.18, rot: Math.PI }, { x: 0, y: 0.02, rot: Math.PI*0.25 },
      { x: 0, y: -0.12, rot: 0 },
    ]},
    { name: 'Rectangle', pieces: [
      { x: -0.15, y: 0.08, rot: Math.PI*0.5 }, { x: 0.15, y: 0.08, rot: -Math.PI*0.5 },
      { x: 0, y: -0.08, rot: Math.PI*0.25 }, { x: -0.12, y: -0.12, rot: Math.PI*0.75 },
      { x: 0.12, y: -0.12, rot: -Math.PI*0.25 }, { x: 0, y: 0.08, rot: Math.PI*0.25 },
      { x: 0, y: -0.02, rot: Math.PI*0.25 },
    ]},
    { name: 'Diamond', pieces: [
      { x: 0, y: 0.18, rot: Math.PI*0.25 }, { x: 0, y: -0.18, rot: -Math.PI*0.75 },
      { x: 0.12, y: 0, rot: -Math.PI*0.25 }, { x: -0.08, y: 0.08, rot: Math.PI*0.5 },
      { x: 0.08, y: -0.08, rot: -Math.PI*0.5 }, { x: -0.1, y: -0.02, rot: Math.PI*0.25 },
      { x: 0, y: 0, rot: Math.PI*0.25 },
    ]},
    { name: 'Trapezoid', pieces: [
      { x: -0.12, y: 0.05, rot: Math.PI*0.5 }, { x: 0.12, y: 0.05, rot: -Math.PI*0.5 },
      { x: 0, y: -0.12, rot: 0 }, { x: -0.18, y: -0.08, rot: Math.PI*0.5 },
      { x: 0.18, y: -0.08, rot: -Math.PI*0.5 }, { x: 0, y: 0.05, rot: 0 },
      { x: 0, y: -0.05, rot: 0 },
    ]},
    { name: 'Parallelogram', pieces: [
      { x: -0.12, y: 0.1, rot: Math.PI*0.25 }, { x: 0.12, y: -0.1, rot: -Math.PI*0.75 },
      { x: 0, y: 0, rot: Math.PI*0.5 }, { x: -0.15, y: -0.12, rot: Math.PI*0.25 },
      { x: 0.15, y: 0.12, rot: -Math.PI*0.25 }, { x: 0.08, y: 0.05, rot: Math.PI*0.25 },
      { x: -0.05, y: -0.05, rot: Math.PI*0.25 },
    ]},
    { name: 'House', pieces: [
      { x: 0, y: 0.18, rot: Math.PI }, { x: 0, y: -0.05, rot: 0 },
      { x: 0.08, y: 0.1, rot: -Math.PI*0.25 }, { x: -0.1, y: -0.15, rot: Math.PI*0.5 },
      { x: 0.1, y: -0.15, rot: -Math.PI*0.5 }, { x: 0, y: -0.15, rot: 0 },
      { x: -0.08, y: 0.1, rot: Math.PI*0.75 },
    ]},
    { name: 'Fish', pieces: [
      { x: -0.08, y: 0, rot: Math.PI*0.5 }, { x: 0.12, y: 0, rot: -Math.PI*0.5 },
      { x: -0.18, y: 0.08, rot: Math.PI*0.25 }, { x: -0.18, y: -0.08, rot: Math.PI*0.75 },
      { x: 0.18, y: 0, rot: 0 }, { x: 0.05, y: 0, rot: Math.PI*0.25 },
      { x: -0.05, y: 0, rot: 0, flip: true },
    ]},
    { name: 'Chevron', pieces: [
      { x: 0, y: 0.12, rot: Math.PI*0.25 }, { x: 0, y: -0.12, rot: -Math.PI*0.75 },
      { x: -0.08, y: 0, rot: Math.PI*0.5 }, { x: 0.12, y: 0.05, rot: -Math.PI*0.25 },
      { x: -0.12, y: -0.05, rot: Math.PI*0.75 }, { x: 0.05, y: -0.08, rot: Math.PI*0.25 },
      { x: -0.05, y: 0.08, rot: Math.PI*0.25 },
    ]},
    { name: 'Cross', pieces: [
      { x: 0, y: 0.15, rot: Math.PI*0.25 }, { x: 0, y: -0.15, rot: -Math.PI*0.75 },
      { x: 0, y: 0, rot: Math.PI }, { x: -0.12, y: 0, rot: Math.PI*0.5 },
      { x: 0.12, y: 0, rot: -Math.PI*0.5 }, { x: 0, y: 0.05, rot: 0 },
      { x: 0, y: -0.05, rot: 0 },
    ]},
  ],
  medium: [
    { name: 'Cat', pieces: [
      { x: -0.05, y: -0.08, rot: Math.PI*0.75 }, { x: 0.12, y: 0.05, rot: -Math.PI*0.5 },
      { x: -0.12, y: 0.12, rot: Math.PI*0.25 }, { x: 0.15, y: 0.18, rot: -Math.PI*0.25 },
      { x: -0.15, y: 0.2, rot: Math.PI*0.75 }, { x: 0.05, y: -0.12, rot: Math.PI*0.25 },
      { x: -0.05, y: 0.05, rot: Math.PI*0.5 },
    ]},
    { name: 'Swan', pieces: [
      { x: 0.05, y: -0.1, rot: -Math.PI*0.25 }, { x: -0.1, y: 0.08, rot: Math.PI*0.75 },
      { x: 0.12, y: 0.1, rot: -Math.PI*0.5 }, { x: -0.05, y: 0.2, rot: Math.PI*0.5 },
      { x: 0.15, y: 0.2, rot: -Math.PI*0.25 }, { x: -0.12, y: -0.08, rot: Math.PI*0.25 },
      { x: 0, y: 0.02, rot: Math.PI*0.25, flip: true },
    ]},
    { name: 'Runner', pieces: [
      { x: 0, y: 0.12, rot: Math.PI*0.25 }, { x: -0.12, y: -0.1, rot: Math.PI },
      { x: 0.08, y: -0.05, rot: -Math.PI*0.5 }, { x: 0.15, y: -0.18, rot: 0 },
      { x: -0.15, y: -0.2, rot: Math.PI*0.5 }, { x: 0.05, y: 0.05, rot: Math.PI*0.25 },
      { x: -0.05, y: 0, rot: Math.PI*0.75 },
    ]},
    { name: 'Candle', pieces: [
      { x: 0, y: -0.12, rot: 0 }, { x: 0, y: 0.12, rot: Math.PI },
      { x: 0, y: 0.22, rot: Math.PI }, { x: -0.1, y: -0.05, rot: Math.PI*0.5 },
      { x: 0.1, y: -0.05, rot: -Math.PI*0.5 }, { x: 0, y: 0.02, rot: 0 },
      { x: 0, y: -0.18, rot: 0 },
    ]},
    { name: 'Boat', pieces: [
      { x: -0.1, y: -0.08, rot: 0 }, { x: 0.1, y: -0.08, rot: Math.PI },
      { x: 0, y: 0.08, rot: Math.PI }, { x: -0.18, y: 0.05, rot: Math.PI*0.5 },
      { x: 0.18, y: 0.05, rot: -Math.PI*0.5 }, { x: 0, y: -0.15, rot: 0 },
      { x: 0, y: 0, rot: 0, flip: true },
    ]},
    { name: 'Rabbit', pieces: [
      { x: 0, y: -0.1, rot: 0 }, { x: -0.1, y: 0.08, rot: Math.PI*0.75 },
      { x: 0.08, y: 0.15, rot: -Math.PI*0.25 }, { x: -0.05, y: 0.22, rot: Math.PI*0.5 },
      { x: 0.1, y: 0.22, rot: -Math.PI*0.75 }, { x: 0.05, y: 0, rot: Math.PI*0.25 },
      { x: -0.08, y: -0.05, rot: Math.PI*0.5, flip: true },
    ]},
    { name: 'Mountain', pieces: [
      { x: -0.12, y: -0.1, rot: 0 }, { x: 0.12, y: -0.1, rot: Math.PI },
      { x: 0, y: 0.05, rot: Math.PI*0.5 }, { x: -0.2, y: -0.05, rot: Math.PI*0.25 },
      { x: 0.2, y: -0.05, rot: -Math.PI*0.25 }, { x: 0, y: -0.1, rot: 0 },
      { x: 0, y: 0.1, rot: Math.PI*0.25 },
    ]},
    { name: 'Fox', pieces: [
      { x: 0.05, y: -0.05, rot: -Math.PI*0.25 }, { x: -0.12, y: 0.08, rot: Math.PI*0.5 },
      { x: 0.12, y: 0.12, rot: -Math.PI*0.5 }, { x: -0.08, y: 0.2, rot: Math.PI*0.75 },
      { x: 0.15, y: 0.2, rot: -Math.PI*0.25 }, { x: -0.05, y: -0.1, rot: Math.PI*0.25 },
      { x: 0, y: 0.05, rot: Math.PI*0.5, flip: true },
    ]},
    { name: 'Penguin', pieces: [
      { x: 0, y: -0.12, rot: Math.PI*0.25 }, { x: 0, y: 0.12, rot: -Math.PI*0.75 },
      { x: 0.08, y: 0, rot: -Math.PI*0.5 }, { x: -0.08, y: 0.15, rot: Math.PI*0.75 },
      { x: 0.08, y: 0.15, rot: -Math.PI*0.25 }, { x: -0.05, y: -0.05, rot: Math.PI*0.25 },
      { x: 0, y: -0.18, rot: 0 },
    ]},
    { name: 'Tower', pieces: [
      { x: 0, y: -0.15, rot: 0 }, { x: 0, y: 0.15, rot: Math.PI },
      { x: 0, y: 0, rot: Math.PI*0.5 }, { x: -0.08, y: -0.08, rot: Math.PI*0.5 },
      { x: 0.08, y: -0.08, rot: -Math.PI*0.5 }, { x: 0, y: 0.08, rot: 0 },
      { x: 0, y: -0.2, rot: 0 },
    ]},
  ],
  hard: [
    { name: 'Heart', pieces: [
      { x: -0.08, y: 0.08, rot: Math.PI*0.5 }, { x: 0.08, y: 0.08, rot: -Math.PI*0.5 },
      { x: 0, y: -0.08, rot: Math.PI }, { x: -0.15, y: 0.15, rot: Math.PI*0.75 },
      { x: 0.15, y: 0.15, rot: -Math.PI*0.75 }, { x: 0, y: 0.12, rot: Math.PI*0.25 },
      { x: 0, y: 0.02, rot: 0 },
    ]},
    { name: 'Arrow', pieces: [
      { x: 0, y: 0.15, rot: 0 }, { x: 0, y: -0.05, rot: Math.PI },
      { x: 0.1, y: 0.08, rot: -Math.PI*0.25 }, { x: -0.1, y: 0.1, rot: Math.PI*0.75 },
      { x: 0.1, y: 0.1, rot: -Math.PI*0.25 }, { x: 0, y: -0.12, rot: 0 },
      { x: 0, y: -0.2, rot: 0 },
    ]},
    { name: 'Bridge', pieces: [
      { x: -0.15, y: 0, rot: Math.PI*0.25 }, { x: 0.15, y: 0, rot: -Math.PI*0.25 },
      { x: 0, y: 0.1, rot: Math.PI }, { x: -0.08, y: -0.1, rot: 0 },
      { x: 0.08, y: -0.1, rot: Math.PI }, { x: 0, y: -0.1, rot: 0 },
      { x: 0, y: 0.05, rot: Math.PI*0.5 },
    ]},
    { name: 'Letter T', pieces: [
      { x: -0.12, y: 0.08, rot: Math.PI*0.5 }, { x: 0.12, y: 0.08, rot: -Math.PI*0.5 },
      { x: 0, y: -0.08, rot: Math.PI }, { x: -0.05, y: -0.15, rot: Math.PI*0.5 },
      { x: 0.05, y: -0.15, rot: -Math.PI*0.5 }, { x: 0, y: 0.08, rot: 0 },
      { x: 0, y: -0.05, rot: 0 },
    ]},
    { name: 'Hexagon', pieces: [
      { x: -0.1, y: 0.05, rot: Math.PI*0.5 }, { x: 0.1, y: -0.05, rot: -Math.PI*0.5 },
      { x: 0.1, y: 0.08, rot: -Math.PI*0.25 }, { x: -0.08, y: -0.08, rot: Math.PI*0.25 },
      { x: 0.08, y: -0.08, rot: -Math.PI*0.75 }, { x: -0.05, y: 0.1, rot: Math.PI*0.25 },
      { x: 0, y: 0, rot: Math.PI*0.75, flip: true },
    ]},
    { name: 'Butterfly', pieces: [
      { x: -0.1, y: 0.05, rot: Math.PI*0.75 }, { x: 0.1, y: 0.05, rot: -Math.PI*0.75 },
      { x: 0, y: -0.1, rot: 0 }, { x: -0.15, y: -0.05, rot: Math.PI*0.5 },
      { x: 0.15, y: -0.05, rot: -Math.PI*0.5 }, { x: 0, y: 0.08, rot: Math.PI*0.25 },
      { x: 0, y: -0.02, rot: Math.PI*0.5, flip: true },
    ]},
    { name: 'Rocket', pieces: [
      { x: 0, y: 0.2, rot: Math.PI*0.25 }, { x: 0, y: -0.08, rot: -Math.PI*0.75 },
      { x: 0, y: 0.08, rot: 0 }, { x: -0.1, y: -0.15, rot: Math.PI*0.5 },
      { x: 0.1, y: -0.15, rot: -Math.PI*0.5 }, { x: 0, y: 0, rot: Math.PI*0.25 },
      { x: 0, y: -0.2, rot: 0, flip: true },
    ]},
    { name: 'Eagle', pieces: [
      { x: -0.12, y: 0.05, rot: Math.PI*0.5 }, { x: 0.12, y: 0.05, rot: -Math.PI*0.5 },
      { x: 0, y: 0.18, rot: Math.PI }, { x: -0.2, y: -0.05, rot: Math.PI*0.25 },
      { x: 0.2, y: -0.05, rot: -Math.PI*0.25 }, { x: 0, y: -0.05, rot: 0 },
      { x: 0, y: -0.15, rot: Math.PI*0.5 },
    ]},
    { name: 'Spiral', pieces: [
      { x: -0.05, y: 0.1, rot: Math.PI*0.75 }, { x: 0.1, y: -0.05, rot: -Math.PI*0.25 },
      { x: -0.1, y: -0.05, rot: Math.PI*0.25 }, { x: 0.05, y: 0.12, rot: -Math.PI*0.5 },
      { x: -0.05, y: -0.15, rot: Math.PI*0.75 }, { x: 0.08, y: 0.05, rot: -Math.PI*0.25 },
      { x: -0.08, y: 0.02, rot: Math.PI*0.5, flip: true },
    ]},
    { name: 'Crown', pieces: [
      { x: -0.12, y: 0.1, rot: Math.PI*0.5 }, { x: 0.12, y: 0.1, rot: -Math.PI*0.5 },
      { x: 0, y: 0.15, rot: Math.PI }, { x: -0.18, y: -0.02, rot: Math.PI*0.25 },
      { x: 0.18, y: -0.02, rot: -Math.PI*0.25 }, { x: 0, y: -0.02, rot: 0 },
      { x: 0, y: -0.1, rot: Math.PI*0.25, flip: true },
    ]},
  ],
};

export const ACHIEVEMENTS = [
  { id: 'first_solve', name: 'First Solve', desc: 'Complete your first tangram' },
  { id: 'easy_clear', name: 'Easy Does It', desc: 'Complete an Easy puzzle' },
  { id: 'medium_clear', name: 'Getting Harder', desc: 'Complete a Medium puzzle' },
  { id: 'hard_clear', name: 'Tangram Master', desc: 'Complete a Hard puzzle' },
  { id: 'speed_win', name: 'Speed Solver', desc: 'Win a Speed mode game' },
  { id: 'zen_clear', name: 'Zen Master', desc: 'Complete a Zen mode puzzle' },
  { id: 'challenge_win', name: 'Challenge Accepted', desc: 'Win a Challenge mode game' },
  { id: 'no_undo', name: 'No Take Backs', desc: 'Complete without using undo' },
  { id: 'under_20', name: 'Efficient', desc: 'Complete in under 20 moves' },
  { id: 'under_10', name: 'Minimal Moves', desc: 'Complete in under 10 moves' },
  { id: 'streak_3', name: 'Hat Trick', desc: 'Win 3 puzzles in a row' },
  { id: 'streak_5', name: 'On Fire', desc: 'Win 5 puzzles in a row' },
  { id: 'streak_10', name: 'Unstoppable', desc: 'Win 10 puzzles in a row' },
  { id: 'fast_60', name: 'Quick Thinker', desc: 'Complete in under 60 seconds' },
  { id: 'fast_30', name: 'Lightning', desc: 'Complete in under 30 seconds' },
  { id: 'all_easy', name: 'Easy Sweep', desc: 'Complete all 5 Easy levels' },
  { id: 'all_medium', name: 'Medium Sweep', desc: 'Complete all 5 Medium levels' },
  { id: 'all_hard', name: 'Hard Sweep', desc: 'Complete all 5 Hard levels' },
  { id: 'total_50', name: 'Tangram Addict', desc: 'Complete 50 total puzzles' },
  { id: 'all_modes', name: 'Well Rounded', desc: 'Win in all 4 game modes' },
];

export interface SaveData {
  bestMoves: Record<string, number>;
  bestTimes: Record<string, number>;
  achievements: Record<string, boolean>;
  colorScheme: string;
  totalSolves: number;
  totalPlayTime: number;
}

export function loadSave(): SaveData {
  try { const r = localStorage.getItem('neon-tangram-save'); if (r) return JSON.parse(r); } catch {}
  return { bestMoves: {}, bestTimes: {}, achievements: {}, colorScheme: 'cyan', totalSolves: 0, totalPlayTime: 0 };
}

export function saveSave(d: SaveData) {
  try { localStorage.setItem('neon-tangram-save', JSON.stringify(d)); } catch {}
}

interface PieceData {
  type: PieceType;
  group: Group;
  hitEntity: Entity;
  x: number;
  y: number;
  rot: number;
  flipped: boolean;
  targetX: number;
  targetY: number;
  targetRot: number;
  targetFlip: boolean;
  snapped: boolean;
}

interface MoveRecord { pieceIdx: number; fromX: number; fromY: number; fromRot: number; fromFlip: boolean; }

const SNAP_DIST = 0.04;
const SNAP_ANGLE = Math.PI / 6;
const MOVE_STEP = 0.02;
const ROT_STEP = Math.PI / 4;
const TABLE_Y = 0.8;
const TABLE_Z = -1.8;

// Snap animation data
interface SnapAnim {
  pieceIdx: number;
  startX: number; startY: number; startRot: number;
  endX: number; endY: number; endRot: number;
  progress: number;
}

// Win celebration particles
interface CelebParticle {
  mesh: Mesh;
  vx: number; vy: number; vz: number;
  life: number;
}

export class GameSystem extends createSystem({
  interactive: { required: [RayInteractable] },
  pressed: { required: [Pressed, RayInteractable] },
  hovered: { required: [Hovered, RayInteractable] },
}) {
  world!: World;
  panelEntities: Record<string, Entity> = {};
  panelPositions: Record<string, [number, number, number]> = {};

  state: GameState = 'menu';
  mode: GameMode = 'classic';
  difficulty: Difficulty = 'easy';
  level = 1;
  pieces: PieceData[] = [];
  selectedPiece = -1;
  moves = 0;
  undoUsed = false;
  moveHistory: MoveRecord[] = [];
  timer = 0;
  moveLimit = 0;
  winStreak = 0;
  totalWins = 0;
  modesWon = new Set<string>();
  save: SaveData = loadSave();
  colorPalette: number[][] = [];

  table: Mesh | null = null;
  targetGroup: Group | null = null;
  selGlow = 0;
  input!: any;
  stickHeld = false;

  // Hint system
  hintActive = false;
  hintTimer = 0;
  hintTargetMeshes: Mesh[] = [];

  // Snap animation
  snapAnims: SnapAnim[] = [];

  // Win celebration
  celebParticles: CelebParticle[] = [];
  winTimer = 0;

  // Audio entities
  audioEntity: Entity | null = null;

  // Drag state
  isDragging = false;
  dragPieceIdx = -1;
  lastHovered = -1;

  onStateChange: (() => void) | null = null;

  setRefs(refs: { world: World; panelEntities: Record<string, Entity>; panelPositions: Record<string, [number, number, number]> }) {
    this.world = refs.world;
    this.panelEntities = refs.panelEntities;
    this.panelPositions = refs.panelPositions;
    this.input = (this.world as any).input || this.world.player;
    this.colorPalette = COLOR_SCHEMES[this.save.colorScheme] || COLOR_SCHEMES['cyan'];
    this.buildTable();
    this.setupAudio();
  }

  setupAudio() {
    // Create audio entities for each sound
    const audioGroup = new Group();
    audioGroup.position.set(0, TABLE_Y, TABLE_Z);
    this.world.scene.add(audioGroup);
    this.audioEntity = this.world.createTransformEntity(audioGroup);
    this.audioEntity.addComponent(AudioSource, {
      src: './audio/select.wav',
      volume: 0.6,
      positional: false,
    });
  }

  playSound(sound: string) {
    if (!this.audioEntity) return;
    try {
      this.audioEntity.addComponent(AudioSource, {
        src: `./audio/${sound}.wav`,
        volume: sound === 'win' ? 0.7 : sound === 'move' ? 0.3 : 0.5,
        positional: false,
        autoplay: true,
      });
    } catch {
      // Audio may not be ready yet
    }
  }

  setColorScheme(s: string) {
    this.save.colorScheme = s;
    this.colorPalette = COLOR_SCHEMES[s] || COLOR_SCHEMES['cyan'];
    saveSave(this.save);
    if (this.pieces.length > 0) this.refreshVisuals();
  }

  buildTable() {
    if (this.table) this.world.scene.remove(this.table);
    const geo = new BoxGeometry(2, 0.06, 1.5);
    const mat = new MeshStandardMaterial({
      color: 0x0a0a1a,
      emissive: new Color('#050510'),
      emissiveIntensity: 0.3,
      metalness: 0.8,
      roughness: 0.3,
    });
    this.table = new Mesh(geo, mat);
    this.table.position.set(0, TABLE_Y - 0.03, TABLE_Z);
    this.world.scene.add(this.table);

    // Table edge glow
    const edgeGeo = new BoxGeometry(2.02, 0.08, 1.52);
    const edgeMat = new MeshStandardMaterial({
      color: 0x00ffff,
      emissive: new Color('#00ffff'),
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
    });
    const edgeMesh = new Mesh(edgeGeo, edgeMat);
    edgeMesh.position.set(0, TABLE_Y - 0.03, TABLE_Z);
    this.world.scene.add(edgeMesh);
  }

  createPieceMesh(type: PieceType, colorIdx: number): { mesh: Mesh; edges: LineSegments } {
    const shape = makePieceShape(type);
    const geo = new ExtrudeGeometry(shape, { depth: PIECE_DEPTH, bevelEnabled: false });
    const c = this.colorPalette[colorIdx] || [0xffffff, 0x888888];
    const mat = new MeshStandardMaterial({
      color: c[0],
      emissive: new Color(c[0]),
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.85,
      side: DoubleSide,
    });
    const mesh = new Mesh(geo, mat);
    const edgeGeo = new EdgesGeometry(geo);
    const edgeMat = new LineBasicMaterial({ color: c[0], transparent: true, opacity: 0.8 });
    const edges = new LineSegments(edgeGeo, edgeMat);
    mesh.add(edges);
    return { mesh, edges };
  }

  createTargetOutline(type: PieceType): Mesh {
    const shape = makePieceShape(type);
    const geo = new ExtrudeGeometry(shape, { depth: PIECE_DEPTH * 0.5, bevelEnabled: false });
    const mat = new MeshStandardMaterial({
      color: 0x224466,
      emissive: new Color('#112233'),
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.3,
      side: DoubleSide,
    });
    return new Mesh(geo, mat);
  }

  generatePuzzle() {
    this.clearPieces();
    const puzzles = PUZZLES[this.difficulty];
    const puzzle = puzzles[(this.level - 1) % puzzles.length];

    this.targetGroup = new Group();
    this.targetGroup.position.set(0, TABLE_Y + 0.001, TABLE_Z);
    this.targetGroup.rotation.x = -Math.PI / 2;

    for (let i = 0; i < PIECE_TYPES.length; i++) {
      const target = puzzle.pieces[i];
      const outline = this.createTargetOutline(PIECE_TYPES[i]);
      outline.position.set(target.x, target.y, 0);
      outline.rotation.z = target.rot;
      if (target.flip) outline.scale.x = -1;
      this.targetGroup.add(outline);
    }
    this.world.scene.add(this.targetGroup);

    for (let i = 0; i < PIECE_TYPES.length; i++) {
      const type = PIECE_TYPES[i];
      const target = puzzle.pieces[i];
      const { mesh } = this.createPieceMesh(type, i);

      const group = new Group();
      const angle = (i / 7) * Math.PI * 2;
      const sx = Math.cos(angle) * 0.55;
      const sy = Math.sin(angle) * 0.35;
      const srot = Math.random() * Math.PI * 2;

      group.position.set(sx, TABLE_Y + PIECE_DEPTH, TABLE_Z + sy);
      group.rotation.x = -Math.PI / 2;
      group.rotation.z = srot;
      mesh.position.set(0, 0, 0);
      group.add(mesh);
      this.world.scene.add(group);

      const hitGeo = new BoxGeometry(S * 0.9, S * 0.9, PIECE_DEPTH + 0.05);
      const hitMat = new MeshBasicMaterial({ visible: false });
      const hitMesh = new Mesh(hitGeo, hitMat);
      hitMesh.position.set(group.position.x, group.position.y + 0.02, group.position.z);
      hitMesh.userData = { pieceIdx: i };
      this.world.scene.add(hitMesh);
      const hitEntity = this.world.createTransformEntity(hitMesh);
      hitEntity.addComponent(RayInteractable);

      this.pieces.push({
        type, group, hitEntity,
        x: sx, y: sy, rot: srot, flipped: false,
        targetX: target.x, targetY: target.y, targetRot: target.rot,
        targetFlip: target.flip || false,
        snapped: false,
      });
    }

    this.moves = 0;
    this.undoUsed = false;
    this.moveHistory = [];
    this.timer = 0;
    this.selectedPiece = -1;
    this.moveLimit = this.mode === 'challenge' ? 50 : 0;
    this.hintActive = false;
    this.snapAnims = [];
    this.clearCelebration();
  }

  clearPieces() {
    for (const p of this.pieces) {
      this.world.scene.remove(p.group);
      if (p.hitEntity.object3D) this.world.scene.remove(p.hitEntity.object3D);
      p.hitEntity.destroy();
    }
    this.pieces = [];
    if (this.targetGroup) {
      this.world.scene.remove(this.targetGroup);
      this.targetGroup = null;
    }
    this.clearHintMeshes();
  }

  refreshVisuals() {
    for (let i = 0; i < this.pieces.length; i++) {
      const p = this.pieces[i];
      const c = this.colorPalette[i] || [0xffffff, 0x888888];
      const mesh = p.group.children[0] as Mesh;
      if (mesh) {
        const mat = mesh.material as MeshStandardMaterial;
        mat.color.setHex(c[0]);
        mat.emissive.setHex(c[0]);
        if (i === this.selectedPiece) {
          mat.emissiveIntensity = 0.8;
          mat.opacity = 1.0;
          p.group.position.y = TABLE_Y + PIECE_DEPTH + 0.03;
        } else {
          mat.emissiveIntensity = p.snapped ? 0.7 : 0.5;
          mat.opacity = p.snapped ? 0.95 : 0.85;
          p.group.position.y = TABLE_Y + PIECE_DEPTH;
        }
      }
    }
  }

  // === Hint system ===
  showHint() {
    if (this.selectedPiece < 0 || this.selectedPiece >= this.pieces.length) return;
    const p = this.pieces[this.selectedPiece];
    if (p.snapped) return;

    this.clearHintMeshes();
    this.playSound('hint');

    // Create a glowing ghost at target position
    const shape = makePieceShape(p.type);
    const geo = new ExtrudeGeometry(shape, { depth: PIECE_DEPTH * 0.5, bevelEnabled: false });
    const mat = new MeshStandardMaterial({
      color: 0x00ffff,
      emissive: new Color('#00ffff'),
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.5,
      side: DoubleSide,
    });
    const hintMesh = new Mesh(geo, mat);
    // Position hint at target location
    const hintGroup = new Group();
    hintGroup.position.set(p.targetX, TABLE_Y + PIECE_DEPTH + 0.01, TABLE_Z + p.targetY);
    hintGroup.rotation.x = -Math.PI / 2;
    hintGroup.rotation.z = p.targetRot;
    if (p.targetFlip) hintGroup.scale.x = -1;
    hintGroup.add(hintMesh);
    this.world.scene.add(hintGroup);
    this.hintTargetMeshes.push(hintMesh);
    (hintMesh as any).__hintGroup = hintGroup;

    this.hintActive = true;
    this.hintTimer = 0;
    this.moves++; // hints cost a move
  }

  clearHintMeshes() {
    for (const m of this.hintTargetMeshes) {
      const g = (m as any).__hintGroup;
      if (g) this.world.scene.remove(g);
    }
    this.hintTargetMeshes = [];
    this.hintActive = false;
  }

  // === Snap animation ===
  startSnapAnim(idx: number, fromX: number, fromY: number, fromRot: number) {
    const p = this.pieces[idx];
    this.snapAnims.push({
      pieceIdx: idx,
      startX: fromX, startY: fromY, startRot: fromRot,
      endX: p.targetX, endY: p.targetY, endRot: p.targetRot,
      progress: 0,
    });
  }

  // === Win celebration ===
  // Snap burst - small particle burst at snap location
  spawnSnapBurst(x: number, z: number, pieceIdx: number) {
    const c = this.colorPalette[pieceIdx] || [0x00ffff, 0x009999];
    for (let i = 0; i < 12; i++) {
      const geo = new SphereGeometry(0.01, 4, 4);
      const mat = new MeshStandardMaterial({
        color: c[0],
        emissive: new Color(c[0]),
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 1,
      });
      const mesh = new Mesh(geo, mat);
      mesh.position.set(x, TABLE_Y + 0.05, z);
      this.world.scene.add(mesh);
      const angle = (i / 12) * Math.PI * 2;
      this.celebParticles.push({
        mesh,
        vx: Math.cos(angle) * 0.8,
        vy: 0.5 + Math.random() * 0.5,
        vz: Math.sin(angle) * 0.8,
        life: 0.5 + Math.random() * 0.3,
      });
    }
  }

  spawnCelebration() {
    this.clearCelebration();
    const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff44, 0xff4400, 0x4488ff];
    for (let i = 0; i < 60; i++) {
      const geo = new SphereGeometry(0.015, 6, 6);
      const mat = new MeshStandardMaterial({
        color: colors[i % colors.length],
        emissive: new Color(colors[i % colors.length]),
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 1,
      });
      const mesh = new Mesh(geo, mat);
      mesh.position.set(0, TABLE_Y + 0.2, TABLE_Z);
      this.world.scene.add(mesh);
      this.celebParticles.push({
        mesh,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 2 + 1,
        vz: (Math.random() - 0.5) * 2,
        life: 1 + Math.random() * 1.5,
      });
    }
    this.winTimer = 0;
  }

  clearCelebration() {
    for (const p of this.celebParticles) {
      this.world.scene.remove(p.mesh);
    }
    this.celebParticles = [];
  }

  movePiece(idx: number, dx: number, dy: number) {
    if (idx < 0 || idx >= this.pieces.length) return;
    const p = this.pieces[idx];
    if (p.snapped) return;

    this.moveHistory.push({ pieceIdx: idx, fromX: p.x, fromY: p.y, fromRot: p.rot, fromFlip: p.flipped });

    p.x += dx;
    p.y += dy;
    // Clamp to table bounds
    p.x = Math.max(-0.9, Math.min(0.9, p.x));
    p.y = Math.max(-0.65, Math.min(0.65, p.y));
    p.group.position.x = p.x;
    p.group.position.z = TABLE_Z + p.y;
    if (p.hitEntity.object3D) {
      p.hitEntity.object3D.position.x = p.x;
      p.hitEntity.object3D.position.z = TABLE_Z + p.y;
    }
    this.moves++;
    this.checkSnap(idx);
    this.refreshVisuals();
  }

  rotatePiece(idx: number, dir: number) {
    if (idx < 0 || idx >= this.pieces.length) return;
    const p = this.pieces[idx];
    if (p.snapped) return;

    this.moveHistory.push({ pieceIdx: idx, fromX: p.x, fromY: p.y, fromRot: p.rot, fromFlip: p.flipped });
    p.rot += dir * ROT_STEP;
    p.group.rotation.z = p.rot;
    this.moves++;
    this.playSound('rotate');
    this.checkSnap(idx);
    this.refreshVisuals();
  }

  flipPiece(idx: number) {
    if (idx < 0 || idx >= this.pieces.length) return;
    const p = this.pieces[idx];
    if (p.snapped) return;
    if (p.type !== 'para') return;

    this.moveHistory.push({ pieceIdx: idx, fromX: p.x, fromY: p.y, fromRot: p.rot, fromFlip: p.flipped });
    p.flipped = !p.flipped;
    p.group.scale.x = p.flipped ? -1 : 1;
    this.moves++;
    this.playSound('rotate');
    this.checkSnap(idx);
    this.refreshVisuals();
  }

  undoMove() {
    if (this.moveHistory.length === 0) return;
    const last = this.moveHistory.pop()!;
    const p = this.pieces[last.pieceIdx];
    p.x = last.fromX;
    p.y = last.fromY;
    p.rot = last.fromRot;
    p.flipped = last.fromFlip;
    p.group.position.x = p.x;
    p.group.position.z = TABLE_Z + p.y;
    p.group.rotation.z = p.rot;
    p.group.scale.x = p.flipped ? -1 : 1;
    if (p.hitEntity.object3D) {
      p.hitEntity.object3D.position.x = p.x;
      p.hitEntity.object3D.position.z = TABLE_Z + p.y;
    }
    p.snapped = false;
    this.moves++;
    this.undoUsed = true;
    this.refreshVisuals();
  }

  normalizeAngle(a: number): number {
    let r = a % (Math.PI * 2);
    if (r < 0) r += Math.PI * 2;
    return r;
  }

  checkSnap(idx: number) {
    const p = this.pieces[idx];
    const dx = Math.abs(p.x - p.targetX);
    const dy = Math.abs(p.y - p.targetY);
    const da = Math.abs(this.normalizeAngle(p.rot) - this.normalizeAngle(p.targetRot));
    const daWrap = Math.min(da, Math.PI * 2 - da);
    const flipMatch = p.flipped === p.targetFlip;

    if (dx < SNAP_DIST && dy < SNAP_DIST && daWrap < SNAP_ANGLE && flipMatch) {
      const oldX = p.x, oldY = p.y, oldRot = p.rot;
      p.x = p.targetX;
      p.y = p.targetY;
      p.rot = p.targetRot;
      p.snapped = true;
      p.group.position.x = p.targetX;
      p.group.position.z = TABLE_Z + p.targetY;
      p.group.rotation.z = p.targetRot;
      if (p.hitEntity.object3D) {
        p.hitEntity.object3D.position.x = p.targetX;
        p.hitEntity.object3D.position.z = TABLE_Z + p.targetY;
      }
      this.playSound('snap');
      this.spawnSnapBurst(p.targetX, TABLE_Z + p.targetY, idx);
      // Auto-select next unsnapped piece
      if (!this.isSolved()) {
        let next = (idx + 1) % this.pieces.length;
        let tries = 0;
        while (tries < 7 && this.pieces[next].snapped) {
          next = (next + 1) % this.pieces.length;
          tries++;
        }
        if (!this.pieces[next].snapped) {
          this.selectedPiece = next;
        }
      }
      if (this.isSolved()) this.onWin();
    }
  }

  isSolved(): boolean {
    return this.pieces.length === 7 && this.pieces.every(p => p.snapped);
  }

  onWin() {
    this.state = 'won';
    this.winStreak++;
    this.totalWins++;
    this.save.totalSolves = (this.save.totalSolves || 0) + 1;
    this.save.totalPlayTime = (this.save.totalPlayTime || 0) + this.timer;
    const key = `${this.mode}-${this.difficulty}-${this.level}`;
    if (!this.save.bestMoves[key] || this.moves < this.save.bestMoves[key]) this.save.bestMoves[key] = this.moves;
    if (!this.save.bestTimes[key] || this.timer < this.save.bestTimes[key]) this.save.bestTimes[key] = this.timer;
    this.modesWon.add(this.mode);
    this.checkAch('first_solve');
    if (this.difficulty === 'easy') this.checkAch('easy_clear');
    if (this.difficulty === 'medium') this.checkAch('medium_clear');
    if (this.difficulty === 'hard') this.checkAch('hard_clear');
    if (this.mode === 'speed') this.checkAch('speed_win');
    if (this.mode === 'zen') this.checkAch('zen_clear');
    if (this.mode === 'challenge') this.checkAch('challenge_win');
    if (!this.undoUsed) this.checkAch('no_undo');
    if (this.moves < 20) this.checkAch('under_20');
    if (this.moves < 10) this.checkAch('under_10');
    if (this.winStreak >= 3) this.checkAch('streak_3');
    if (this.winStreak >= 5) this.checkAch('streak_5');
    if (this.winStreak >= 10) this.checkAch('streak_10');
    if (this.timer < 60) this.checkAch('fast_60');
    if (this.timer < 30) this.checkAch('fast_30');
    if (this.modesWon.size >= 4) this.checkAch('all_modes');
    if (this.totalWins >= 50) this.checkAch('total_50');
    for (const d of ['easy', 'medium', 'hard'] as Difficulty[]) {
      let all = true;
      for (let l = 1; l <= 5; l++) if (!this.save.bestMoves[`${this.mode}-${d}-${l}`]) { all = false; break; }
      if (all) this.checkAch(`all_${d}`);
    }
    saveSave(this.save);
    this.playSound('win');
    this.spawnCelebration();
    this.onStateChange?.();
  }

  onLose() {
    this.state = 'won';
    this.winStreak = 0;
    this.onStateChange?.();
  }

  checkAch(id: string) {
    if (!this.save.achievements[id]) {
      this.save.achievements[id] = true;
      saveSave(this.save);
    }
  }

  getPuzzleName(): string {
    const puzzles = PUZZLES[this.difficulty];
    const puzzle = puzzles[(this.level - 1) % puzzles.length];
    return puzzle?.name || `Level ${this.level}`;
  }

  getPuzzleCount(diff: Difficulty): number {
    return PUZZLES[diff].length;
  }

  getStars(): number {
    if (this.moves <= 10) return 3;
    if (this.moves <= 25) return 2;
    return 1;
  }

  handlePieceClick(idx: number) {
    if (this.state !== 'playing') return;
    if (this.selectedPiece === idx) {
      this.selectedPiece = -1;
    } else {
      this.selectedPiece = idx;
      this.playSound('select');
    }
    this.refreshVisuals();
  }

  startGame(mode: GameMode, difficulty: Difficulty, level: number) {
    this.mode = mode;
    this.difficulty = difficulty;
    this.level = level;
    this.state = 'playing';
    this.generatePuzzle();
    this.onStateChange?.();
  }

  update(delta: number) {
    // Animate hint
    if (this.hintActive) {
      this.hintTimer += delta;
      for (const hm of this.hintTargetMeshes) {
        const mat = hm.material as MeshStandardMaterial;
        mat.opacity = Math.max(0, 0.5 * (1 - this.hintTimer / 2));
        mat.emissiveIntensity = 1.0 + Math.sin(this.hintTimer * 8) * 0.5;
      }
      if (this.hintTimer > 2) {
        this.clearHintMeshes();
      }
    }

    // Animate snap transitions
    for (let i = this.snapAnims.length - 1; i >= 0; i--) {
      const sa = this.snapAnims[i];
      sa.progress += delta * 5;
      if (sa.progress >= 1) {
        this.snapAnims.splice(i, 1);
      }
    }

    // Animate celebration particles
    if (this.celebParticles.length > 0) {
      this.winTimer += delta;
      for (let i = this.celebParticles.length - 1; i >= 0; i--) {
        const cp = this.celebParticles[i];
        cp.life -= delta;
        cp.mesh.position.x += cp.vx * delta;
        cp.mesh.position.y += cp.vy * delta;
        cp.mesh.position.z += cp.vz * delta;
        cp.vy -= 2 * delta; // gravity
        const mat = cp.mesh.material as MeshStandardMaterial;
        mat.opacity = Math.max(0, cp.life / 2);
        if (cp.life <= 0) {
          this.world.scene.remove(cp.mesh);
          this.celebParticles.splice(i, 1);
        }
      }
    }

    if (this.state === 'playing') {
      if (this.mode !== 'zen') this.timer += delta;
      if (this.mode === 'speed' && this.timer >= 120) { this.onLose(); return; }
      if (this.mode === 'challenge' && this.moveLimit > 0 && this.moves >= this.moveLimit) { this.onLose(); return; }

      // Keyboard input
      const kb = this.input?.keyboard;
      if (kb) {
        if (this.selectedPiece >= 0) {
          if (kb.getKeyDown('ArrowLeft') || kb.getKeyDown('KeyA')) this.movePiece(this.selectedPiece, -MOVE_STEP, 0);
          if (kb.getKeyDown('ArrowRight') || kb.getKeyDown('KeyD')) this.movePiece(this.selectedPiece, MOVE_STEP, 0);
          if (kb.getKeyDown('ArrowUp') || kb.getKeyDown('KeyW')) this.movePiece(this.selectedPiece, 0, -MOVE_STEP);
          if (kb.getKeyDown('ArrowDown') || kb.getKeyDown('KeyS')) this.movePiece(this.selectedPiece, 0, MOVE_STEP);
          if (kb.getKeyDown('KeyQ')) this.rotatePiece(this.selectedPiece, 1);
          if (kb.getKeyDown('KeyE')) this.rotatePiece(this.selectedPiece, -1);
          if (kb.getKeyDown('KeyF')) this.flipPiece(this.selectedPiece);
        }
        if (kb.getKeyDown('Tab')) {
          // Cycle to next non-snapped piece
          let next = (this.selectedPiece + 1) % this.pieces.length;
          let tries = 0;
          while (tries < 7 && this.pieces[next].snapped) {
            next = (next + 1) % this.pieces.length;
            tries++;
          }
          this.selectedPiece = next;
          this.playSound('select');
          this.refreshVisuals();
        }
        if (kb.getKeyDown('KeyU') || kb.getKeyDown('KeyZ')) this.undoMove();
        if (kb.getKeyDown('KeyR')) this.startGame(this.mode, this.difficulty, this.level);
        if (kb.getKeyDown('Escape')) { this.state = 'paused'; this.onStateChange?.(); }
        if (kb.getKeyDown('KeyH')) this.showHint();
      }

      // XR controllers
      const right = this.input?.xr?.gamepads?.right;
      const left = this.input?.xr?.gamepads?.left;
      if (this.selectedPiece >= 0) {
        const stick = right?.getAxesValues(InputComponent.Thumbstick) || left?.getAxesValues(InputComponent.Thumbstick);
        if (stick) {
          if (Math.abs(stick.x) > 0.7 || Math.abs(stick.y) > 0.7) {
            if (!this.stickHeld) {
              this.stickHeld = true;
              if (Math.abs(stick.x) > Math.abs(stick.y)) {
                this.rotatePiece(this.selectedPiece, stick.x > 0 ? 1 : -1);
              } else {
                this.movePiece(this.selectedPiece, 0, stick.y > 0 ? MOVE_STEP : -MOVE_STEP);
              }
            }
          } else {
            this.stickHeld = false;
          }
        }
        if (right?.getButtonDown(InputComponent.A_Button) || left?.getButtonDown(InputComponent.X_Button)) {
          this.flipPiece(this.selectedPiece);
        }
      }
      if (right?.getButtonDown(InputComponent.B_Button) || left?.getButtonDown(InputComponent.Y_Button)) {
        this.state = 'paused';
        this.onStateChange?.();
      }

      // Ray interaction — piece click
      for (const entity of this.queries.pressed.entities) {
        if (!entity.hasComponent(Pressed)) continue;
        const obj = entity.object3D;
        if (obj?.userData?.pieceIdx !== undefined) {
          this.handlePieceClick(obj.userData.pieceIdx as number);
        }
      }

      // Hover feedback
      let hoveredPiece = -1;
      for (const entity of this.queries.hovered.entities) {
        if (!entity.hasComponent(Hovered)) continue;
        const obj = entity.object3D;
        if (obj?.userData?.pieceIdx !== undefined) {
          hoveredPiece = obj.userData.pieceIdx as number;
        }
      }
      if (hoveredPiece !== this.lastHovered) {
        this.lastHovered = hoveredPiece;
        // Update cursor hint on hover
        for (let i = 0; i < this.pieces.length; i++) {
          if (i === this.selectedPiece) continue;
          const mesh = this.pieces[i].group.children[0] as Mesh;
          if (mesh) {
            const mat = mesh.material as MeshStandardMaterial;
            if (i === hoveredPiece && !this.pieces[i].snapped) {
              mat.emissiveIntensity = 0.65;
              this.pieces[i].group.position.y = TABLE_Y + PIECE_DEPTH + 0.01;
            } else {
              mat.emissiveIntensity = this.pieces[i].snapped ? 0.7 : 0.5;
              this.pieces[i].group.position.y = TABLE_Y + PIECE_DEPTH;
            }
          }
        }
      }

      // Animate selection glow
      this.selGlow += delta * 3;
      if (this.selectedPiece >= 0 && this.selectedPiece < this.pieces.length) {
        const p = this.pieces[this.selectedPiece];
        const mesh = p.group.children[0] as Mesh;
        if (mesh) {
          const mat = mesh.material as MeshStandardMaterial;
          mat.emissiveIntensity = 0.6 + 0.3 * Math.sin(this.selGlow);
        }
      }

      // Subtle pulse on snapped pieces
      for (let i = 0; i < this.pieces.length; i++) {
        if (this.pieces[i].snapped && i !== this.selectedPiece) {
          const mesh = this.pieces[i].group.children[0] as Mesh;
          if (mesh) {
            const mat = mesh.material as MeshStandardMaterial;
            mat.emissiveIntensity = 0.6 + 0.1 * Math.sin(this.selGlow * 0.5 + i * 0.8);
          }
        }
      }
    } else if (this.state === 'paused') {
      const kb = this.input?.keyboard;
      if (kb?.getKeyDown('Escape')) { this.state = 'playing'; this.onStateChange?.(); }
    }
  }
}
