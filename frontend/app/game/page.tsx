"use client";

import { useEffect, useState, useCallback } from "react";
import Particles from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine } from "@tsparticles/engine";
import { BIOMES } from "./biomes";

export default function BiomeSelectPage() {
  const [index, setIndex] = useState(0);
  const biome = BIOMES[index];
  const [engineReady, setEngineReady] = useState(false);
  const [transitioning, setTransitioning] = useState(false);



  /* ---------------- INIT PARTICLES ENGINE ---------------- */
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
    setEngineReady(true);
  }, []);

  function next() {
  if (transitioning) return;

  setTransitioning(true);
  setTimeout(() => {
    setIndex((i) => (i + 1) % BIOMES.length);
    setTransitioning(false);
  }, 300);
}

function prev() {
  if (transitioning) return;

  setTransitioning(true);
  setTimeout(() => {
    setIndex((i) => (i - 1 + BIOMES.length) % BIOMES.length);
    setTransitioning(false);
  }, 300);
}


  function enterBiome() {
    localStorage.setItem("selected_biome", biome.id);
    window.location.href = `/biomes/${biome.id}`;
  }

  return (
    <div style={S.bg}>
    <div style={S.page}>
      {/* PARTICLE EFFECT LAYER */}
      {engineReady && (
        <Particles
          key={biome.effect}
          init={particlesInit}
          options={EFFECTS[biome.effect]}
          style={S.particles}
        />
      )}

      <div
      style={{
        ...S.transitionLayer,
        opacity: transitioning ? 0 : 1,
        transform: transitioning ? "scale(0.96)" : "scale(1)",
      }}
    >
      <h1 style={S.title}>{biome.name}</h1>
      <img src={biome.image} style={S.image} />
    </div>
      <div style={S.controls}>
        <button onClick={prev}>⬅</button>
        <button onClick={enterBiome}>ENTER</button>
        <button onClick={next}>➡</button>
      </div>
    </div>
    </div>
  );
}

/* ---------------- EFFECT CONFIGS ---------------- */

const EFFECTS: Record<string, any> = {
  ice: {
    particles: {
      number: { value: 120 },
      move: { speed: 1, direction: "bottom" },
      size: { value: 3 },
      opacity: { value: 0.9 },
      color: { value: "#ffffff" },
    },
  },

  lava: {
    particles: {
      number: { value: 90 },
      move: { speed: 2, direction: "top" },
      size: { value: 4 },
      color: { value: ["#ff4500", "#ffcc00"] },
    },
  },

  forest: {
    particles: {
      number: { value: 70 },
      move: { speed: 1, direction: "bottom-right" },
      size: { value: 6 },
      color: { value: ["#22c55e", "#16a34a"] },
    },
  },

  shadow: {
    particles: {
      number: { value: 50 },
      move: { speed: 0.3 },
      size: { value: 20 },
      opacity: { value: 0.2 },
      color: { value: "#999" },
    },
  },
};

/* ---------------- STYLES ---------------- */

const S: Record<string, React.CSSProperties> = {
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
  page: {
    minHeight: "100vh",
    background: "#020617",
    color: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    position: "relative",
    overflow: "hidden",
  },

  particles: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
  },

  title: {
    zIndex: 1,
    fontSize: 32,
    letterSpacing: 2,
  },

  image: {
    width: 420,
    imageRendering: "pixelated",
    border: "4px solid white",
    zIndex: 1,
  },

  controls: {
    display: "flex",
    gap: 12,
    zIndex: 1,
  },

  transitionLayer: {
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  transition: "all 0.3s ease-in-out",
  },
};

