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
          background: "rgba(0,0,0,0.75)",
          padding: "24px 36px",
          border: "3px solid #ffd700",
          textAlign: "center",
          boxShadow: "6px 6px 0 rgba(0,0,0,0.8)",
          maxWidth: "420px",
        }}
      >
        <h1
          style={{
            color: "#ffd700",
            margin: "0 0 10px 0",
            fontSize: "28px",
            letterSpacing: "2px",
            textShadow: "3px 3px 0 #000",
          }}
        >
          DUNGEON RUN
        </h1>

        <p
          style={{
            color: "#ddd",
            marginBottom: "18px",
            fontSize: "14px",
            letterSpacing: "1px",
          }}
        >
          Train. Fight. Level Up.
        </p>

        <button
          style={{
            padding: "10px 22px",
            fontSize: "16px",
            cursor: "pointer",
            background: "#ff4444",
            color: "white",
            border: "3px solid #900",
            boxShadow: "4px 4px 0 #000",
            transition: "all 0.1s ease",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.background = "#ff6666")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.background = "#ff4444")
          }
          onClick={() => (window.location.href = "/home")}
        >
          START TRAINING
        </button>
      </div>
    </div>
  );
}
