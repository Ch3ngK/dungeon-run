"use client";
import { useEffect, useState } from "react";

/* ---------------- TYPES ---------------- */
type Tile = "P" | "T" | "M" | "B" | ".";
type MapEnemy = { id: string; name: string; x: number; y: number; alive: boolean; isBoss?: boolean };

/* ---------------- CONSTANTS ---------------- */
const TILE_SIZE = 64;
const MAP_WIDTH = 7;
const STORAGE_KEY = "lava_state";
const VISION_RADIUS = 1;

const LAVA_MAP: Tile[][] = [
  ["P", ".", ".", "T", ".", ".", "."],
  [".", "T", "M", ".", ".", "T", "."],
  [".", ".", ".", "T", ".", "M", "."],
  ["T", "M", ".", ".", ".", ".", "."],
  [".", ".", "T", ".", "T", "T", "."],
  [".", "T", ".", "M", ".", ".", "."],
  [".", ".", ".", ".", ".", ".", "B"], // 这个格子现在只是装饰，不再作为通关出口
];

const DEFAULT_ENEMIES: MapEnemy[] = [
  { id: "lava1", name: "Magma Imp", x: 2, y: 1, alive: true },
  { id: "lava2", name: "Fire Beast", x: 1, y: 3, alive: true },
  { id: "lava3", name: "Ember Knight", x: 5, y: 2, alive: true },
  { id: "lava4", name: "Flame Archer", x: 3, y: 5, alive: true },
  // ✅ boss id 必须叫 boss_lava（和 Fight 对齐）
  { id: "boss_lava", name: "Inferno Lord", x: 5, y: 6, alive: true, isBoss: true },
];

export default function LavaCavernPage() {
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [enemies, setEnemies] = useState<MapEnemy[]>(DEFAULT_ENEMIES);
  const [revealed, setRevealed] = useState<boolean[][]>(() => LAVA_MAP.map((r) => r.map(() => false)));
  const [crackedTiles, setCrackedTiles] = useState<{ x: number; y: number }[]>([]);
  const [hasFinished, setHasFinished] = useState(false);

  const bossDead = !enemies.find((e) => e.id === "boss_lava")?.alive;

  /* ---------------- LOAD & SYNC ---------------- */
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const result = localStorage.getItem("lastBattleResult");
    const defeatedId = localStorage.getItem("lastDefeatedEnemyId");
    const posRaw = localStorage.getItem("lastEnemyPosition");

    let currentEnemies = [...DEFAULT_ENEMIES];
    let currentPlayer = { x: 0, y: 0 };
    let currentRevealed = LAVA_MAP.map((row) => row.map(() => false));
    let currentCracked: { x: number; y: number }[] = [];

    if (raw) {
      const save = JSON.parse(raw);
      currentPlayer = save.player ?? currentPlayer;
      currentEnemies = save.enemies ?? currentEnemies;
      currentRevealed = save.revealed ?? currentRevealed;
      currentCracked = save.cracked ?? [];
    }

    // ✅ 从 fight 回来：把打死的 enemy 标记 dead
    if (result === "win" && defeatedId) {
      currentEnemies = currentEnemies.map((e) => (e.id === defeatedId ? { ...e, alive: false } : e));
      if (posRaw) currentPlayer = JSON.parse(posRaw);

      // ✅ 关键：boss 死了就直接通关（不需要再走到 B）
      if (defeatedId === "boss_lava") {
        setHasFinished(true);
      }
    }

    const finalRevealed = computeReveal(currentPlayer.x, currentPlayer.y, currentRevealed);

    setPlayer(currentPlayer);
    setEnemies(currentEnemies);
    setRevealed(finalRevealed);
    setCrackedTiles(currentCracked);

    saveData(currentPlayer, currentEnemies, finalRevealed, currentCracked);

    localStorage.removeItem("lastBattleResult");
    localStorage.removeItem("lastDefeatedEnemyId");
    localStorage.removeItem("lastEnemyPosition");
  }, []);

  function saveData(p: any, e: any, r: any, c: any) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ player: p, enemies: e, revealed: r, cracked: c }));
  }

  function computeReveal(px: number, py: number, base: boolean[][]) {
    return base.map((row, y) =>
      row.map((vis, x) => (Math.abs(px - x) <= VISION_RADIUS && Math.abs(py - y) <= VISION_RADIUS) || vis)
    );
  }

  /* ---------------- MOVEMENT ---------------- */
  function move(dx: number, dy: number) {
    if (hasFinished) return;

    const nx = player.x + dx;
    const ny = player.y + dy;

    if (ny < 0 || ny >= LAVA_MAP.length || nx < 0 || nx >= LAVA_MAP[0].length) return;
    if (LAVA_MAP[ny][nx] === "T") return;

    // ✅ lava 特性：走过的路不能走（踩到裂路回起点）
    if (crackedTiles.some((t) => t.x === nx && t.y === ny)) {
      alert("The floor collapsed! Returning to start...");
      const resetPlayer = { x: 0, y: 0 };
      const resetCracked: { x: number; y: number }[] = [];
      setPlayer(resetPlayer);
      setCrackedTiles(resetCracked);
      saveData(resetPlayer, enemies, revealed, resetCracked);
      return;
    }

    // enemy check
    const enemy = enemies.find((e) => e.x === nx && e.y === ny && e.alive);
    if (enemy) {
      localStorage.setItem("currentEnemyId", enemy.id);
      localStorage.setItem("lastEnemyPosition", JSON.stringify({ x: nx, y: ny }));
      window.location.href = enemy.isBoss ? "/game/fight?biome=lava&boss=true" : "/game/fight?biome=lava";
      return;
    }

    // update position + crack previous tile
    const newPos = { x: nx, y: ny };
    const newCracked = [...crackedTiles, { x: player.x, y: player.y }];
    const newRevealed = computeReveal(nx, ny, revealed);

    setPlayer(newPos);
    setCrackedTiles(newCracked);
    setRevealed(newRevealed);
    saveData(newPos, enemies, newRevealed, newCracked);

    // ❌ 不再需要踩 B 通关（按你的要求）
  }

  return (
    <div style={S.bgLava}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <h1 style={S.title}>🌋 Lava Cavern</h1>

        <div style={{ ...S.grid, gridTemplateColumns: `repeat(${MAP_WIDTH}, ${TILE_SIZE}px)` }}>
          {LAVA_MAP.map((row, y) =>
            row.map((cell, x) => {
              const isPlayer = player.x === x && player.y === y;
              const isRevealed = revealed[y][x];
              const isCracked = crackedTiles.some((t) => t.x === x && t.y === y);
              const enemy = enemies.find((e) => e.x === x && e.y === y);

              return (
                <div key={`${x}-${y}`} style={{ ...S.tile, background: isCracked ? "#7f1d1d" : "#451a03" }}>
                  {isRevealed || cell === "T" ? (
                    <>
                      {isPlayer && "🏃"}
                      {!isPlayer && cell === "T" && "⛰️"}

                      {/* ✅ boss/敌人：活着显示，死了显示骷髅 */}
                      {!isPlayer && enemy?.alive && (enemy.isBoss ? "👿" : "🔥")}
                      {!isPlayer && enemy && !enemy.alive && "💀"}

                      {/* ✅ 这个 B 格子不再作为出口，只做装饰 */}
                      {!isPlayer && cell === "B" && (bossDead ? "🏺" : "🚪")}

                      {isCracked && !isPlayer && <div style={S.cracks}>❌</div>}
                    </>
                  ) : (
                    <div style={S.fog} />
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={S.controls}>
          <div />
          <button style={S.btn} onClick={() => move(0, -1)}>⬆️</button>
          <div />
          <button style={S.btn} onClick={() => move(-1, 0)}>⬅️</button>
          <button style={S.btn} onClick={() => move(0, 1)}>⬇️</button>
          <button style={S.btn} onClick={() => move(1, 0)}>➡️</button>
        </div>

        {hasFinished && (
          <div style={S.overlay}>
            <div style={S.card}>
              <h2 style={{ color: "#f87171" }}>🌋 BOSS DEFEATED</h2>
              <p>You have defeated the Inferno Lord!</p>
              <button
                style={S.finBtn}
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  window.location.href = "/game";
                }}
              >
                RETURN TO HUB
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  bgLava: {
    minHeight: "100vh",
    backgroundColor: "#1a0505",
    backgroundImage: "url('/biomes/lava-fight.png')",
    backgroundSize: "cover",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#fca5a5",
  },
  title: { textAlign: "center", textShadow: "0 0 15px #ef4444", marginBottom: 20 },
  grid: { display: "grid", gap: 4, padding: 10, border: "4px solid #991b1b", background: "#000", boxShadow: "0 0 20px rgba(153, 27, 27, 0.5)" },
  tile: { width: TILE_SIZE, height: TILE_SIZE, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 },
  cracks: { position: "absolute", fontSize: 12, bottom: 2, right: 2, opacity: 0.5 },
  fog: { position: "absolute", inset: 0, background: "#111" },
  controls: { display: "grid", gridTemplateColumns: "repeat(3, 60px)", gap: 10, justifyContent: "center", marginTop: 20 },
  btn: { width: 60, height: 60, background: "#991b1b", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 20 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10 },
  card: { padding: 40, background: "#451a03", border: "4px solid #f87171", textAlign: "center", borderRadius: 16, boxShadow: "0 0 30px #ef4444" },
  finBtn: { marginTop: 20, padding: "12px 24px", background: "#f87171", border: "none", fontWeight: "bold", cursor: "pointer", borderRadius: 4 },
};

