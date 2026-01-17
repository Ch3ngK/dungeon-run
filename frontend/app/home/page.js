"use client";

export default function HomeHub() {
  return (
    <div style={styles.bg}>
      <div style={styles.panel}>
        <h1 style={styles.title}>PLAYER HUB</h1>

        <div style={styles.grid}>
          <button style={styles.btn} onClick={() => (window.location.href = "/game")}>
            START DUNGEON
          </button>

          <button style={styles.btn} onClick={() => (window.location.href = "/workout")}>
            TRAIN
          </button>

          <button style={styles.btn} onClick={() => (window.location.href = "/equipment")}>
            EQUIPMENT
          </button>

          <button style={styles.btn} onClick={() => (window.location.href = "/leaderboard")}>
            LEADERBOARD
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
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
    background: "rgba(0,0,0,0.65)",
    border: "4px solid #fff",
    boxShadow: "6px 6px #000",
    padding: 28,
    textAlign: "center",
    maxWidth: 520,
    width: "100%",
  },
  title: {
    margin: 0,
    marginBottom: 18,
    fontSize: 28,
    color: "#ffd700",
    textShadow: "3px 3px #000",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
  },
  btn: {
    padding: "14px 16px",
    border: "4px solid #000",
    boxShadow: "4px 4px #000",
    background: "#22c55e",
    cursor: "pointer",
    fontSize: 14,
  },
};
