/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { PlayerCharacter, ShotType } from "../types";
import { Sparkles, Zap, Crosshair, Star } from "lucide-react";

interface CharacterSelectProps {
  selectedChar: PlayerCharacter;
  selectedShot: ShotType;
  onSelectChar: (char: PlayerCharacter) => void;
  onSelectShot: (shot: ShotType) => void;
}

export const CharacterSelect: React.FC<CharacterSelectProps> = ({
  selectedChar,
  selectedShot,
  onSelectChar,
  onSelectShot,
}) => {
  return (
    <div id="character-select" className="bg-[#101018] border-2 border-[#1e293b] rounded-lg p-5 text-gray-200 font-sans shadow-lg">
      <div className="flex items-center gap-2 border-b border-[#2e3b4e] pb-3 mb-4">
        <Sparkles className="w-5 h-5 text-yellow-400" />
        <h2 className="text-lg font-bold tracking-wider text-[#b4c6e4]">
          プレイヤー・装備 選択 (Select Character & Shot)
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Reimu Card */}
        <button
          id="char-btn-reimu"
          type="button"
          onClick={() => {
            onSelectChar("reimu");
            onSelectShot("homing"); // default shot type for reimu
          }}
          className={`p-4 rounded-lg border-2 text-left transition-all duration-200 hover:scale-[1.01] ${
            selectedChar === "reimu"
              ? "bg-[#290a0f] border-red-500 text-red-100"
              : "bg-[#14141c] border-slate-800 text-slate-400 opacity-60 hover:opacity-100"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-base">琴ノ葉 雫 / Shizuka</span>
            <span className="text-xs font-mono bg-[#ef4444]/20 text-[#f87171] px-1.5 py-0.5 rounded">Wind Shrine Maiden</span>
          </div>
          <p className="text-xs mb-3 text-slate-300">
            性能：バランス的
          </p>
          <div className="text-[10px] text-pink-400 leading-tight">
            ★ 特徴: 敵の攻撃を回避しやすい
          </div>
        </button>

        {/* Marisa Card */}
        <button
          id="char-btn-marisa"
          type="button"
          onClick={() => {
            onSelectChar("marisa");
            onSelectShot("laser"); // default shot type for marisa
          }}
          className={`p-4 rounded-lg border-2 text-left transition-all duration-200 hover:scale-[1.01] ${
            selectedChar === "marisa"
              ? "bg-[#181024] border-purple-500 text-purple-100"
              : "bg-[#14141c] border-slate-800 text-slate-400 opacity-60 hover:opacity-100"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-base">朝霧 雷火 / Raika</span>
            <span className="text-xs font-mono bg-[#a855f7]/20 text-[#c084fc] px-1.5 py-0.5 rounded">Celestial Alchemist</span>
          </div>
          <p className="text-xs mb-3 text-slate-300">
            特徴：火力が高い
          </p>
          <div className="text-[10px] text-purple-400 leading-tight">
            ★ 特徴: パワー特化
          </div>
        </button>
      </div>

      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
        <Crosshair className="w-3.5 h-3.5" /> 装備タイプ / Weapon Type
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {selectedChar === "reimu" ? (
          <>
            {/* Reimu Shot A */}
            <button
              id="shot-btn-homing"
              type="button"
              onClick={() => onSelectShot("homing")}
              className={`p-3 rounded border text-xs text-left transition-all ${
                selectedShot === "homing"
                  ? "bg-[#330f14] border-red-500/60 text-red-200"
                  : "bg-[#0b0b10] border-slate-900 text-slate-400 hover:brightness-125"
              }`}
            >
              <div className="font-semibold flex items-center gap-1 mb-1 text-[#f87171]">
                <Star className="w-3 h-3 text-red-400" />
                追尾お札 / Homing Leaves
              </div>
              <p className="text-[10px] text-slate-300 leading-snug">
                お札が敵を自動追尾。敵を狙い撃ちしつつ、回避に集中したい状況で有効的。
              </p>
            </button>

            {/* Reimu Shot B */}
            <button
              id="shot-btn-needle"
              type="button"
              onClick={() => onSelectShot("needle")}
              className={`p-3 rounded border text-xs text-left transition-all ${
                selectedShot === "needle"
                  ? "bg-[#330f14] border-red-500/60 text-red-200"
                  : "bg-[#0b0b10] border-slate-900 text-slate-400 hover:brightness-125"
              }`}
            >
              <div className="font-semibold flex items-center gap-1 mb-1 text-[#f87171]">
                <Zap className="w-3 h-3 text-red-400" />
                スピア / Gale Needles
              </div>
              <p className="text-[10px] text-slate-300 leading-snug">
                正面に高密度連射。命中範囲は狭い代わりに強大な破壊力を発揮。
              </p>
            </button>
          </>
        ) : (
          <>
            {/* Marisa Shot A */}
            <button
              id="shot-btn-laser"
              type="button"
              onClick={() => onSelectShot("laser")}
              className={`p-3 rounded border text-xs text-left transition-all ${
                selectedShot === "laser"
                  ? "bg-[#181124] border-purple-500/60 text-purple-200"
                  : "bg-[#0b0b10] border-slate-900 text-slate-400 hover:brightness-125"
              }`}
            >
              <div className="font-semibold flex items-center gap-1 mb-1 text-[#c084fc]">
                <Zap className="w-3 h-3 text-purple-400" />
                極光レイ / Astral Laser
              </div>
              <p className="text-[10px] text-slate-300 leading-snug">
                前方を一瞬で貫通する高エネルギーで、ボスを短時間で突破できる。
              </p>
            </button>

            {/* Marisa Shot B */}
            <button
              id="shot-btn-spread"
              type="button"
              onClick={() => onSelectShot("spread")}
              className={`p-3 rounded border text-xs text-left transition-all ${
                selectedShot === "spread"
                  ? "bg-[#181124] border-purple-500/60 text-purple-200"
                  : "bg-[#0b0b10] border-slate-900 text-slate-400 hover:brightness-125"
              }`}
            >
              <div className="font-semibold flex items-center gap-1 mb-1 text-[#c084fc]">
                <Star className="w-3 h-3 text-purple-400" />
                星群スプレッド / Nebula Spread
              </div>
              <p className="text-[10px] text-slate-300 leading-snug">
                放射状に無数のマナ星屑を撒き散らす。広範囲の敵を即座にカバーでき爽快感抜群。
              </p>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
