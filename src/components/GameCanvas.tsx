/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";
import {
  DifficultySettings,
  PlayerCharacter,
  ShotType,
  Bullet,
  GameItem,
  Particle,
  Bomb,
  SpellCard,
  GameStats,
} from "../types";
import { audio } from "./AudioEngine";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Shield, Heart, Zap, Sparkles, Award } from "lucide-react";

interface GameCanvasProps {
  settings: DifficultySettings;
  character: PlayerCharacter;
  shotType: ShotType;
  onGameStats: (stats: GameStats) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
}

// Boss Spell Card Definitions
const SPELL_CARDS: SpellCard[] = [
  {
    name: "葉符「薫風もみじおろし」",
    japaneseName: "楓の妖精 葉月 / Hazuki - Sprite of Autumn Foliage",
    bossHealthThreshold: 100,
    totalHealth: 1500,
    timeLimit: 35,
    patternId: "falling_leaves",
  },
  {
    name: "実符「瑞穂黄金の大稲穂」",
    japaneseName: "豊穣の守り手 結実 / Minori - Guardian of Golden Harvest",
    bossHealthThreshold: 85,
    totalHealth: 1800,
    timeLimit: 35,
    patternId: "sweet_sweet_potatoes",
  },
  {
    name: "厄呪「運命の紡ぎ車」",
    japaneseName: "厄災の絡繰 織姫 / Orihime - Puppet of Weeping Sorrows",
    bossHealthThreshold: 70,
    totalHealth: 2200,
    timeLimit: 40,
    patternId: "spinning_wheel",
  },
  {
    name: "流輝「霧海鳴門の大瀑布」",
    japaneseName: "潮流の龍姫 雫音 / Shizune - Dragon Princess of Tidal Vortexes",
    bossHealthThreshold: 55,
    totalHealth: 2500,
    timeLimit: 40,
    patternId: "kappa_pororoca",
  },
  {
    name: "星蹟「客星が瞬く神降ろしの夜」",
    japaneseName: "星詠みの風巫女 早夜 / Sayo - Oracle of Astral Gales",
    bossHealthThreshold: 35,
    totalHealth: 2800,
    timeLimit: 45,
    patternId: "guest_star",
  },
  {
    name: "神蹟「嵐呼ぶ御神座のマウンテン・オブ・ウィンド」",
    japaneseName: "神威なる嵐神 神楽 / Kagura - Sovereign of Majestic Destinies",
    bossHealthThreshold: 15,
    totalHealth: 3500,
    timeLimit: 50,
    patternId: "mountain_of_faith",
  },
];

export const GameCanvas: React.FC<GameCanvasProps> = ({
  settings,
  character,
  shotType,
  onGameStats,
  isMuted,
  onMuteToggle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core Game State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [gameState, setGameState] = useState<"ready" | "playing" | "paused" | "gameover" | "allclear">("ready");
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem("touhou_mof_high_score") || "1000000");
  });
  const [lives, setLives] = useState<number>(3);
  const [power, setPower] = useState<number>(4.00); // Standard starting power
  const [faith, setFaith] = useState<number>(50000); // Score multiplier
  const [faithGauge, setFaithGauge] = useState<number>(10000); // Decay bar
  const [graze, setGraze] = useState<number>(0);

  // Boss Sequence State
  const [bossIndex, setBossIndex] = useState<number>(0);
  const [bossHealth, setBossHealth] = useState<number>(1500);
  const [bossMaxHealth, setBossMaxHealth] = useState<number>(1500);
  const [spellTimer, setSpellTimer] = useState<number>(35);
  const [spellCaptured, setSpellCaptured] = useState<boolean>(true); // Remains true if not hit and not bombed

  // Track key actions inside ref to avoid re-renders
  const keysRef = useRef<Record<string, boolean>>({});
  const gameLoopRef = useRef<number | null>(null);

  // Entities Tracking Refs (avoiding state thrashing in 60fps loop)
  const playerRef = useRef({ x: 220, y: 500, vx: 0, vy: 0, width: 32, height: 48, speedNormal: 4.8, speedFocused: settings.playerFocusedSpeed || 2.2, shootCooldown: 0, invincibleFrames: 0 });
  const bossRef = useRef({ x: 220, y: 120, vx: 1.2, vy: 0, waveTimer: 0, angle: 0, moveTargetX: 220, moveCooldown: 60 });
  const playerBulletsRef = useRef<{ x: number; y: number; vx: number; vy: number; damage: number; color: string; width: number; height: number }[]>([]);
  const enemyBulletsRef = useRef<Bullet[]>([]);
  const itemsRef = useRef<GameItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const bombRef = useRef<Bomb>({ active: false, x: 0, y: 0, radius: 0, maxRadius: 280, duration: 0, maxDuration: 150, type: "reimu" });
  const scoreRef = useRef<number>(0);
  const faithRef = useRef<number>(50000);
  const faithGaugeRef = useRef<number>(10000);
  const livesRef = useRef<number>(3);
  const powerRef = useRef<number>(4.00);
  const grazeRef = useRef<number>(0);

  // Statistics sync
  useEffect(() => {
    scoreRef.current = currentScore;
    faithRef.current = faith;
    faithGaugeRef.current = faithGauge;
    livesRef.current = lives;
    powerRef.current = power;
    grazeRef.current = graze;

    onGameStats({
      score: currentScore,
      highScore: highScore,
      lives: lives,
      maxLives: 8,
      power: power,
      faith: faith,
      faithGauge: faithGauge,
      graze: graze,
    });
  }, [currentScore, highScore, lives, power, faith, faithGauge, graze]);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling defaults when playing
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyZ", "KeyX"].includes(e.code)) {
        e.preventDefault();
      }
      keysRef.current[e.code] = true;

      // Handle custom Bomb hotkey X
      if (e.code === "KeyX" && gameState === "playing") {
        triggerBomb();
      }

      // Handle pause using Escape or 'P'
      if ((e.code === "Escape" || e.code === "KeyP") && gameState === "playing") {
        pauseGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState, power, settings]);

  const initGame = () => {
    const defaultHp = SPELL_CARDS[0].totalHealth * settings.bossHpMultiplier;
    setBossIndex(0);
    setBossHealth(defaultHp);
    setBossMaxHealth(defaultHp);
    setSpellTimer(SPELL_CARDS[0].timeLimit);
    setSpellCaptured(true);

    setCurrentScore(0);
    setLives(3);
    setPower(4.00);
    setFaith(50000);
    setFaithGauge(10000);
    setGraze(0);

    // Sync refs
    scoreRef.current = 0;
    livesRef.current = 3;
    powerRef.current = 4.00;
    faithRef.current = 50000;
    faithGaugeRef.current = 10000;
    grazeRef.current = 0;

    playerRef.current = {
      x: 220,
      y: 500,
      vx: 0,
      vy: 0,
      width: 32,
      height: 48,
      speedNormal: 4.8,
      speedFocused: settings.playerFocusedSpeed || 2.2,
      shootCooldown: 0,
      invincibleFrames: 90, // Start with grace shield
    };

    bossRef.current = {
      x: 220,
      y: 120,
      vx: 1.2,
      vy: 0,
      waveTimer: 0,
      angle: 0,
      moveTargetX: 220,
      moveCooldown: 60,
    };

    playerBulletsRef.current = [];
    enemyBulletsRef.current = [];
    itemsRef.current = [];
    particlesRef.current = [];
    bombRef.current = { active: false, x: 0, y: 0, radius: 0, maxRadius: settings.bombCancelRadius, duration: 0, maxDuration: settings.bombInvincibilityDuration, type: character };

    setGameState("playing");
    setIsPlaying(true);
  };

  const pauseGame = () => {
    if (gameState === "playing") {
      setGameState("paused");
      setIsPlaying(false);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    }
  };

  const resumeGame = () => {
    if (gameState === "paused") {
      setGameState("playing");
      setIsPlaying(true);
    }
  };

  const triggerBomb = () => {
    if (bombRef.current.active) return; // Only 1 active bomb
    if (powerRef.current < settings.bombPowerCost) {
      // Power too low to trigger bomb
      audio.playEnemyHit(); // play error tone
      return;
    }

    // Trigger Reigeki!
    audio.playBomb();
    powerRef.current = Math.max(1.00, powerRef.current - settings.bombPowerCost);
    setPower(Math.max(1.00, powerRef.current));

    // Reset spell capture since bomb was used
    setSpellCaptured(false);

    bombRef.current = {
      active: true,
      x: playerRef.current.x,
      y: playerRef.current.y,
      radius: 20,
      maxRadius: settings.bombCancelRadius,
      duration: 0,
      maxDuration: settings.bombInvincibilityDuration,
      type: character,
    };

    // Trigger visual particles
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      particlesRef.current.push({
        x: playerRef.current.x,
        y: playerRef.current.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 5,
        color: character === "reimu" ? "rgba(255, 60, 60, 0.8)" : "rgba(255, 230, 80, 0.8)",
        life: 0,
        maxLife: 35 + Math.random() * 20,
        type: "spark",
      });
    }

    // Give player a brief invincibility
    playerRef.current.invincibleFrames = Math.max(playerRef.current.invincibleFrames, settings.bombInvincibilityDuration);
  };

  // Switch to next spellcard
  const advanceToNextBossPhase = () => {
    const nextIdx = bossIndex + 1;

    // Award bonus if captured!
    if (spellCaptured) {
      const captureBonus = Math.floor(spellTimer * 10000 * (1 + bossIndex * 0.5) * (faithRef.current / 50000));
      scoreRef.current += captureBonus;
      setCurrentScore(scoreRef.current);
      audio.playSpellCapture();

      // Spawn lots of items
      spawnItemExplosion(bossRef.current.x, bossRef.current.y, 10, "point_item");
      spawnItemExplosion(bossRef.current.x, bossRef.current.y, 5, "power_large");
      spawnItemExplosion(bossRef.current.x, bossRef.current.y, 6, "faith_item");

      // Flash success indicators or log
      displaySpellCaptureNotification(SPELL_CARDS[bossIndex].name);
    } else {
      // Basic clear bonus
      const basicBonus = 50000;
      scoreRef.current += basicBonus;
      setCurrentScore(scoreRef.current);
      audio.playCollect();
      spawnItemExplosion(bossRef.current.x, bossRef.current.y, 5, "point_item");
      spawnItemExplosion(bossRef.current.x, bossRef.current.y, 3, "power_small");
    }

    // Clear all enemy bullets and convert them into small green points/stars that fly to the player
    enemyBulletsRef.current.forEach((b) => {
      scoreRef.current += 100;
      particlesRef.current.push({
        x: b.x,
        y: b.y,
        vx: (playerRef.current.x - b.x) * 0.08,
        vy: (playerRef.current.y - b.y) * 0.08,
        radius: 2,
        color: "#10b981",
        life: 0,
        maxLife: 20,
        type: "petal",
      });
    });
    enemyBulletsRef.current = [];

    if (nextIdx < SPELL_CARDS.length) {
      setBossIndex(nextIdx);
      const nextHp = SPELL_CARDS[nextIdx].totalHealth * settings.bossHpMultiplier;
      setBossHealth(nextHp);
      setBossMaxHealth(nextHp);
      setSpellTimer(SPELL_CARDS[nextIdx].timeLimit);
      setSpellCaptured(true);
      bossRef.current.x = 220;
      bossRef.current.y = 120;
      playerRef.current.invincibleFrames = 120; // 2 sec safety buffer
      audio.playAlert();
    } else {
      // Finished all spellcards! Stage Cleared / Game Cleared
      setGameState("allclear");
      setIsPlaying(false);
      audio.playSpellCapture();

      // Check for High Score update
      if (scoreRef.current > highScore) {
        setHighScore(scoreRef.current);
        localStorage.setItem("touhou_mof_high_score", scoreRef.current.toString());
      }
    }
  };

  const handlePlayerDeath = () => {
    audio.playPlayerHit();

    // Visual bloom particles (beautiful circle ring of particles!)
    for (let i = 0; i < 50; i++) {
      const angle = (i / 50) * Math.PI * 2;
      const speed = 4 + Math.random() * 4;
      particlesRef.current.push({
        x: playerRef.current.x,
        y: playerRef.current.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 4,
        color: i % 2 === 0 ? "#f43f5e" : "#ffedd5",
        life: 0,
        maxLife: 50,
        type: "petal",
      });
    }

    // Lose a life, standard Touhou death penalty
    const nextLives = livesRef.current - 1;
    setLives(nextLives);
    livesRef.current = nextLives;

    // Reset spell captured flag
    setSpellCaptured(false);

    // Drop power items
    spawnItemExplosion(playerRef.current.x, playerRef.current.y, 4, "power_small");
    spawnItemExplosion(playerRef.current.x, playerRef.current.y, 2, "faith_item");

    // Reduce power slightly (MoF style - drops items, player respawns slightly weaker but recovers them)
    const nextPower = Math.max(1.00, powerRef.current - 0.50);
    setPower(nextPower);
    powerRef.current = nextPower;

    if (nextLives < 0) {
      // Game Over
      setGameState("gameover");
      setIsPlaying(false);

      if (scoreRef.current > highScore) {
        setHighScore(scoreRef.current);
        localStorage.setItem("touhou_mof_high_score", scoreRef.current.toString());
      }
    } else {
      // Respawn
      playerRef.current.x = 220;
      playerRef.current.y = 500;
      playerRef.current.invincibleFrames = 150; // Invincible frames during respawn
    }
  };

  // Bullet cancel explosion (converts bullets to cherry/point bonuses)
  const cancelBulletsInRadius = (cx: number, cy: number, r: number) => {
    let canceledCount = 0;
    enemyBulletsRef.current = enemyBulletsRef.current.filter((b) => {
      const dx = b.x - cx;
      const dy = b.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= r) {
        canceledCount++;
        // Spawn beautiful little cherry star particle going up
        particlesRef.current.push({
          x: b.x,
          y: b.y,
          vx: (Math.random() - 0.5) * 2,
          vy: -2 - Math.random() * 2,
          radius: 2 + Math.random() * 2,
          color: "rgba(255, 182, 193, 0.85)", // Sakura pink
          life: 0,
          maxLife: 25,
          type: "petal",
        });

        // Add small points and increase Faith slightly
        scoreRef.current += 10;
        faithRef.current += 2; // small faith increase on bullet cancellation
        return false;
      }
      return true;
    });

    if (canceledCount > 0) {
      // Trigger small reward noise
      audio.playEnemyHit();
    }
  };

  // Spawners
  const spawnItemExplosion = (x: number, y: number, count: number, forceType?: "power_small" | "power_large" | "faith_item" | "point_item") => {
    const types: ("power_small" | "power_large" | "faith_item" | "point_item" | "life_piece")[] = [
      "power_small", "point_item", "faith_item"
    ];

    for (let i = 0; i < count; i++) {
      const type = forceType || types[Math.floor(Math.random() * types.length)];
      itemsRef.current.push({
        id: Date.now() + Math.random(),
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vy: -1 - Math.random() * 2, // initially fly up, then fall
        type: type,
        autoCollecting: false,
      });
    }
  };

  const displaySpellCaptureNotification = (spellName: string) => {
    // Create short sparkle bursts centering on the screen
    for (let i = 0; i < 40; i++) {
      particlesRef.current.push({
        x: 220,
        y: 200,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        radius: 3 + Math.random() * 4,
        color: "#fbbf24",
        life: 0,
        maxLife: 45,
        type: "spark",
      });
    }
  };

  // Main Canvas Loop
  useEffect(() => {
    if (!isPlaying) return;

    let countdownFrameAccumulator = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const gameLoop = () => {
      // --- 1. COUNTDOWN AND TIMER UPDATES ---
      countdownFrameAccumulator++;
      if (countdownFrameAccumulator >= 60) {
        countdownFrameAccumulator = 0;
        setSpellTimer((prev) => {
          if (prev <= 1) {
            // Spell timeout! Force next spell card
            setSpellCaptured(false);
            advanceToNextBossPhase();
            return 35;
          }
          if (prev <= 6) {
            // Warning sound count
            audio.playAlert();
          }
          return prev - 1;
        });
      }

      // --- 2. PLAYER INTENT (INPUTS & MOTION) ---
      const activeKeys = keysRef.current;
      const isFocused = activeKeys["ShiftLeft"] || activeKeys["ShiftRight"];
      const currentSpeed = isFocused ? (settings.playerFocusedSpeed || playerRef.current.speedFocused) : playerRef.current.speedNormal;

      let dx = 0;
      let dy = 0;

      // Arrow keys & WASD keys
      if (activeKeys["ArrowUp"] || activeKeys["KeyW"]) dy -= 1;
      if (activeKeys["ArrowDown"] || activeKeys["KeyS"]) dy += 1;
      if (activeKeys["ArrowLeft"] || activeKeys["KeyA"]) dx -= 1;
      if (activeKeys["ArrowRight"] || activeKeys["KeyD"]) dx += 1;

      // Normalize diagonal vectors
      if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx = dx / length;
        dy = dy / length;
      }

      // Update positions with bounds constraints
      playerRef.current.x = Math.max(16, Math.min(440 - 16, playerRef.current.x + dx * currentSpeed));
      playerRef.current.y = Math.max(24, Math.min(560 - 24, playerRef.current.y + dy * currentSpeed));

      // --- 3. REIGEKI BOMB EVOLUTION ---
      if (bombRef.current.active) {
        bombRef.current.duration++;
        // Expand bomb circle
        const progress = bombRef.current.duration / bombRef.current.maxDuration;
        bombRef.current.radius = bombRef.current.maxRadius * Math.sin(progress * Math.PI * 0.5);

        // Cancel bullets in bomb radius
        cancelBulletsInRadius(bombRef.current.x, bombRef.current.y, bombRef.current.radius);

        // Deal constant heavy damage to boss if within vertical/horizontal range
        const distToBoss = Math.sqrt(
          Math.pow(bossRef.current.x - bombRef.current.x, 2) + Math.pow(bossRef.current.y - bombRef.current.y, 2)
        );
        if (distToBoss < bombRef.current.radius + 20) {
          setBossHealth((prev) => {
            const dmg = isFocused ? 22 : 14; // Bomb deals high damage
            const nextHp = prev - dmg;
            if (nextHp <= 0) {
              setTimeout(() => advanceToNextBossPhase(), 10);
              return 0;
            }
            return nextHp;
          });
        }

        if (bombRef.current.duration >= bombRef.current.maxDuration) {
          bombRef.current.active = false;
        }
      }

      // --- 4. PLAYER SHOOT ENGINE ---
      if (playerRef.current.shootCooldown > 0) {
        playerRef.current.shootCooldown--;
      }

      // Auto-shoot or manual hold Space / Z
      const wantsToShoot = activeKeys["Space"] || activeKeys["KeyZ"] || true; // Force autofire for easier web play, supported by manually holding Z for focused fires
      if (wantsToShoot && playerRef.current.shootCooldown === 0) {
        playerRef.current.shootCooldown = isFocused ? 5 : 6;

        // Sound representation
        if (countdownFrameAccumulator % 3 === 0) {
          if (shotType === "laser") {
            audio.playLaser();
          } else {
            audio.playShoot();
          }
        }

        const px = playerRef.current.x;
        const py = playerRef.current.y;

        // Custom shot patterns based on selected character and weapon configuration
        if (character === "reimu") {
          if (shotType === "homing") {
            // Homing Amulets (tracks boss)
            const targetX = bossRef.current.x;
            const targetY = bossRef.current.y;
            const angleToBoss1 = Math.atan2(targetY - (py - 10), targetX - (px - 12));
            const angleToBoss2 = Math.atan2(targetY - (py - 10), targetX - (px + 12));

            playerBulletsRef.current.push(
              { x: px - 8, y: py - 12, vx: 0, vy: -12, damage: 15, color: "rgba(255, 100, 100, 0.9)", width: 6, height: 16 },
              { x: px + 8, y: py - 12, vx: 0, vy: -12, damage: 15, color: "rgba(255, 100, 100, 0.9)", width: 6, height: 16 },
              { x: px - 18, y: py - 6, vx: Math.cos(angleToBoss1) * 10, vy: Math.sin(angleToBoss1) * 10, damage: 10, color: "rgba(255, 30, 30, 0.7)", width: 10, height: 10 },
              { x: px + 18, y: py - 6, vx: Math.cos(angleToBoss2) * 10, vy: Math.sin(angleToBoss2) * 10, damage: 10, color: "rgba(255, 30, 30, 0.7)", width: 10, height: 10 }
            );
          } else {
            // Forward Needles (needle / high straight focused fire)
            const spreadWidth = isFocused ? 6 : 14;
            playerBulletsRef.current.push(
              { x: px - spreadWidth, y: py - 16, vx: 0, vy: -16, damage: 22, color: "#ef4444", width: 4, height: 22 },
              { x: px, y: py - 20, vx: 0, vy: -16, damage: 26, color: "#f87171", width: 4, height: 22 },
              { x: px + spreadWidth, y: py - 16, vx: 0, vy: -16, damage: 22, color: "#ef4444", width: 4, height: 22 }
            );
          }
        } else {
          // Marisa
          if (shotType === "laser") {
            // Massive front pierce lasers
            playerBulletsRef.current.push(
              { x: px - 10, y: py - 15, vx: 0, vy: -18, damage: 32, color: "rgba(147, 51, 234, 0.85)", width: 8, height: 25 },
              { x: px + 10, y: py - 15, vx: 0, vy: -18, damage: 32, color: "rgba(147, 51, 234, 0.85)", width: 8, height: 25 }
            );
          } else {
            // Wide Star Spread
            const angleSpread = isFocused ? 0.08 : 0.35;
            playerBulletsRef.current.push(
              { x: px, y: py - 14, vx: 0, vy: -14, damage: 20, color: "#f59e0b", width: 8, height: 8 },
              { x: px - 12, y: py - 8, vx: -Math.sin(angleSpread) * 14, vy: -Math.cos(angleSpread) * 14, damage: 14, color: "#fbbf24", width: 8, height: 8 },
              { x: px + 12, y: py - 8, vx: Math.sin(angleSpread) * 14, vy: Math.cos(angleSpread) * 14, damage: 14, color: "#fbbf24", width: 8, height: 8 },
              { x: px - 24, y: py - 4, vx: -Math.sin(angleSpread * 2) * 12, vy: -Math.cos(angleSpread * 2) * 12, damage: 10, color: "#9333ea", width: 8, height: 8 },
              { x: px + 24, y: py - 4, vx: Math.sin(angleSpread * 2) * 12, vy: Math.cos(angleSpread * 2) * 12, damage: 10, color: "#9333ea", width: 8, height: 8 }
            );
          }
        }
      }

      // --- 5. ENEMY BOSS AI / SHOOTING MOTIONS ---
      bossRef.current.angle += 0.015;
      bossRef.current.waveTimer++;
      const wt = bossRef.current.waveTimer;

      // Intelligent wandering path finder
      bossRef.current.moveCooldown--;
      if (bossRef.current.moveCooldown <= 0) {
        // Find a new screen horizontal coordinate within comfortable bounds
        bossRef.current.moveTargetX = 100 + Math.random() * 240;
        bossRef.current.moveCooldown = 120 + Math.random() * 120;
      }

      const dxBoss = bossRef.current.moveTargetX - bossRef.current.x;
      bossRef.current.x += dxBoss * 0.03; // Smooth ease-to wander

      // Boss Shot Pattern Generator
      const patternId = SPELL_CARDS[bossIndex].patternId;
      const density = settings.bulletDensityMultiplier;
      const sMult = settings.bulletSpeedMultiplier;
      const baseTick = Math.max(8, Math.floor(45 / density)); // Scaling interval based on density settings
      const bx = bossRef.current.x;
      const by = bossRef.current.y;

      // 1. Periodic/Wave-based attack patterns (Lv.1 to Lv.4)
      if (bossRef.current.waveTimer % baseTick === 0) {
        if (patternId === "falling_leaves") {
          // Aki Shizuha - Two-way gorgeous Maple leaf spirals (Double Spiral)
          const leafSpoutCount = Math.floor(6 * density);
          // Right spiral
          const spinOffsetR = wt * 0.025;
          for (let i = 0; i < leafSpoutCount; i++) {
            const angle = (i / leafSpoutCount) * Math.PI * 2 + spinOffsetR;
            enemyBulletsRef.current.push({
              id: Math.random() + Date.now(),
              x: bx,
              y: by,
              vx: Math.cos(angle) * 2.1 * sMult,
              vy: Math.sin(angle) * 2.1 * sMult,
              radius: 6,
              color: "#f97316", // Orange
              type: "leaf",
              angle: angle,
              grazeCount: 0,
            });
          }
          // Left spiral
          const spinOffsetL = -wt * 0.021;
          for (let i = 0; i < leafSpoutCount; i++) {
            const angle = (i / leafSpoutCount) * Math.PI * 2 + spinOffsetL;
            enemyBulletsRef.current.push({
              id: Math.random() + Date.now() + 10,
              x: bx,
              y: by,
              vx: Math.cos(angle) * 1.8 * sMult,
              vy: Math.sin(angle) * 1.8 * sMult,
              radius: 5,
              color: "#eab308", // Golden Yellow
              type: "leaf",
              angle: angle,
              grazeCount: 0,
            });
          }

          // Direct target leaf occasionally to keep player moving!
          if (wt % 30 === 0) {
            const angleToPlayer = Math.atan2(playerRef.current.y - by, playerRef.current.x - bx);
            const numDirect = Math.max(1, Math.floor(2 * density));
            for (let j = 0; j < numDirect; j++) {
              const spreadAngle = angleToPlayer + (j - (numDirect - 1) / 2) * 0.15;
              enemyBulletsRef.current.push({
                id: Math.random() + Date.now() + 50,
                x: bx,
                y: by,
                vx: Math.cos(spreadAngle) * 3.4 * sMult,
                vy: Math.sin(spreadAngle) * 3.4 * sMult,
                radius: 7,
                color: "#ea580c", // Dark Orange targeting leaf
                type: "leaf",
                angle: spreadAngle,
                grazeCount: 0,
              });
            }
          }
        } else if (patternId === "sweet_sweet_potatoes") {
          // Aki Minoriko - Alternating expanding pulse ring, layered circle with direct targeted wind seeds
          const spouts = Math.floor(13 * density);
          const radialOffset = Math.sin(wt * 0.04) * 0.6;
          for (let i = 0; i < spouts; i++) {
            const angle = (i / spouts) * Math.PI * 2 + radialOffset;
            const speed = (2.1 + (wt % 3) * 0.75) * sMult;
            enemyBulletsRef.current.push({
              id: Math.random() + Date.now(),
              x: bx,
              y: by,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: 7,
              color: wt % 2 === 0 ? "#a855f7" : "#eab308", // Royal purple and sweet potato rich yellow
              type: "scale",
              angle: angle,
              grazeCount: 0,
            });
          }

          // Direct targeted 3-way high-speed potato seeds
          if (wt % 35 === 0) {
            const angleToPlayer = Math.atan2(playerRef.current.y - by, playerRef.current.x - bx);
            for (let j = -1; j <= 1; j++) {
              enemyBulletsRef.current.push({
                id: Math.random() + Date.now() + 100,
                x: bx,
                y: by,
                vx: Math.cos(angleToPlayer + j * 0.16) * 4.2 * sMult,
                vy: Math.sin(angleToPlayer + j * 0.16) * 4.2 * sMult,
                radius: 4,
                color: "#e11d48", // Crimson seeds
                type: "needle",
                angle: angleToPlayer + j * 0.16,
                grazeCount: 0,
              });
            }
          }
        } else if (patternId === "spinning_wheel") {
          // Hina Kagiyama - Bouncing spinning wheels (using Math.sin speeds) + random toxic mist orbs
          const streamCount = Math.floor(6 * density);
          const spinDir = wt * 0.085;
          const speedMod = 1.8 + Math.abs(Math.sin(wt * 0.02)) * 1.8; // Wave speed swing
          for (let i = 0; i < streamCount; i++) {
            const angle = (i / streamCount) * Math.PI * 2 + spinDir;
            enemyBulletsRef.current.push({
              id: Math.random() + Date.now(),
              x: bx,
              y: by,
              vx: Math.cos(angle) * speedMod * sMult,
              vy: Math.sin(angle) * speedMod * sMult,
              radius: 6,
              color: i % 2 === 0 ? "#10b981" : "#84cc16", // Toxic green layers
              type: "ring", // This will bounce off the walls in update block!
              angle: angle,
              grazeCount: 0,
            });
          }

          // Counter-spinning support wheel (thinner but fast)
          if (wt % 15 === 0) {
            const supSpouts = Math.floor(4 * density);
            const supSpin = -wt * 0.06;
            for (let i = 0; i < supSpouts; i++) {
              const angle = (i / supSpouts) * Math.PI * 2 + supSpin;
              enemyBulletsRef.current.push({
                id: Math.random() + Date.now() + 200,
                x: bx,
                y: by,
                vx: Math.cos(angle) * 2.8 * sMult,
                vy: Math.sin(angle) * 2.8 * sMult,
                radius: 4.5,
                color: "#ca8a04", // Gold support spin
                type: "ring", // Also bounces!
                angle: angle,
                grazeCount: 0,
              });
            }
          }
        } else if (patternId === "kappa_pororoca") {
          // River Pororoca Waves of water bullets + downpouring overhead orbs
          const waveLines = Math.floor(12 * density);
          for (let i = 0; i < waveLines; i++) {
            const baseAngle = (i / waveLines) * Math.PI * 2 + Math.cos(wt * 0.04) * 0.55;
            const wSpeed = (2.2 + Math.sin(wt * 0.06 + i) * 0.6) * sMult;
            enemyBulletsRef.current.push({
              id: Math.random() + Date.now(),
              x: bx,
              y: by,
              vx: Math.cos(baseAngle) * wSpeed,
              vy: Math.sin(baseAngle) * wSpeed,
              radius: 6,
              color: "#3b82f6", // River blue orbs
              type: "orb",
              angle: baseAngle,
              grazeCount: 0,
            });
          }

          // Constantly dripping ambient storm water droplets from the clouds
          if (wt % 6 === 0) {
            const dropletX = Math.random() * 440;
            enemyBulletsRef.current.push({
              id: Math.random() + Date.now() + 300,
              x: dropletX,
              y: 0,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (2.8 + Math.random() * 2.2) * sMult,
              radius: 4,
              color: "rgba(59, 130, 246, 0.65)", // Semitransparent falling rain orbs
              type: "orb",
              angle: Math.PI / 2,
              grazeCount: 0,
            });
          }
        }
      }

      // Kappa direct targeting (also separate interval to behave consistently)
      if (patternId === "kappa_pororoca" && wt % 32 === 0) {
        const angleToPlayer = Math.atan2(playerRef.current.y - by, playerRef.current.x - bx);
        const count = 5;
        for (let j = -2; j <= 2; j++) {
          enemyBulletsRef.current.push({
            id: Math.random() + Date.now() + j,
            x: bx,
            y: by,
            vx: Math.cos(angleToPlayer + j * 0.10) * (4.5 * sMult),
            vy: Math.sin(angleToPlayer + j * 0.10) * (4.5 * sMult),
            radius: 4,
            color: "#06b6d4", // Cyan direct streams
            type: "needle",
            angle: angleToPlayer + j * 0.10,
            grazeCount: 0,
          });
        }
      }

      // 2. High-difficulty, constant/complex boss attack patterns (Lv.5 & Lv.6)
      if (patternId === "guest_star") {
        // Sanae's Miracle Stars (奇跡「客星の明るすぎる夜」)
        // Shoot more frequently relative to difficulty density settings
        const densityL5 = density * 0.9; // Scale down difficulty to 0.9x
        const fireInterval = Math.max(10, Math.floor(24 / densityL5));
        if (wt % fireInterval === 0) {
          // Launch multiple exploding stars simultaneously for beautiful criss-crossing stars
          const numStars = Math.max(1, Math.floor(2.0 * densityL5));
          for (let k = 0; k < numStars; k++) {
            const angle = Math.random() * Math.PI * 2;
            const targetX = 40 + Math.random() * 360;
            const targetY = 120 + Math.random() * 220;
            const travelTime = 40 + Math.floor(Math.random() * 20); // 40 to 60 frames to travel to source

            // Mark exploding position with beautiful green magical smoke indicator
            particlesRef.current.push({
              x: targetX,
              y: targetY,
              vx: 0,
              vy: 0,
              radius: 35,
              color: "rgba(16, 185, 129, 0.3)",
              life: 0,
              maxLife: travelTime,
              type: "smoke",
            });

            // Delayed emitter logic inside bullet arrays (explode bullet!)
            enemyBulletsRef.current.push({
              id: Math.random() + Date.now() + k,
              x: bx,
              y: by,
              vx: (targetX - bx) / travelTime,
              vy: (targetY - by) / travelTime,
              radius: 11,
              color: "#10b981", // Emerald exploding star
              type: "star",
              angle: angle,
              grazeCount: 0,
              damage: -travelTime, // Use negative count for explosion delay!
            });
          }
        }

        // Add additional direct star shoots to coerce the player!
        if (wt % 30 === 0) {
          const angleToPlayer = Math.atan2(playerRef.current.y - by, playerRef.current.x - bx);
          const starShotCount = Math.floor(4 * densityL5);
          for (let i = 0; i < starShotCount; i++) {
            const spreadAngle = angleToPlayer + (i - (starShotCount - 1) / 2) * 0.18;
            enemyBulletsRef.current.push({
              id: Math.random() + Date.now() + 500 + i,
              x: bx,
              y: by,
              vx: Math.cos(spreadAngle) * 3.8 * sMult,
              vy: Math.sin(spreadAngle) * 3.8 * sMult,
              radius: 6,
              color: "#34d399", // bright neon emerald
              type: "scale", // Use scale type for safety (prevents star-type double checks)
              angle: spreadAngle,
              grazeCount: 0,
            });
          }
        }
      } else if (patternId === "mountain_of_faith") {
        // Kanako's Epic Final Spell "Mountain of Faith" (神徳「マウンテン・オブ・フェイス」)
        // Let's make it epic, intense, and gorgeous! Level 6 should feel like a true final boss.
        const densityL6 = density * 0.9; // Scale down final boss difficulty to 0.9x

        // Spinning red/purple protective ring barriers (Frequent and beautiful expanding rings)
        const ringInterval = Math.max(10, Math.floor(16 / densityL6));
        if (wt % ringInterval === 0) {
          const ringCount = Math.floor(20 * densityL6);
          const spinOffset = wt * 0.04;
          for (let i = 0; i < ringCount; i++) {
            const angle = (i / ringCount) * Math.PI * 2 + spinOffset;
            enemyBulletsRef.current.push({
              id: Math.random() + Date.now(),
              x: bx,
              y: by,
              vx: Math.cos(angle) * 1.8 * sMult,
              vy: Math.sin(angle) * 1.8 * sMult,
              radius: 7,
              color: i % 2 === 0 ? "#dc2626" : "#7c3aed", // Rich Red & Purple
              type: "ring",
              angle: angle,
              grazeCount: 0,
            });
          }
        }

        // Fast spirals for a real challenge!
        const spiralInterval = Math.max(6, Math.floor(10 / densityL6));
        if (wt % spiralInterval === 0) {
          const spiralCount = Math.floor(4 * densityL6);
          const baseOffset = wt * 0.07;
          for (let i = 0; i < spiralCount; i++) {
            const angle = (i / spiralCount) * Math.PI * 2 + baseOffset;
            enemyBulletsRef.current.push({
              id: Math.random() + Date.now(),
              x: bx,
              y: by,
              vx: Math.cos(angle) * 3.4 * sMult,
              vy: Math.sin(angle) * 3.4 * sMult,
              radius: 5,
              color: "#ec4899", // Neon pink stars/needles spiraling out
              type: "needle",
              angle: angle,
              grazeCount: 0,
            });
          }
        }

        // Falling golden rain (glorious sacred Wind/Amulet rain from top of screen)
        const rainInterval = Math.max(4, Math.floor(8 / densityL6));
        if (wt % rainInterval === 0) {
          const cols = Math.floor(6 * densityL6);
          for (let i = 0; i < cols; i++) {
            const rx = Math.random() * 440;
            enemyBulletsRef.current.push({
              id: Math.random() + Date.now(),
              x: rx,
              y: 0,
              vx: (Math.random() - 0.5) * 1.2,
              vy: (3.2 + Math.random() * 2.2) * sMult,
              radius: 5,
              color: "#f59e0b", // Golden amulets
              type: "amulet",
              angle: Math.PI / 2,
              grazeCount: 0,
            });
          }
        }
      }

      // --- 6. PHYSICS EVOLUTION & ENTITIES LOGIC ---

      // Bullet Physics
      playerBulletsRef.current = playerBulletsRef.current.filter((b) => {
        b.x += b.vx;
        b.y += b.vy;

        // Check bounding box first
        if (b.y < -30 || b.y > 590 || b.x < -30 || b.x > 470) {
          return false;
        }

        // Check boss collision
        const dx = b.x - bossRef.current.x;
        const dy = b.y - bossRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40) { // Boss bounding hitbox is 40px
          // Inflict damage
          setBossHealth((prev) => {
            const nextHp = prev - b.damage;
            if (nextHp <= 0) {
              // Advance safely asynchronously to prevent double triggers
              setTimeout(() => advanceToNextBossPhase(), 10);
              return 0;
            }
            return nextHp;
          });

          // Add simple score
          scoreRef.current += 10;

          // Sound effect occasionally
          if (Math.random() < 0.25) {
            audio.playEnemyHit();
          }

          // Spawn sparkle smoke particle
          particlesRef.current.push({
            x: b.x,
            y: b.y,
            vx: (Math.random() - 0.5) * 4,
            vy: -1 - Math.random() * 2,
            radius: 2,
            color: b.color,
            life: 0,
            maxLife: 15,
            type: "spark",
          });

          return false;
        }

        return true;
      });

      // Enemy Bullets Physics
      const newExplodedBullets: Bullet[] = [];
      enemyBulletsRef.current = enemyBulletsRef.current.filter((b) => {
        b.x += b.vx;
        b.y += b.vy;

        // Lv.3 Hina / Orihime special: Spinning wheel rings bounce off walls!
        if (patternId === "spinning_wheel" && b.type === "ring") {
          if (b.x < 12 && b.vx < 0) {
            b.vx = -b.vx;
            b.angle = Math.atan2(b.vy, b.vx);
          } else if (b.x > 428 && b.vx > 0) {
            b.vx = -b.vx;
            b.angle = Math.atan2(b.vy, b.vx);
          }
        }

        // Sanae's special Star Exploding bullet triggers
        if (b.damage !== undefined && b.damage < 0 && b.type === "star") {
          b.damage++; // counting up towards 0 (explosion event)

          // Spawn star trails particles occasionally to look spectacular!
          if (Math.random() < 0.45) {
            particlesRef.current.push({
              x: b.x,
              y: b.y,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5,
              radius: 1.5 + Math.random() * 2,
              color: "rgba(52, 211, 153, 0.5)", // soft glowing green trail
              life: 0,
              maxLife: 15,
              type: "petal",
            });
          }

          if (b.damage === 0) {
            // Burst! Trigger exploding audio and spawn starburst rings
            audio.playEnemyHit();
            const starburstRays = Math.floor(18 * settings.bulletDensityMultiplier * 0.9); // Scale burst down to 0.9x too
            for (let i = 0; i < starburstRays; i++) {
              const angle = (i / starburstRays) * Math.PI * 2;
              const spd = (1.6 + Math.random() * 2.4) * settings.bulletSpeedMultiplier;
              newExplodedBullets.push({
                id: Math.random() + Date.now() + i * 0.001,
                x: b.x,
                y: b.y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                radius: 5,
                color: "#10b981", // Jade green stars
                type: "scale", // Use scale type for safety so they don't trigger damage checks again!
                angle: angle,
                grazeCount: 0,
              });
            }
            return false; // delete trigger bullet
          }
        }

        // Hit player check (grazing & actual hit box collision)
        const dx = b.x - playerRef.current.x;
        const dy = b.y - playerRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Invincibility check
        if (playerRef.current.invincibleFrames > 0) {
          // Bullets dissolve easily near invincible shield
          if (dist < 42) {
            particlesRef.current.push({
              x: b.x,
              y: b.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              radius: 2,
              color: b.color,
              life: 0,
              maxLife: 15,
              type: "petal",
            });
            scoreRef.current += 100;
            return false;
          }
        } else {
          // Gravitational or Grazing check:
          // A graze triggers if bullet gets within 16 pixels but doesn't collide with core hitbox
          if (dist < 18 && b.grazeCount === 0) {
            b.grazeCount = 1; // max 1 graze per bullet
            grazeRef.current += 1;
            setGraze(grazeRef.current);

            // Faith gauge increases, up to maximum 10000
            faithGaugeRef.current = Math.min(10000, faithGaugeRef.current + 1200);
            setFaithGauge(faithGaugeRef.current);

            scoreRef.current += Math.floor(faithRef.current * 0.1); // graze yields score proportional to Faith!
            setCurrentScore(scoreRef.current);

            audio.playGraze();

            // Graze sparkles
            for (let i = 0; i < 4; i++) {
              particlesRef.current.push({
                x: playerRef.current.x,
                y: playerRef.current.y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                radius: 1.5,
                color: "#38bdf8",
                life: 0,
                maxLife: 12,
                type: "spark",
              });
            }
          }

          // Core Hitbox Collision
          if (dist < settings.playerHitboxRadius) {
            handlePlayerDeath();
            return false;
          }
        }

        // Out of bounds cleanup
        if (b.y < -40 || b.y > 600 || b.x < -40 || b.x > 480) {
          return false;
        }

        return true;
      });
      if (newExplodedBullets.length > 0) {
        enemyBulletsRef.current.push(...newExplodedBullets);
      }

      // Item Management & POC Auto Collection
      itemsRef.current = itemsRef.current.filter((item) => {
        // Fall speed physics
        item.vy = Math.min(5, item.vy + 0.08 * settings.itemFallSpeedMultiplier);
        item.y += item.vy;

        // Auto collect mechanism (POC trigger or magnet radius)
        const dx = item.x - playerRef.current.x;
        const dy = item.y - playerRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (playerRef.current.y < settings.autoCollectHeight || item.autoCollecting) {
          item.autoCollecting = true;
        } else if (dist < 55) { // Magnetic radius of items
          item.autoCollecting = true;
        }

        if (item.autoCollecting) {
          // Fly directly and rapidly towards player with magnetic pull
          const angle = Math.atan2(playerRef.current.y - item.y, playerRef.current.x - item.x);
          const pullSpeed = 7.5;
          item.x += Math.cos(angle) * pullSpeed;
          item.y += Math.sin(angle) * pullSpeed;
        }

        // Collecting touch detection
        if (dist < 15) {
          audio.playCollect();

          // Apply bonuses based on item type
          if (item.type === "power_small") {
            const nextP = Math.min(5.00, powerRef.current + 0.05);
            powerRef.current = nextP;
            setPower(nextP);
            scoreRef.current += 500;
          } else if (item.type === "power_large") {
            const nextP = Math.min(5.00, powerRef.current + 0.50);
            powerRef.current = nextP;
            setPower(nextP);
            scoreRef.current += 2000;
          } else if (item.type === "faith_item") {
            // Faith (score multiplier) items - **Core MoF feature!**
            faithRef.current += 100;
            setFaith(faithRef.current);
            // reset decay gauge to maximum
            faithGaugeRef.current = 10000;
            setFaithGauge(10000);
          } else if (item.type === "point_item") {
            // Point item - yields score proportional to current Faith factor!
            const pointValue = Math.floor(faithRef.current * (playerRef.current.y < settings.autoCollectHeight ? 1.0 : 0.4));
            scoreRef.current += pointValue;
          } else if (item.type === "life_piece") {
            const nextLives = Math.min(8, livesRef.current + 1);
            setLives(nextLives);
            livesRef.current = nextLives;
          }

          setCurrentScore(scoreRef.current);

          // Collect particle sparks
          for (let i = 0; i < 8; i++) {
            particlesRef.current.push({
              x: item.x,
              y: item.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              radius: 1.5,
              color: item.type === "faith_item" ? "#10b981" : item.type.includes("power") ? "#ef4444" : "#ffeb3b",
              life: 0,
              maxLife: 15,
              type: "spark",
            });
          }

          return false;
        }

        // Clean up out of bounds
        return item.y < 590;
      });

      // Faith Gauge Decay and Faith Value drop (The iconic Touhou 10 MoF faith gauge mechanics)
      // Faith gauge decays continuously except during boss death scenes or frames where items are gathered.
      if (gameState === "playing") {
        faithGaugeRef.current = Math.max(0, faithGaugeRef.current - 14); // speed of decay
        setFaithGauge(faithGaugeRef.current);

        if (faithGaugeRef.current <= 0) {
          // If gauge is flat, Faith slowly drops!
          faithRef.current = Math.max(10000, faithRef.current - 15);
          setFaith(faithRef.current);
        }
      }

      // Invincibility ticks down
      if (playerRef.current.invincibleFrames > 0) {
        playerRef.current.invincibleFrames--;
      }

      // Particle physics
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        return p.life < p.maxLife;
      });

      // --- 7. RENDERING STAGE ---
      ctx.clearRect(0, 0, 440, 560);

      // A. Starry Space Scrolling Cosmic Ground with glowing grid or foliage
      ctx.fillStyle = "#0c050d";
      ctx.fillRect(0, 0, 440, 560);

      const gridY = (wt * 1.5) % 40;
      ctx.strokeStyle = "rgba(75, 23, 40, 0.4)";
      ctx.lineWidth = 1;
      for (let y = gridY; y < 560; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(440, y);
        ctx.stroke();
      }
      for (let x = 0; x < 440; x += 45) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 560);
        ctx.stroke();
      }

      // Falling decorative background maple leaves for authentic Touhou 10 mountain vibes
      if (wt % 15 === 0) {
        particlesRef.current.push({
          x: Math.random() * 440,
          y: -10,
          vx: -0.5 + Math.random(),
          vy: 1 + Math.random() * 1.5,
          radius: 4 + Math.random() * 4,
          color: "rgba(220, 80, 20, 0.25)",
          life: 0,
          maxLife: 400,
          type: "leaf",
        });
      }

      // Render aesthetic background elements (like autumn leaves moving gently)
      particlesRef.current.forEach((p) => {
        if (p.type === "leaf" && p.maxLife > 100) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(wt * 0.015);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -p.radius);
          ctx.lineTo(p.radius, 0);
          ctx.lineTo(0, p.radius);
          ctx.lineTo(-p.radius, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      });

      // B. Point of Collection Auto Collect Line Indicator
      ctx.strokeStyle = "rgba(16, 185, 129, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, settings.autoCollectHeight);
      ctx.lineTo(440, settings.autoCollectHeight);
      ctx.stroke();
      ctx.setLineDash([]); // clear dash

      // Add "POC / ITEM COLLECT" label on top of the line
      ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
      ctx.font = "9px monospace";
      ctx.fillText("◄ POC: ITEM AUTO-COLLECT HEIGHT ►", 120, settings.autoCollectHeight - 4);

      // C. Boss magic rotating runes arrays (The spinning circular magical matrix behind boss)
      ctx.save();
      ctx.translate(bossRef.current.x, bossRef.current.y);
      ctx.rotate(-bossRef.current.angle * 0.6);
      ctx.strokeStyle = spellCaptured ? "rgba(235, 100, 100, 0.2)" : "rgba(168, 85, 247, 0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 55, 0, Math.PI * 2);
      ctx.stroke();

      // Draw rune markings around magic ring
      for (let i = 0; i < 8; i++) {
        const phi = (i / 8) * Math.PI * 2;
        ctx.fillStyle = "rgba(251, 191, 36, 0.25)";
        ctx.fillRect(Math.cos(phi) * 55 - 4, Math.sin(phi) * 55 - 4, 8, 8);
      }
      ctx.restore();

      // D. Draw Boss Character
      // Draw outer glowing halo
      ctx.fillStyle = "rgba(224, 242, 254, 0.2)";
      ctx.beginPath();
      ctx.arc(bossRef.current.x, bossRef.current.y, 18 + Math.sin(wt * 0.1) * 3, 0, Math.PI * 2);
      ctx.fill();

      // Render boss centerpiece - a stunning vector representation of a Touhou priestess/goddess:
      // Red robe (for Kanako/Hina) or blue (for Nitori)
      ctx.fillStyle = bossIndex % 2 === 0 ? "#b91c1c" : "#1d4ed8";
      ctx.beginPath();
      ctx.moveTo(bossRef.current.x, bossRef.current.y - 12);
      ctx.lineTo(bossRef.current.x + 18, bossRef.current.y + 20);
      ctx.lineTo(bossRef.current.x - 18, bossRef.current.y + 20);
      ctx.closePath();
      ctx.fill();

      // Boss hair / crown
      ctx.fillStyle = bossIndex === 0 || bossIndex === 1 ? "#f59e0b" : "#4ade80"; // Aki (blonde) or Sanae/Nitori (Green hair)
      ctx.beginPath();
      ctx.arc(bossRef.current.x, bossRef.current.y - 14, 8, 0, Math.PI * 2);
      ctx.fill();

      // Face
      ctx.fillStyle = "#ffedd5";
      ctx.beginPath();
      ctx.arc(bossRef.current.x, bossRef.current.y - 8, 7, 0, Math.PI * 2);
      ctx.fill();

      // E. Draw Player Bullets
      playerBulletsRef.current.forEach((b) => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
      });

      // F. Draw Enemy Bullets with high glow & high contrast center (Standard gorgeous Touhou styling!)
      enemyBulletsRef.current.forEach((b) => {
        // High visibility center-white, outer-colored bullet design
        ctx.beginPath();
        const rad = b.radius;
        ctx.arc(b.x, b.y, rad, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();

        // White core
        ctx.beginPath();
        ctx.arc(b.x, b.y, rad * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      });

      // G. Draw Falling Inventory Items
      itemsRef.current.forEach((item) => {
        ctx.save();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;

        if (item.type === "power_small" || item.type === "power_large") {
          // Power items drop: Crimson Red square containing 'P'
          ctx.fillStyle = "#dc2626";
          ctx.beginPath();
          ctx.rect(item.x - 7, item.y - 7, 14, 14);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9px monospace";
          ctx.fillText("P", item.x - 3, item.y + 3);
        } else if (item.type === "faith_item") {
          // Faith items: Beautiful emerald green hexagon with 'F' or Leaf shape
          ctx.fillStyle = "#059669";
          ctx.beginPath();
          ctx.moveTo(item.x, item.y - 8);
          ctx.lineTo(item.x + 7, item.y - 4);
          ctx.lineTo(item.x + 7, item.y + 4);
          ctx.lineTo(item.x, item.y + 8);
          ctx.lineTo(item.x - 7, item.y + 4);
          ctx.lineTo(item.x - 7, item.y - 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 8px monospace";
          ctx.fillText("★", item.x - 4, item.y + 3);
        } else if (item.type === "point_item") {
          // Point Items: Blue diamonds containing '点' / 'S'
          ctx.fillStyle = "#2563eb";
          ctx.beginPath();
          ctx.moveTo(item.x, item.y - 8);
          ctx.lineTo(item.x + 8, item.y);
          ctx.lineTo(item.x, item.y + 8);
          ctx.lineTo(item.x - 8, item.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 8px sans-serif";
          ctx.fillText("点", item.x - 4, item.y + 3);
        }
        ctx.restore();
      });

      // H. Draw Reigeki Bomb effects (expanding neon waves clearing bullets!)
      if (bombRef.current.active) {
        ctx.save();
        const grad = ctx.createRadialGradient(
          bombRef.current.x,
          bombRef.current.y,
          bombRef.current.radius * 0.4,
          bombRef.current.x,
          bombRef.current.y,
          bombRef.current.radius
        );
        if (bombRef.current.type === "reimu") {
          grad.addColorStop(0, "rgba(239, 68, 68, 0.05)");
          grad.addColorStop(0.7, "rgba(239, 68, 68, 0.3)");
          grad.addColorStop(1, "rgba(239, 68, 68, 0.7)");
        } else {
          grad.addColorStop(0, "rgba(147, 51, 234, 0.05)");
          grad.addColorStop(0.7, "rgba(224, 242, 254, 0.35)");
          grad.addColorStop(1, "rgba(147, 51, 234, 0.75)");
        }

        ctx.strokeStyle = bombRef.current.type === "reimu" ? "rgba(239, 68, 68, 0.85)" : "rgba(168, 85, 247, 0.9)";
        ctx.lineWidth = 4;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bombRef.current.x, bombRef.current.y, bombRef.current.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // I. Render Particles (Splashes, sparkles, and graze clicks)
      particlesRef.current.forEach((p) => {
        if (p.type !== "leaf" || p.maxLife <= 100) {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * (1 - p.life / p.maxLife), 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // J. Draw Player Character
      const px = playerRef.current.x;
      const py = playerRef.current.y;

      ctx.save();
      // Draw a subtle blue player option / orbit spheres spinning if they have enough power (just like Touhou layout!)
      if (powerRef.current >= 2.00) {
        ctx.fillStyle = "rgba(244, 63, 94, 0.4)";
        const orbitsX = Math.sin(wt * 0.1) * 20;
        ctx.beginPath();
        ctx.arc(px - orbitsX, py - 6, 4, 0, Math.PI * 2);
        ctx.arc(px + orbitsX, py - 6, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Invincibility visual blinking shield
      if (playerRef.current.invincibleFrames > 0 && Math.floor(wt / 3) % 2 === 0) {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 20, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Render Reimu / Marisa sprite as beautiful vectors
      ctx.fillStyle = character === "reimu" ? "#e11d48" : "#7c3aed"; // Red shrine maiden vs Purple witch
      ctx.beginPath();
      ctx.moveTo(px, py - 18);
      ctx.lineTo(px + 12, py + 12);
      ctx.lineTo(px - 12, py + 12);
      ctx.closePath();
      ctx.fill();

      // White ribbon / trim
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(px - 8, py + 6);
      ctx.lineTo(px + 8, py + 6);
      ctx.lineTo(px + 4, py + 12);
      ctx.lineTo(px - 4, py + 12);
      ctx.closePath();
      ctx.fill();

      // Head
      ctx.fillStyle = "#ffedd5";
      ctx.beginPath();
      ctx.arc(px, py - 10, 5, 0, Math.PI * 2);
      ctx.fill();

      // Hair bow / Witch hat
      ctx.fillStyle = character === "reimu" ? "#9f1239" : "#1e1b4b"; // Dark red ribbon or dark purple hat
      ctx.beginPath();
      ctx.arc(px, py - 14, 3, 0, Math.PI * 2);
      ctx.fill();

      // K. Target Core Hitbox indicator - standard in Touhou games
      // Red dot rendered in the exact center of player sprite, highly useful for precise navigation
      // Explicitly requested in Touhou culture - ALWAYS drawn when holding Shift (Focus Mode) but always neat to trace
      if (isFocused || playerRef.current.invincibleFrames > 0) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(px, py, settings.playerHitboxRadius + 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      // L. Spellcard Health and timer HUD on top of screen
      // Boss Health Bar outline
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(30, 16, 380, 8);
      ctx.stroke();

      // Colored Boss Health fillings - shrinks dynamically!
      const healthPct = bossHealth / bossMaxHealth;
      ctx.fillStyle = healthPct > 0.35 ? "#34d399" : "#ef4444"; // Red alarm when very low health
      ctx.fillRect(31, 17, 378 * Math.max(0, healthPct), 6);

      // Spellcard name typography on top right
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.fillText(SPELL_CARDS[bossIndex].name, 260, 42);

      // Boss name indicator on top left
      ctx.fillStyle = "#ffd3d3";
      ctx.font = "bold 10px monospace";
      ctx.fillText(`Lv.${bossIndex + 1} ${SPELL_CARDS[bossIndex].japaneseName}`, 30, 40);

      // Spellcard Bonus Capture state indicator
      if (spellCaptured) {
        ctx.fillStyle = "#fbbf24";
        ctx.font = "9px monospace";
        ctx.fillText("★ SPELL CARD BONUS ACTIVE ★", 30, 52);
      } else {
        ctx.fillStyle = "rgba(156, 163, 175, 0.6)";
        ctx.font = "9px monospace";
        ctx.fillText("☄ BONUS FAILED", 30, 52);
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isPlaying, bossIndex, bossHealth, settings, character, shotType, spellCaptured]);

  return (
    <div id="game-arena-wrapper" className="flex flex-col items-center bg-[#180a0d] border-4 border-[#5a1215] p-3 rounded-xl shadow-2xl relative">
      
      {/* HUD status & controls */}
      <div className="w-full flex items-center justify-between px-2 mb-2 text-xs text-[#ffd3d3]">
        <div className="flex items-center gap-2">
          <span className="font-bold flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-yellow-400" />
            SCORE: <span className="font-mono text-white text-sm">{currentScore.toLocaleString()}</span>
          </span>
          <span className="opacity-60 text-[10px] hidden md:inline">
            HI: <span className="font-mono">{highScore.toLocaleString()}</span>
          </span>
        </div>

        {/* Spell timer counter circle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-red-950/55 px-2.5 py-1 rounded border border-red-900">
            <span className="text-[10px]">TIME:</span>
            <span className="font-mono text-sm font-bold text-red-400">{spellTimer}</span>
          </div>

          <button
            id="mute-toggle-btn"
            onClick={onMuteToggle}
            type="button"
            className="p-1.5 rounded bg-[#3c0f12] text-[#ffb8b8] hover:bg-red-900/60 transition"
            title={isMuted ? "Sound On" : "Mute Sound"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Actual Game view canvas frame */}
      <div className="relative border-2 border-[#801818] rounded bg-black overflow-hidden shadow-inner">
        <canvas
          id="touhou-game-canvas"
          ref={canvasRef}
          width={440}
          height={560}
          className="block max-w-full aspect-[11/14]"
        />

        {/* Ready Overlay */}
        {gameState === "ready" && (
          <div id="state-ready-overlay" className="absolute inset-0 bg-black/85 flex flex-col justify-center items-center text-center p-6 animate-fade-in">
            <h1 className="text-3xl font-extrabold tracking-widest text-[#f43f5e] mb-2 drop-shadow-[0_2px_8px_rgba(244,63,94,0.6)] font-sans">
              神蹟の風と星詠の巫女
            </h1>
            <p className="text-xs font-semibold text-[#ffd3d3] tracking-wider mb-6 font-mono">
              - Divine Winds & Oracle Storm -
            </p>

            <div className="bg-[#2a0e10] p-4 rounded-lg border border-red-900/40 text-left max-w-sm mb-8 space-y-2 text-xs text-[#f9dfdf]">
              <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 border-b border-red-900/30 pb-2">
                <div><strong>[W,A,S,D / 矢印]</strong> 移動</div>
                <div><strong>[Shift]</strong> 低速・判定表示</div>
                <div><strong>[X]</strong> 霊撃（ボム発動）</div>
                <div><strong>[Z / autofire]</strong> ショット</div>
              </div>
              <p className="leading-relaxed">
                🔮 <strong>ボムシステム：</strong>ボムアイテムはなく、
                パワーを <strong>{settings.bombPowerCost.toFixed(2)}</strong> 消費して霊撃を放ちます。
              </p>
              <p className="leading-relaxed">
                🍂 <strong>信仰システム：</strong>信仰アイテムを集めたり敵を倒すと、得点倍率の <strong>Faith（信仰）</strong> が蓄積されます。
              </p>
            </div>

            <button
              id="start-game-btn"
              onClick={initGame}
              className="py-3 px-8 text-sm md:text-base font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-950/50 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              Start Mission / スタート
            </button>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === "paused" && (
          <div id="state-paused-overlay" className="absolute inset-0 bg-black/80 flex flex-col justify-center items-center text-center p-6">
            <h2 className="text-2xl font-bold tracking-widest text-blue-400 mb-6 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
              PAUSED [一時停止中]
            </h2>
            <div className="flex gap-4">
              <button
                id="resume-btn"
                onClick={resumeGame}
                className="py-2.5 px-6 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded transition"
              >
                Resume / 再開
              </button>
              <button
                id="reset-from-paused-btn"
                onClick={initGame}
                className="py-2.5 px-6 text-sm font-bold bg-[#3a1a1f] hover:bg-red-900/40 text-red-300 border border-red-950 rounded transition"
              >
                Restart / 最初から
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === "gameover" && (
          <div id="state-gameover-overlay" className="absolute inset-0 bg-red-950/90 flex flex-col justify-center items-center text-center p-6">
            <h2 className="text-3xl font-extrabold tracking-widest text-red-500 mb-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]">
              GAME OVER
            </h2>
            <p className="text-xs text-red-300 mb-6 uppercase tracking-widest">満身創痍</p>
            <p className="text-sm text-gray-300 mb-8 font-mono">
              Final Score: <strong className="text-white">{currentScore.toLocaleString()}</strong>
            </p>
            <button
              id="restart-gameover-btn"
              onClick={initGame}
              className="py-3 px-8 font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg transition"
            >
              リトライ
            </button>
          </div>
        )}

        {/* All Clear Win Overlay */}
        {gameState === "allclear" && (
          <div id="state-allclear-overlay" className="absolute inset-0 bg-emerald-950/95 flex flex-col justify-center items-center text-center p-6">
            <span className="text-yellow-400 text-4xl animate-bounce">🏆</span>
            <h2 className="text-3xl font-extrabold tracking-widest text-yellow-300 mb-2 mt-4 drop-shadow-[0_0_12px_rgba(253,224,71,0.6)]">
              MISSION CLEARED!
            </h2>
            <p className="text-sm font-bold text-emerald-300 mb-2 tracking-widest">
              幻想郷の平和は守り抜かれた
            </p>
            <div className="bg-black/40 border border-emerald-900 p-4 rounded mb-8 max-w-sm text-xs font-mono text-left space-y-1.5 text-gray-300">
              <p>🎯 Score: <strong className="text-white">{currentScore.toLocaleString()}</strong></p>
              <p>🌸 Leftover Lives: <strong className="text-emerald-400">{lives} x 🌸</strong></p>
              <p>🔥 Final Power: <strong className="text-orange-400">{power.toFixed(2)} P</strong></p>
              <p>🔮 Faith Score: <strong className="text-green-400">{faith.toLocaleString()}</strong></p>
              <p>💫 Grazing index: <strong className="text-cyan-400">{graze} times</strong></p>
            </div>
            <button
              id="win-restart-btn"
              onClick={initGame}
              className="py-3 px-8 font-bold bg-yellow-500 hover:bg-yellow-400 text-black uppercase rounded-lg shadow-lg transition"
            >
              Replay / 再生試練へ
            </button>
          </div>
        )}
      </div>

      {/* Manual Controls Toolbar for easy gameplay */}
      <div className="w-full grid grid-cols-3 gap-2 mt-3">
        {gameState === "playing" ? (
          <button
            id="pause-active-btn"
            onClick={pauseGame}
            type="button"
            className="col-span-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold bg-[#331114] hover:bg-red-900/60 border border-red-950 rounded text-red-300 transition"
          >
            <Pause className="w-3.5 h-3.5" /> Pause
          </button>
        ) : (
          <button
            id="start-anyway-btn"
            disabled={gameState === "gameover" || gameState === "allclear"}
            onClick={resumeGame}
            type="button"
            className="col-span-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold bg-[#112d1c] hover:bg-emerald-900/60 disabled:opacity-40 border border-emerald-950 rounded text-emerald-400 transition"
          >
            <Play className="w-3.5 h-3.5" /> Continue
          </button>
        )}

        {/* Quick Trigger Bomb button */}
        <button
          id="quick-bomb-btn"
          onClick={triggerBomb}
          disabled={gameState !== "playing" || power < settings.bombPowerCost}
          type="button"
          className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-bold bg-purple-700 hover:bg-purple-600 disabled:bg-purple-950/40 disabled:text-purple-600 disabled:border-purple-950 border-2 border-purple-400 text-white rounded shadow-lg transition uppercase"
        >
          <Shield className="w-4 h-4 text-yellow-300 animate-pulse" /> Trigger Bomb (X) [霊撃発動]
        </button>
      </div>

      <div className="mt-2 text-[10px] text-zinc-500 font-mono text-center leading-tight">
        * Keyboard: arrows/WASD to fly, Shift to slow down, X to bomb, space is autoshot.
      </div>
    </div>
  );
};
