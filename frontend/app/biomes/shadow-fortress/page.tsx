"use client";
import { useEffect, useState } from "react";

/* ---------------- TYPES & CONSTANTS ---------------- */
type Tile = "P" | "T" | "M" | "B" | ".";
type MapEnemy = { id: string; name: string; x: number; y: number; alive: boolean; isBoss?: boolean };

const TILE_SIZE = 64;
const MAP_DIM = 8;
const STORAGE_KEY = "shadow_state";
const VISION_RADIUS = 2;

// ✅ 怪物每 N 步移动一次（避免每走一步都遇敌）
const ENEMY_MOVE_EVERY = 2;

const SHADOW_MAP: Tile[][] = [
  ["P", ".", ".", ".", ".", "T", ".", "."],
  [".", "T", "T", "T", ".", "T", ".", "."],
  [".", "T", "M", ".", ".", ".", ".", "."],
  [".", "T", ".", "T", "T", "T", "T", "."],
  [".", ".", ".", ".", "M", ".", ".", "."],
  [".", "T", "T", "T", "T", "T", "T", "."],
  [".", "M", ".", ".", ".", ".", "M", "."],
  [".", ".", ".", "T", ".", ".", ".", "B"],
];

const DEFAULT_ENEMIES: MapEnemy[] = [
  { id: "sh1", name: "Shadow Wraith", x: 2, y: 2, alive: true },
  { id: "sh2", name: "Dark Knight", x: 4, y: 4, alive: true },
  { id: "sh3", name: "Night Terror", x: 1, y: 6, alive: true },
  { id: "sh4", name: "Abyssal Eye", x: 6, y: 6, alive: true },

  // ✅ 关键修复：boss id 必须跟 fight page 一致（你的 fight 里是 "boss"）
  { id: "boss", name: "Void Stalker", x: 6, y: 7, alive: true, isBoss: true },
];

export default function ShadowDungeonPage() {
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [enemies, setEnemies] = useState<MapEnemy[]>(DEFAULT_ENEMIES);
  const [revealed, setRevealed] = useState<boolean[][]>(() => SHADOW_MAP.map(r => r.map(() => false)));
  const [hasFinished, setHasFinished] = useState(false);
  const [stepCount, setStepCount] = useState(0); // ✅ 用来控制怪物移动频率

  /* ---------------- LOAD & SYNC ---------------- */
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const result = localStorage.getItem("lastBattleResult");
    const defeatedId = localStorage.getItem("lastDefeatedEnemyId");
    const posRaw = localStorage.getItem("lastEnemyPosition");

    let currentEnemies = [...DEFAULT_ENEMIES];
    let currentPlayer = { x: 0, y: 0 };
    let currentRevealed = SHADOW_MAP.map(row => row.map(() => false));
    let currentStep = 0;

    if (raw) {
      const save = JSON.parse(raw);
      currentPlayer = save.player ?? currentPlayer;
      currentEnemies = save.enemies ?? currentEnemies;
      currentRevealed = save.revealed ?? currentRevealed;
      currentStep = save.stepCount ?? 0;
    }

    if (result === "win" && defeatedId) {
      currentEnemies = currentEnemies.map(e => (e.id === defeatedId ? { ...e, alive: false } : e));
      if (posRaw) currentPlayer = JSON.parse(posRaw);
    }

    const finalRevealed = computeReveal(currentPlayer.x, currentPlayer.y, currentRevealed);

    setPlayer(currentPlayer);
    setEnemies(currentEnemies);
    setRevealed(finalRevealed);
    setStepCount(currentStep);

    saveData(currentPlayer, currentEnemies, finalRevealed, currentStep);

    localStorage.removeItem("lastBattleResult");
    localStorage.removeItem("lastDefeatedEnemyId");
    localStorage.removeItem("lastEnemyPosition");
  }, []);

  /* ---------------- HELPERS ---------------- */
  function saveData(p: any, e: any, r: any, sc: number) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ player: p, enemies: e, revealed: r, stepCount: sc }));
  }

  function computeReveal(px: number, py: number, base: boolean[][]) {
    return base.map((row, y) =>
      row.map((vis, x) => (Math.abs(px - x) <= VISION_RADIUS && Math.abs(py - y) <= VISION_RADIUS) || vis)
    );
  }

  function isWalkable(x: number, y: number) {
    if (y < 0 || y >= SHADOW_MAP.length || x < 0 || x >= SHADOW_MAP[0].length) return false;
    return SHADOW_MAP[y][x] !== "T";
  }

  /* ---------------- PURSUIT LOGIC ---------------- */
  function moveEnemies(px: number, py: number, currentEnemies: MapEnemy[]) {
    return currentEnemies.map(enemy => {
      if (!enemy.alive || enemy.isBoss) return enemy;

      let nx = enemy.x;
      let ny = enemy.y;

      // 简单追击：优先拉近 x，否则拉近 y
      if (nx < px) nx++;
      else if (nx > px) nx--;
      else if (ny < py) ny++;
      else if (ny > py) ny--;

      if (!isWalkable(nx, ny)) return enemy;

      return { ...enemy, x: nx, y: ny };
    });
  }

  /* ---------------- PLAYER MOVEMENT ---------------- */
  function move(dx: number, dy: number) {
    if (hasFinished) return;

    const nx = player.x + dx;
    const ny = player.y + dy;

    if (!isWalkable(nx, ny)) return;

    const newPos = { x: nx, y: ny };

    // 1) 先检查：玩家自己踩到怪
    const directEnemy = enemies.find(e => e.alive && e.x === nx && e.y === ny);
    if (directEnemy) {
      localStorage.setItem("currentEnemyId", directEnemy.id);
      localStorage.setItem("lastEnemyPosition", JSON.stringify(newPos));
      const fightUrl = directEnemy.isBoss ? "/game/fight?biome=shadow&boss=true" : "/game/fight?biome=shadow";
      saveData(newPos, enemies, revealed, stepCount + 1);
      window.location.href = fightUrl;
      return;
    }

    // 2) 玩家走完，步数+1；只有每 ENEMY_MOVE_EVERY 步才移动怪
    const nextStep = stepCount + 1;
    let updatedEnemies = enemies;

    if (nextStep % ENEMY_MOVE_EVERY === 0) {
      updatedEnemies = moveEnemies(nx, ny, enemies);
    }

    // 3) 如果怪移动后撞到玩家 → 也会遇敌（但现在不会每一步都触发）
    const chasedEnemy = updatedEnemies.find(e => e.alive && e.x === nx && e.y === ny);
    if (chasedEnemy) {
      localStorage.setItem("currentEnemyId", chasedEnemy.id);
      localStorage.setItem("lastEnemyPosition", JSON.stringify(newPos));
      const fightUrl = chasedEnemy.isBoss ? "/game/fight?biome=shadow&boss=true" : "/game/fight?biome=shadow";
      saveData(newPos, updatedEnemies, revealed, nextStep);
      window.location.href = fightUrl;
      return;
    }

    // 4) 正常更新
    const newRevealed = computeReveal(nx, ny, revealed);
    setPlayer(newPos);
    setEnemies(updatedEnemies);
    setRevealed(newRevealed);
    setStepCount(nextStep);
    saveData(newPos, updatedEnemies, newRevealed, nextStep);

    // 5) 通关：走到 B（通常你会设置为 boss 死了才算通关，这里保留你原逻辑）
    if (SHADOW_MAP[ny][nx] === "B") {
      setHasFinished(true);
    }
  }

  const isBossDead = !enemies.find(e => e.id === "boss")?.alive;

  return (
    <div style={S.bgShadow}>
      <div style={{ position: "relative" }}>
        <h1 style={S.title}>🌑 Shadow Dungeon</h1>

        <div style={{ ...S.grid, gridTemplateColumns: `repeat(${MAP_DIM}, ${TILE_SIZE}px)` }}>
          {SHADOW_MAP.map((row, y) =>
            row.map((cell, x) => {
              const isPlayer = player.x === x && player.y === y;
              const isRevealed = revealed[y][x];
              const enemy = enemies.find(e => e.x === x && e.y === y);

              return (
                <div key={`${x}-${y}`} style={S.tile}>
                  {isRevealed ? (
                    <>
                      {isPlayer && "🕯️"}
                      {!isPlayer && cell === "T" && "🧱"}
                      {!isPlayer && enemy?.alive && (enemy.isBoss ? "👿" : "👁️")}
                      {!isPlayer && enemy && !enemy.alive && "💀"}
                      {!isPlayer && cell === "B" && (isBossDead ? "🔮" : "🌑")}
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
              <h2 style={{ color: "#a855f7" }}>🔮 VOID STALKER DEFEATED</h2>
              <h3>REALM ESCAPED</h3>
              <button
                style={S.finBtn}
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  window.location.href = "/game";
                }}
              >
                LEAVE SHADOWS
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  bgShadow: { minHeight: "100vh", backgroundImage: "url('/biomes/shadow-fight.png')", backgroundSize: "cover", display: "flex", justifyContent: "center", alignItems: "center", color: "#e9d5ff" },
  title: { textAlign: "center", textShadow: "0 0 10px #7e22ce", marginBottom: 20 },
  grid: { display: "grid", gap: 4, background: "#000", padding: 10, border: "2px solid #6b21a8", boxShadow: "0 0 20px #4c1d95" },
  tile: { width: TILE_SIZE, height: TILE_SIZE, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, background: "#1e1b4b" },
  fog: { position: "absolute", inset: 0, background: "#000" },
  controls: { display: "grid", gridTemplateColumns: "repeat(3, 60px)", gap: 10, justifyContent: "center", marginTop: 20 },
  btn: { width: 60, height: 60, background: "#4c1d95", color: "white", border: "1px solid #7e22ce", borderRadius: 8, cursor: "pointer", fontSize: 20 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10 },
  card: { padding: 40, background: "#2e1065", border: "2px solid #a855f7", textAlign: "center", borderRadius: 16 },
  finBtn: { marginTop: 20, padding: "10px 20px", background: "#a855f7", border: "none", fontWeight: "bold", cursor: "pointer", color: "white", borderRadius: 4 },
};
