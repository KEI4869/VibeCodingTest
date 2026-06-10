/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { GameCanvas } from "./components/GameCanvas";
import { DifficultyConfig, PRESETS } from "./components/DifficultyConfig";
import { CharacterSelect } from "./components/CharacterSelect";
import { DifficultySettings, PlayerCharacter, ShotType, GameStats } from "./types";
import { audio } from "./components/AudioEngine";
import { Shield, Sparkles, Award, Heart, Zap, Crosshair, RefreshCw, Volume2, VolumeX, Flame } from "lucide-react";

export default function App() {
  const [character, setCharacter] = useState<PlayerCharacter>("reimu");
  const [shotType, setShotType] = useState<ShotType>("homing");
  const [isMuted, setIsMuted] = useState<boolean>(true); // Mute by default for general web environments
  const [settings, setSettings] = useState<DifficultySettings>(PRESETS.normal);

  // Sync isMuted state with our singleton AudioEngine
  useEffect(() => {
    audio.setMute(isMuted);
  }, [isMuted]);

  // Live Statistics state from game engine
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 1000000,
    lives: 3,
    maxLives: 8,
    power: 4.00,
    faith: 50000,
    faithGauge: 10000,
    graze: 0,
  });

  const handleCharChange = (char: PlayerCharacter) => {
    setCharacter(char);
    // sound feedback
    audio.playCollect();
  };

  const handleShotChange = (shot: ShotType) => {
    setShotType(shot);
    // sound feedback
    audio.playCollect();
  };

  const handleMuteToggle = () => {
    setIsMuted((prev) => !prev);
  };

  const handleDifficultyReset = () => {
    setSettings(PRESETS.normal);
    audio.playCollect();
  };

  return (
    <div className="min-h-screen bg-[#0d070a] bg-gradient-to-br from-[#0a0507] via-[#160a10] to-[#070408] text-gray-100 py-6 px-4 md:px-8 font-sans selection:bg-red-800 selection:text-white">
      {/* Absolute Beautiful Header */}
      <header className="max-w-6xl mx-auto mb-6 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#3b1218] pb-4">
        <div>
          <div className="flex items-center justify-center md:justify-start gap-2 text-rose-500 font-bold tracking-widest text-[#f43f5e] uppercase text-xs">
            <Flame className="w-4 h-4 text-[#e11d48]" /> Standard Bullet Hell Engine VS 10
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-wider text-[#ffd3d3] drop-shadow-[0_4px_12px_rgba(251,113,133,0.25)] mt-1">
            弾幕シューティングゲーム 
          </h1>
          <p className="text-xs text-rose-200/60 mt-1">
            パワーを集めて敵の攻撃を防ぐのボムを駆使し、神蹟の嵐を突破せよ！
          </p>
        </div>

        {/* Highscore Banner */}
        <div className="flex items-center justify-center gap-3 bg-[#240c11] border border-red-900/40 py-2 px-4 rounded-lg">
          <Award className="w-5 h-5 text-amber-400 animate-pulse" />
          <div className="text-left">
            <div className="text-[10px] text-rose-300 font-mono font-bold tracking-widest uppercase">ALL-TIME HIGH SCORE</div>
            <div className="font-mono text-lg font-extrabold text-[#ffffff]">{stats.highScore.toLocaleString()}</div>
          </div>
        </div>
      </header>

      {/* Main Grid Organizer */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Interactive Control Panel: Character, Shot & Granular Difficulty Tuner */}
        <div className="lg:col-span- così lg:col-span-5 space-y-6 flex flex-col justify-stretch">
          
          {/* Character Selector */}
          <CharacterSelect
            selectedChar={character}
            selectedShot={shotType}
            onSelectChar={handleCharChange}
            onSelectShot={handleShotChange}
          />

          {/* Difficulty Configuration */}
          <div className="relative">
            <div className="absolute top-4 right-4 flex items-center gap-1">
              <button
                id="reset-difficulty-btn"
                onClick={handleDifficultyReset}
                type="button"
                className="text-[10px] flex items-center gap-1 py-1 px-2 rounded bg-amber-950/40 text-amber-300 hover:bg-amber-900/40 border border-amber-950 transition"
              >
                <RefreshCw className="w-3 h-3" /> Preset Normal
              </button>
            </div>
            <DifficultyConfig
              settings={settings}
              onChange={(newSettings) => setSettings(newSettings)}
            />
          </div>

        </div>

        {/* Center / Right Column: The Core Shooting Sandbox View with Side HUD stats */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#14080b]/60 border border-red-950/20 p-4 rounded-xl shadow-inner backdrop-blur">
          
          {/* Left segment: Classic arcade Side Panel HUD (Renders beautifully alongside the Game canvas) */}
          <div className="md:col-span-4 flex flex-col gap-4 text-xs">
            
            {/* Status indicators */}
            <div className="bg-[#1c0c0f] border border-red-950 p-4 rounded-lg flex flex-col gap-3">
              <h3 className="font-bold tracking-wider text-[#ffd3d3] border-b border-red-950 pb-1 flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5 text-red-400" /> STATUS [状態]
              </h3>

              {/* Score display */}
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-400">SCORE [得点]</span>
                <span className="font-mono text-lg font-bold text-white leading-normal">
                  {stats.score.toLocaleString()}
                </span>
              </div>

              {/* Lives visualizer as Sakura Cherries */}
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-400">LIVES [残機]</span>
                <div className="flex gap-1 mt-1">
                  {stats.lives >= 0 ? (
                    Array.from({ length: Math.min(8, stats.lives) }).map((_, i) => (
                      <span id={`life-star-${i}`} key={i} className="text-rose-500 text-sm drop-shadow-[0_0_4px_rgba(244,63,94,0.6)]">🌸</span>
                    ))
                  ) : (
                    <span className="text-red-500 font-mono text-[10px]">⚠️ NO LIVES LEFT</span>
                  )}
                </div>
              </div>

              {/* Power level */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-400">POWER [霊力]</span>
                  <span className="font-mono text-orange-400 font-bold">{stats.power.toFixed(2)} / 5.00</span>
                </div>
                {/* Visual Power bar */}
                <div className="w-full h-1.5 bg-[#2d1216] rounded mt-1 overflow-hidden border border-red-950">
                  <div
                    className="h-full bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-100"
                    style={{ width: `${(stats.power / 5.00) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-[#cca1a1] mt-0.5">
                  ※ ボム発動コスト: <strong className="text-white">{settings.bombPowerCost.toFixed(2)} P</strong>
                </span>
              </div>

              {/* Faith Score factor */}
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-400">FAITH MULTIPLIER [パワー]</span>
                <span className="font-mono text-md font-bold text-emerald-400 leading-normal">
                  {stats.faith.toLocaleString()}
                </span>
              </div>

              {/* Faith Decay Gauge */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-emerald-500/80">FAITH DECAY GAUGE</span>
                  <span className="font-mono text-[10px] text-emerald-300">{(stats.faithGauge / 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#102d1a]/50 rounded mt-1 overflow-hidden border border-emerald-950">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-100"
                    style={{ width: `${(stats.faithGauge / 10000) * 100}%` }}
                  />
                </div>
                {stats.faithGauge <= 0 && (
                  <span className="text-[9px] text-red-400 animate-pulse mt-1">⚠️ 信仰値減少中！Ｐや信仰アイテムを回収してください</span>
                )}
              </div>

              {/* Graze index counts */}
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-400">GRAZE [かすり回数]</span>
                <span className="font-mono text-md font-bold text-cyan-400 leading-normal">
                  {stats.graze} times
                </span>
              </div>

            </div>

            {/* Side Help / Specs summary info */}
            <div className="hidden md:flex bg-[#10070a] border border-red-950/40 p-3 rounded-lg flex-col gap-2 text-[10px] text-gray-400 leading-relaxed">
              <span className="font-bold text-rose-300">💡 攻略のヒント & 操作仕様</span>
              <p>
                🔸 <strong>低速移動 (Shift):</strong>
                判定（赤い実体コア）が自機中央に表示され、弾の間をすり抜けやすくなります。
              </p>
              <p>
                🔸 <strong>得点 POCLine:</strong> 画面上部の点線より上にいくと、全アイテムを自動で引き寄せ回収できます！
              </p>
              <p>
                🔸 <strong>グレイズ (Graze):</strong> 弾の極限の隙間に近づくと「チッ」と鳴り、信仰ゲージが大きく回復します。
              </p>
            </div>

          </div>

          {/* Right segment: The Beautiful Shooting Game Canvas Area */}
          <div className="md:col-span-8 flex justify-center">
            <GameCanvas
              settings={settings}
              character={character}
              shotType={shotType}
              onGameStats={(curStats) => setStats({ ...curStats, highScore: stats.highScore })}
              isMuted={isMuted}
              onMuteToggle={handleMuteToggle}
            />
          </div>

        </div>

      </main>

      <footer className="max-w-6xl mx-auto mt-10 border-t border-[#2e1317] pt-4 text-center text-xs text-zinc-600 font-mono">
        <div>Divine Winds & Oracle Storm Web Engine © 2026 Original Character Development Project.</div>
        <div className="mt-1">
          Developed in high performance HTML5 Canvas. Audio is synthesised in real-time via Web Audio API.
        </div>
      </footer>
    </div>
  );
}
