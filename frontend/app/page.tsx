"use client";

export default function Home() {
  return (
    <div
      style={{
        backgroundImage: "url('/home-bg.png')",
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.7)",
          padding: "40px",
          border: "4px solid white",
          textAlign: "center",
        }}
      >
        <h1 style={{ color: "#ffd700" }}>DUNGEON RUN</h1>
        <p style={{ color: "white", marginBottom: "20px" }}>
          Train. Fight. Level Up.
        </p>

        <button
          style={{
            padding: "15px 30px",
            fontSize: "18px",
            cursor: "pointer",
            background: "#ff4444",
            color: "white",
            border: "none",
          }}
          onClick={() => window.location.href = "/home"}
        >
          START TRAINING
        </button>
      </div>
    </div>
  );
}
