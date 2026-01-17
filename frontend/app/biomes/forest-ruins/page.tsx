"use client";
import { useEffect, useState } from "react";

/* ---------------- TYPES ---------------- */

type Tile = "P" | "T" | "M" | "."; // ✅ removed B + 🏁
type MapEnemy = { id: string; name: string; x: number; y: number; alive: boolean };

type ForestSave = {
  player: { x: number; y: number };
  revealed: boolean[][];
  enemies: MapEnemy[];
};

/* ---------------- CONSTANTS ---------------- */

const TILE_SIZE = 64;
const STORAGE_KEY = "forest_state";
const VISION_RADIUS = 1;

const FOREST_MAP: Tile[][] = [
  ["P", ".", ".", "T", ".", ".", "."],
  [".", "T", ".", ".", ".", "T", "."],
  [".", ".", "T", ".", ".", ".", "."],
  ["T", ".", ".", ".", ".", "T", "."],
  [".", ".", ".", "T", ".", ".", "."],
  [".", ".", ".", ".", "T", ".", "."],
  [".", ".", ".", ".", ".", ".", "."], // ✅ no exit
];

const DEFAULT_ENEMIES: MapEnemy[] = [
  { id: "e1", name: "Wolf", x: 4, y: 0, alive: true },
  { id: "e2", name: "Treant", x: 3, y: 2, alive: true },
  { id: "slime", name: "Slime", x: 1, y: 4, alive: true }, // ✅ fixed id
  { id: "boss", name: "Forest Boss", x: 5, y: 6, alive: true },
];

export default function ForestPage() {
  const [map] = useState<Tile[][]>(FOREST_MAP);
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [enemies, setEnemies] = useState<MapEnemy[]>(DEFAULT_ENEMIES);
  const [revealed, setRevealed] = useState<boolean[][]>(() => FOREST_MAP.map((row) => row.map(() => false)));
  const [hasFinished, setHasFinished] = useState(false);

  /* ---------------- LOAD SAVE & BATTLE RESULTS ---------------- */

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);

    let currentEnemies = [...DEFAULT_ENEMIES];
    let currentPlayer = { x: 0, y: 0 };
    let currentRevealed = FOREST_MAP.map((row) => row.map(() => false));

    if (raw) {
      try {
        const save: ForestSave = JSON.parse(raw);
        currentPlayer = save.player ?? currentPlayer;
        currentEnemies = save.enemies ?? currentEnemies;
        currentRevealed = save.revealed ?? currentRevealed;
      } catch {}
    }

    const result = localStorage.getItem("lastBattleResult");
    const defeatedId = localStorage.getItem("lastDefeatedEnemyId");
    const posRaw = localStorage.getItem("lastEnemyPosition");
    const enemyPos = posRaw ? JSON.parse(posRaw) : null;

    if (result === "win" && defeatedId) {
      currentEnemies = currentEnemies.map((e) => (e.id === defeatedId ? { ...e, alive: false } : e));

      // put player back where the fight happened
      if (enemyPos) currentPlayer = { x: enemyPos.x, y: enemyPos.y };

      // ✅ if boss defeated -> finish
      if (defeatedId === "boss") setHasFinished(true);
    }

    // Always recompute reveal around current player
    currentRevealed = computeReveal(currentPlayer.x, currentPlayer.y, currentRevealed);

    setPlayer(currentPlayer);
    setEnemies(currentEnemies);
    setRevealed(currentRevealed);
    saveGame(currentPlayer, currentRevealed, currentEnemies);

    localStorage.removeItem("lastBattleResult");
    localStorage.removeItem("lastDefeatedEnemyId");
    localStorage.removeItem("lastEnemyPosition");
  }, []);

  /* ---------------- HELPERS ---------------- */

  function saveGame(p = player, r = revealed, e = enemies) {
    const save: ForestSave = { player: p, revealed: r, enemies: e };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }

  function computeReveal(px: number, py: number, base: boolean[][]) {
    return base.map((row, y) =>
      row.map((vis, x) => {
        const inRange = Math.abs(px - x) <= VISION_RADIUS && Math.abs(py - y) <= VISION_RADIUS;
        return vis || inRange; // ✅ FIXED
      })
    );
  }

  /* ---------------- MOVEMENT ---------------- */

  function move(dx: number, dy: number) {
    if (hasFinished) return;

    const nx = player.x + dx;
    const ny = player.y + dy;

    if (ny < 0 || ny >= map.length || nx < 0 || nx >= map[0].length) return;
    if (map[ny][nx] === "T") return;

    const enemyHere = enemies.find((e) => e.x === nx && e.y === ny && e.alive);
    if (enemyHere) {
      // ✅ store exact return page so fight always returns correctly
      localStorage.setItem("return_to", window.location.pathname + window.location.search);

      localStorage.setItem("currentEnemyId", enemyHere.id);
      localStorage.setItem("lastEnemyPosition", JSON.stringify({ x: nx, y: ny }));
      window.location.href = "/game/fight?biome=forest";
      return;
    }

    const newPos = { x: nx, y: ny };
    setPlayer(newPos);

    const nextRevealed = computeReveal(nx, ny, revealed);
    setRevealed(nextRevealed);
    saveGame(newPos, nextRevealed, enemies);
  }

  /* ---------------- RENDER ---------------- */

  return (
    <div style={S.bgforest}>
      <style>{`
        @keyframes bossPulse {
          0% { filter: drop-shadow(0 0 2px red); transform: scale(1); }
          50% { filter: drop-shadow(0 0 10px red); transform: scale(1.1); }
          100% { filter: drop-shadow(0 0 2px red); transform: scale(1); }
        }
      `}</style>

      <div style={{ padding: 20, position: "relative" }}>
        <h1 style={S.title}>🌲 Forest Ruins</h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${map[0].length}, ${TILE_SIZE}px)`,
            gap: 4,
            marginBottom: 20,
            border: "4px solid rgba(255,255,255,0.1)",
            padding: "4px",
            background: "rgba(0,0,0,0.4)",
          }}
        >
          {map.map((row, y) =>
            row.map((cell, x) => {
              const isPlayer = player.x === x && player.y === y;
              const isRevealed = revealed[y]?.[x];
              const isTree = cell === "T";
              const enemyHere = enemies.find((e) => e.x === x && e.y === y);

              return (
                <div key={`${x}-${y}`} style={S.tile}>
                  {(isRevealed || isTree) && (
                    <>
                      {isPlayer && "🧍"}
                      {!isPlayer && isTree && "🌲"}
                      {!isPlayer && enemyHere?.alive && (
                        <span style={enemyHere.id === "boss" ? { animation: "bossPulse 2s infinite" } : {}}>
                          {enemyHere.id === "boss" ? "👹" : "👾"}
                        </span>
                      )}
                      {!isPlayer && enemyHere && !enemyHere.alive && "💀"}
                    </>
                  )}

                  {!isRevealed && !isTree && <div style={S.fog} />}
                </div>
              );
            })
          )}
        </div>

        <div style={S.controls}>
          <div />
          <button style={S.moveBtn} onClick={() => move(0, -1)}>⬆️</button>
          <div />
          <button style={S.moveBtn} onClick={() => move(-1, 0)}>⬅️</button>
          <button style={S.moveBtn} onClick={() => move(0, 1)}>⬇️</button>
          <button style={S.moveBtn} onClick={() => move(1, 0)}>➡️</button>
        </div>

        {hasFinished && (
          <div style={S.finishOverlay}>
            <div style={S.finishCard}>
              <h2 style={{ fontSize: 32, marginBottom: 10 }}>🏆 BOSS DOWN!</h2>
              <p style={{ marginBottom: 20 }}>Forest Ruins cleared.</p>
              <button
                style={S.finishBtn}
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY); // optional: reset forest after clear
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
  bgforest: {
    minHeight: "100vh",
    width: "100vw",
    backgroundImage: "url('/biomes/forest-fight.png')",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    imageRendering: "pixelated",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    color: "white",
    fontFamily: "sans-serif",
  },
  title: { textAlign: "center", textShadow: "2px 2px #000", marginBottom: "20px" },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    position: "relative",
    background: "#1f2933",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    border: "1px solid rgba(255,255,255,0.1)",
  },
  fog: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 5 },
  controls: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: 180, margin: "0 auto" },
  moveBtn: {
    width: 50,
    height: 50,
    fontSize: 24,
    cursor: "pointer",
    background: "rgba(255,255,255,0.2)",
    border: "2px solid white",
    borderRadius: "8px",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  finishOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    borderRadius: "12px",
  },
  finishCard: {
    background: "#1e293b",
    padding: "40px",
    border: "4px solid #22c55e",
    textAlign: "center",
    boxShadow: "0 0 30px rgba(34, 197, 94, 0.4)",
    borderRadius: "16px",
  },
  finishBtn: {
    padding: "12px 24px",
    background: "#22c55e",
    border: "none",
    color: "#052e16",
    fontWeight: "bold",
    fontSize: "18px",
    cursor: "pointer",
    borderRadius: "8px",
  },
};
