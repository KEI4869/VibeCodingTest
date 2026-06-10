export type DifficultyLevel = "easy" | "normal" | "hard" | "lunatic" | "custom";

export interface DifficultySettings {
  level: DifficultyLevel;
  bossHpMultiplier: number;
  bulletDensityMultiplier: number;
  bulletSpeedMultiplier: number;
  playerHitboxRadius: number; // in pixels
  bombPowerCost: number;       // standard is 1.00 power
  bombInvincibilityDuration: number; // in frames or ms
  bombCancelRadius: number;    // in pixels
  autoCollectHeight: number;   // height on Y axis (0 is top, e.g. 180 is upper 1/3)
  itemFallSpeedMultiplier: number;
  playerFocusedSpeed: number;   // moving speed during focus mode (slow movement)
}

export type ShotType = "homing" | "needle" | "laser" | "spread";
export type PlayerCharacter = "reimu" | "marisa";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}

export interface GameStats {
  score: number;
  highScore: number;
  lives: number;
  maxLives: number;
  power: number;     // 1.00 to 5.00
  faith: number;     // MoF's Faith point system
  faithGauge: number; // 0 to 10000, decays over time
  graze: number;     // Grazing bullets count
}

export type BulletType = "ring" | "scale" | "leaf" | "star" | "arrow" | "amulet" | "needle" | "laser" | "orb";

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  type: BulletType;
  angle: number;
  grazeCount: number; // max 1 graze per bullet
  damage?: number;
}

export type ItemType = "power_small" | "power_large" | "faith_item" | "point_item" | "life_piece";

export interface GameItem {
  id: number;
  x: number;
  y: number;
  vy: number;
  type: ItemType;
  autoCollecting: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  type: "smoke" | "petal" | "spark" | "shard" | "leaf";
}

export interface Bomb {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  duration: number; // current frame count
  maxDuration: number; // total frames
  type: "reimu" | "marisa";
}

export interface SpellCard {
  name: string;
  japaneseName: string;
  bossHealthThreshold: number; // boss health below which this card is activated
  totalHealth: number;
  timeLimit: number; // seconds
  patternId: string;
}
