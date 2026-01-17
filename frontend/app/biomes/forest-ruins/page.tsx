"use client";
import { useEffect, useState } from "react";

type Tile = "P" | "T" | "M" | "B" | ".";

const TILE_SIZE = 64;

const FOREST_MAP: Tile[][] = [
  ["P", ".", ".", "T", "M"],
  [".", "T", ".", ".", "."],
  [".", ".", "T", "M", "."],
  ["T", ".", ".", ".", "."],
  [".", ".", ".", "T", "B"],
];

export default function ForestPage() {
  const [map] = useState<Tile[][]>(FOREST_MAP);
  const [player, setPlayer] = useState({ x: 0, y: 0 });

  // Fog state
  const [revealed, setRevealed] = useState<boolean[][]>(() =>
    FOREST_MAP.map(row => row.map(() => false))
  );

  const VISION_RADIUS = 1;

  // 👇 Reveal logic (MUST be inside component)
  function revealArea(px: number, py: number) {
    setRevealed(prev =>
      prev.map((row, y) =>
        row.map((cell, x) => {
          const inRange =
            Math.abs(px - x) <= VISION_RADIUS &&
            Math.abs(py - y) <= VISION_RADIUS;

          return cell || inRange;
        })
      )
    );
  }

  function move(dx: number, dy: number) {
    const nx = player.x + dx;
    const ny = player.y + dy;

    if (!map[ny]?.[nx]) return;

    const target = map[ny][nx];
    if (target === "T") return;

    if (target === "M") alert("Monster encountered! ⚔️");
    if (target === "B") alert("Boss reached! 👑");

    setPlayer({ x: nx, y: ny });
    revealArea(nx, ny);
  }

  // Reveal starting position
  useEffect(() => {
    revealArea(player.x, player.y);
  }, []);

  return (
    <div style={S.bgforest}>
      <div style={{ padding: 20 }}>
        <h1>🌲 Forest Ruins</h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${map[0].length}, ${TILE_SIZE}px)`,
            gap: 4,
            marginBottom: 20,
          }}
        >
          {map.map((row, y) =>
            row.map((cell, x) => {
              const isPlayer = player.x === x && player.y === y;
              const isRevealed = revealed[y][x];
              const isTree = cell === "T";

              return (
                <div
                  key={`${x}-${y}`}
                  style={{
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    position: "relative",
                    background: "#1f2933",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    border: "2px solid #333",
                  }}
                >
                  {/* TILE CONTENT */}
                  {(isRevealed || isTree) && (
                    <>
                      {isPlayer && "🧍"}
                      {!isPlayer && cell === "T" && "🌲"}
                      {!isPlayer && cell === "M" && "👾"}
                      {!isPlayer && cell === "B" && "🏁"}
                    </>
                  )}

                  {/* FOG LAYER */}
                  {!isRevealed && !isTree && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0.85)",
                      }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => move(0, -1)}>⬆️</button>
          <button onClick={() => move(-1, 0)}>⬅️</button>
          <button onClick={() => move(1, 0)}>➡️</button>
          <button onClick={() => move(0, 1)}>⬇️</button>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  bgforest: {
    minHeight: "100vh",
    width: "100vw",
    backgroundImage: "url('/biomes/forest-fight.png')",
    backgroundSize: "100% 100%",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    imageRendering: "pixelated",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
};
