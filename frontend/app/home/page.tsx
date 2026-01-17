"use client";
import { useState } from "react";

export default function HomeHub() {
  const [hover, setHover] = useState<string | null>(null);

  const go = (path: string) => (window.location.href = path);

  const btnStyle = (key: string): React.CSSProperties => {
    const isHover = hover === key;
    return {
      ...styles.btn,
      transform: isHover ? "translateY(-2px) scale(1.01)" : "translateY(0px) scale(1)",
      filter: isHover ? "brightness(1.08)" : "brightness(1)",
    };
  };

  return (
    <div style={styles.bg}>
      <div style={styles.panel}>
        <h1 style={styles.title}>📜 PLAYER HUB</h1>

        <div style={styles.grid}>
          <button
            style={btnStyle("dungeon")}
            onMouseEnter={() => setHover("dungeon")}
            onMouseLeave={() => setHover(null)}
            onClick={() => go("/game")}
          >
            🗺️ START DUNGEON
          </button>

          <button
            style={btnStyle("train")}
            onMouseEnter={() => setHover("train")}
            onMouseLeave={() => setHover(null)}
            onClick={() => go("/workout")}
          >
            💪 TRAIN
          </button>

          <button
            style={btnStyle("equip")}
            onMouseEnter={() => setHover("equip")}
            onMouseLeave={() => setHover(null)}
            onClick={() => go("/equipment")}
          >
            ⚔️ EQUIPMENT
          </button>

          <button
            style={btnStyle("lead")}
            onMouseEnter={() => setHover("lead")}
            onMouseLeave={() => setHover(null)}
            onClick={() => go("/leaderboard")}
          >
            🏆 LEADERBOARD
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bg: {
    minHeight: "100vh",
    width: "100vw",
    backgroundImage: "url('/home-hub.png')",
    backgroundSize: "100% 100%",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    imageRendering: "pixelated",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  panel: {
    // 📜 scroll look
    background:
      "linear-gradient(180deg, rgba(255,245,210,0.95) 0%, rgba(230,200,140,0.95) 100%)",
    border: "5px solid rgba(70,40,20,0.95)",
    boxShadow: "10px 10px rgba(0,0,0,0.65)",
    padding: 22,
    textAlign: "center",
    maxWidth: 440,
    width: "min(92vw, 440px)",
  },
  title: {
    margin: 0,
    marginBottom: 14,
    fontSize: 20,
    color: "#2b1a10",
    textShadow: "2px 2px rgba(255,255,255,0.35)",
    letterSpacing: 2,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },
  btn: {
    padding: "12px 14px",
    border: "4px solid rgba(50,28,14,0.95)",
    boxShadow: "4px 4px rgba(0,0,0,0.55)",
    background: "linear-gradient(180deg, #ffd36f 0%, #f59e0b 55%, #b45309 100%)",
    cursor: "pointer",
    fontSize: 13,
    color: "#1a1206",
    fontWeight: 900,
    letterSpacing: 1,
    transition: "transform 0.12s ease, filter 0.12s ease",
  },
};


