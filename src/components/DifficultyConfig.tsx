/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { DifficultySettings, DifficultyLevel } from "../types";
import { Sliders, Shield, Heart, Zap, Crosshair, Award, Move } from "lucide-react";

interface DifficultyConfigProps {
  settings: DifficultySettings;
  onChange: (settings: DifficultySettings) => void;
}

export const PRESETS: Record<Exclude<DifficultyLevel, "custom">, DifficultySettings> = {
  easy: {
    level: "easy",
    bossHpMultiplier: 1.2,
    bulletDensityMultiplier: 0.8,
    bulletSpeedMultiplier: 0.6,
    playerHitboxRadius: 1.2,
    bombPowerCost: 1.0,
    bombInvincibilityDuration: 180, // 3 seconds at 60fps
    bombCancelRadius: 280,
    autoCollectHeight: 220, // Lower line, easier POC
    itemFallSpeedMultiplier: 0.8,
    playerFocusedSpeed: 2.2,
  },
  normal: {
    level: "normal",
    bossHpMultiplier: 2.0, // Doubled from 1.0
    bulletDensityMultiplier: 1.4, // Increased from 1.0 to 1.4 (around 1.4x)
    bulletSpeedMultiplier: 1.0,
    playerHitboxRadius: 1.8,
    bombPowerCost: 1.0,
    bombInvincibilityDuration: 150, // 2.5 seconds
    bombCancelRadius: 240,
    autoCollectHeight: 180,
    itemFallSpeedMultiplier: 1.0,
    playerFocusedSpeed: 2.2,
  },
  hard: {
    level: "hard",
    bossHpMultiplier: 2.8, // Doubled from 1.4
    bulletDensityMultiplier: 2.1, // Multiplied 1.5 by 1.4 = 2.1
    bulletSpeedMultiplier: 1.3,
    playerHitboxRadius: 2.2,
    bombPowerCost: 1.00,
    bombInvincibilityDuration: 120, // 2 seconds
    bombCancelRadius: 200,
    autoCollectHeight: 140, // Higher line, harder to autocollect
    itemFallSpeedMultiplier: 1.2,
    playerFocusedSpeed: 2.2,
  },
  lunatic: {
    level: "lunatic",
    bossHpMultiplier: 3.6, // Doubled from 1.8
    bulletDensityMultiplier: 2.9, // Multiplied 2.1 by ~1.4 = ~2.9
    bulletSpeedMultiplier: 1.6,
    playerHitboxRadius: 2.5,
    bombPowerCost: 1.00,
    bombInvincibilityDuration: 90, // 1.5 seconds
    bombCancelRadius: 160,
    autoCollectHeight: 100, // Very high POC line
    itemFallSpeedMultiplier: 1.4,
    playerFocusedSpeed: 2.2,
  },
};

export const DifficultyConfig: React.FC<DifficultyConfigProps> = ({ settings, onChange }) => {
  const selectPreset = (level: Exclude<DifficultyLevel, "custom">) => {
    onChange(PRESETS[level]);
  };

  const updateField = <K extends keyof DifficultySettings>(key: K, value: DifficultySettings[K]) => {
    onChange({
      ...settings,
      level: "custom",
      [key]: value,
    });
  };

  return (
    <div id="difficulty-config-panel" className="bg-[#1e1014] border-2 border-[#8b1c1c] rounded-lg p-5 text-[#f6eeee] shadow-xl font-sans">
      <div className="flex items-center gap-2 border-b-2 border-[#5a0c0c] pb-3 mb-4">
        <Sliders className="w-5 h-5 text-[#e51d1d]" />
        <h2 className="text-xl font-bold tracking-wider text-[#ffd3d3]">
          難易度・弾幕 調整システム (Difficulty & Danmaku Tuner)
        </h2>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-5 gap-2 mb-5">
        {(["easy", "normal", "hard", "lunatic"] as Exclude<DifficultyLevel, "custom">[]).map((level) => {
          const isSelected = settings.level === level;
          const label = {
            easy: "Easy / 易",
            normal: "Normal / 常",
            hard: "Hard / 難",
            lunatic: "Lunatic / 狂",
          }[level];
          const colorStyles = {
            easy: isSelected ? "bg-green-700 text-white border-green-400" : "bg-green-950/40 text-green-300 border-green-800",
            normal: isSelected ? "bg-blue-700 text-white border-blue-400" : "bg-blue-950/40 text-blue-300 border-blue-800",
            hard: isSelected ? "bg-orange-700 text-white border-orange-400" : "bg-orange-950/40 text-orange-300 border-orange-800",
            lunatic: isSelected ? "bg-red-700 text-white border-red-400" : "bg-red-950/40 text-red-300 border-red-800",
          }[level];

          return (
            <button
              id={`preset-btn-${level}`}
              key={level}
              onClick={() => selectPreset(level)}
              type="button"
              className={`py-2 px-1 text-xs md:text-sm font-semibold border-2 rounded transition-all duration-200 hover:brightness-125 ${colorStyles}`}
            >
              {label}
            </button>
          );
        })}

        <button
          id="preset-btn-custom"
          type="button"
          disabled
          className={`py-2 px-1 text-xs md:text-sm font-semibold border-2 rounded transition-all duration-200 ${
            settings.level === "custom"
              ? "bg-purple-700 text-white border-purple-400"
              : "bg-purple-950/20 text-purple-400 border-[#4a1c4a] opacity-50"
          }`}
        >
          Custom / 調
        </button>
      </div>

      {/* Parameter Sliders */}
      <div className="space-y-4 text-xs md:text-sm">
        {/* Boss HP Multiplier */}
        <div className="bg-[#2d1216] p-3 rounded border border-[#521115]">
          <div className="flex justify-between items-center mb-1">
            <span className="flex items-center gap-1.5 text-[#ffb0b0]" id="label-boss-hp">
              <Heart className="w-4 h-4 text-red-500" /> Boss HP (体力倍率):
            </span>
            <span className="font-mono text-[#ff4e4e] font-semibold">{settings.bossHpMultiplier.toFixed(1)}x</span>
          </div>
          <input
            id="input-boss-hp"
            type="range"
            min="0.3"
            max="5.0"
            step="0.1"
            value={settings.bossHpMultiplier}
            onChange={(e) => updateField("bossHpMultiplier", parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#401217] rounded-lg appearance-none cursor-pointer accent-red-500"
          />
          <p className="text-[10px] text-[#cca1a1] mt-1">ボスの最大HP。高いほどスペルカードの制限時間ギリギリの攻防が楽しめます。</p>
        </div>

        {/* Bullet Density */}
        <div className="bg-[#2d1216] p-3 rounded border border-[#521115]">
          <div className="flex justify-between items-center mb-1">
            <span className="flex items-center gap-1.5 text-[#ffb0b0]" id="label-bullet-density">
              <Award className="w-4 h-4 text-orange-400" /> Bullet Density (弾幕密度倍率):
            </span>
            <span className="font-mono text-[#ffa24e] font-semibold">{settings.bulletDensityMultiplier.toFixed(1)}x</span>
          </div>
          <input
            id="input-bullet-density"
            type="range"
            min="0.4"
            max="5.0"
            step="0.1"
            value={settings.bulletDensityMultiplier}
            onChange={(e) => updateField("bulletDensityMultiplier", parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#401217] rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <p className="text-[10px] text-[#cca1a1] mt-1">ボスが一度に射出する弾幕の密度。高いほど狂おしい超高密度弾幕に！</p>
        </div>

        {/* Bullet Speed */}
        <div className="bg-[#2d1216] p-3 rounded border border-[#521115]">
          <div className="flex justify-between items-center mb-1">
            <span className="flex items-center gap-1.5 text-[#ffb0b0]" id="label-bullet-speed">
              <Zap className="w-4 h-4 text-yellow-400" /> Bullet Speed (弾幕速度倍率):
            </span>
            <span className="font-mono text-[#ffeb4e] font-semibold">{settings.bulletSpeedMultiplier.toFixed(1)}x</span>
          </div>
          <input
            id="input-bullet-speed"
            type="range"
            min="0.4"
            max="2.5"
            step="0.1"
            value={settings.bulletSpeedMultiplier}
            onChange={(e) => updateField("bulletSpeedMultiplier", parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#401217] rounded-lg appearance-none cursor-pointer accent-yellow-400"
          />
          <p className="text-[10px] text-[#cca1a1] mt-1">敵弾の基本移動速度。1.5x以上は一瞬の判断ミスが被弾につながる高速弾幕となります。</p>
        </div>

        {/* Player Hitbox */}
        <div className="bg-[#2d1216] p-3 rounded border border-[#521115]">
          <div className="flex justify-between items-center mb-1">
            <span className="flex items-center gap-1.5 text-[#ffb0b0]" id="label-player-hitbox">
              <Crosshair className="w-4 h-4 text-blue-400" /> Player Hitbox Size (自機当たり判定):
            </span>
            <span className="font-mono text-[#4ebdff] font-semibold">{settings.playerHitboxRadius.toFixed(1)} px</span>
          </div>
          <input
            id="input-player-hitbox"
            type="range"
            min="0.8"
            max="4.0"
            step="0.2"
            value={settings.playerHitboxRadius}
            onChange={(e) => updateField("playerHitboxRadius", parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#401217] rounded-lg appearance-none cursor-pointer accent-blue-400"
          />
          <p className="text-[10px] text-[#cca1a1] mt-1">
            自機中央の被弾判定半径（赤ドット）。小さいほど狭い弾幕の隙間に「喰らいボム」「グレイズ」で入り込めます。
          </p>
        </div>

        {/* Bomb Power Cost */}
        <div className="bg-[#2d1216] p-3 rounded border border-[#521115]">
          <div className="flex justify-between items-center mb-1">
            <span className="flex items-center gap-1.5 text-[#ffb0b0]" id="label-bomb-cost">
              <Shield className="w-4 h-4 text-purple-400" /> Reigeki Bomb Cost (霊撃のパワー消費量):
            </span>
            <span className="font-mono text-[#e54eff] font-semibold">{settings.bombPowerCost.toFixed(2)} P</span>
          </div>
          <input
            id="input-bomb-cost"
            type="range"
            min="0.5"
            max="2.0"
            step="0.25"
            value={settings.bombPowerCost}
            onChange={(e) => updateField("bombPowerCost", parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#401217] rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <p className="text-[10px] text-[#cca1a1] mt-1">
            「霊撃ボム」（Xキー）発動時に消費するパワー量。**本作特有のシステム**（パワーを身代わりにして究極魔法（霊撃ボム）を発動）。
          </p>
        </div>

        {/* Item Auto Collect POC Height */}
        <div className="bg-[#2d1216] p-3 rounded border border-[#521115]">
          <div className="flex justify-between items-center mb-1">
            <span className="flex items-center gap-1.5 text-[#ffb0b0]" id="label-poc-height">
              <Zap className="w-4 h-4 text-emerald-400" /> POC Auto-Collect Line (上部回収高さ):
            </span>
            <span className="font-mono text-[#4effab] font-semibold">上部境界 Y={settings.autoCollectHeight}px</span>
          </div>
          <input
            id="input-poc-height"
            type="range"
            min="50"
            max="350"
            step="10"
            value={settings.autoCollectHeight}
            onChange={(e) => updateField("autoCollectHeight", parseInt(e.target.value))}
            className="w-full h-1.5 bg-[#401217] rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <p className="text-[10px] text-[#cca1a1] mt-1">
            自機がこの境界線より上にいくと、画面上の全アイテムが自動的に高速回収されます。
          </p>
        </div>

        {/* Player Focused Speed (低速移動速度) */}
        <div className="bg-[#2d1216] p-3 rounded border border-[#521115]">
          <div className="flex justify-between items-center mb-1">
            <span className="flex items-center gap-1.5 text-[#ffb0b0]" id="label-focused-speed">
              <Move className="w-4 h-4 text-sky-400" /> Focus Speed (低速移動速度):
            </span>
            <span className="font-mono text-[#38bdf8] font-semibold">{settings.playerFocusedSpeed.toFixed(1)} px/f</span>
          </div>
          <input
            id="input-focused-speed"
            type="range"
            min="0.8"
            max="4.0"
            step="0.1"
            value={settings.playerFocusedSpeed}
            onChange={(e) => updateField("playerFocusedSpeed", parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#401217] rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
          <p className="text-[10px] text-[#cca1a1] mt-1">
            Shiftキーを押している（低速移動・低速ショット）ときの自機移動速度。低いほど細かい回避がしやすくなります。
          </p>
        </div>
      </div>


    </div>
  );
};
