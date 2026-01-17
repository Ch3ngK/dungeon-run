"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Mode = "strength" | "agility";
type StrengthLevel = 1 | 2 | 3 | 4 | 5;

const BASE_STR = 10;
const BASE_AGI = 0;

const STRENGTH_LEVELS: { level: StrengthLevel; name: string; desc: string }[] = [
  { level: 1, name: "Incline Push-up", desc: "+STR (Easy)" },
  { level: 2, name: "Knee Push-up", desc: "+STR (Normal)" },
  { level: 3, name: "Push-up", desc: "+STR (Hard)" },
  { level: 4, name: "Dips", desc: "+STR (Very Hard)" },
  { level: 5, name: "Pull-up (Boss)", desc: "+STR (Boss)" },
];

const AEROBIC_TYPES = ["Running", "Swimming", "Cycling", "Jump Rope"] as const;
type AerobicType = (typeof AEROBIC_TYPES)[number];

function agilityPointsFromMinutes(mins: number) {
  return Math.max(0, Math.floor(mins / 10));
}

function strengthGain(level: StrengthLevel) {
  const table: Record<StrengthLevel, number> = { 1: 5, 2: 7, 3: 9, 4: 12, 5: 15 };
  return table[level];
}

function stars(level: StrengthLevel) {
  return "⭐".repeat(level);
}

function levelTheme(level: StrengthLevel) {
  const themes: Record<
    StrengthLevel,
    { bg: string; badgeBg: string; glow: string; label: string }
  > = {
    1: { bg: "#22c55e", badgeBg: "rgba(34,197,94,0.25)", glow: "rgba(34,197,94,0.55)", label: "EASY" },
    2: { bg: "#84cc16", badgeBg: "rgba(132,204,22,0.25)", glow: "rgba(132,204,22,0.55)", label: "NORMAL" },
    3: { bg: "#f59e0b", badgeBg: "rgba(245,158,11,0.25)", glow: "rgba(245,158,11,0.6)", label: "HARD" },
    4: { bg: "#f97316", badgeBg: "rgba(249,115,22,0.25)", glow: "rgba(249,115,22,0.65)", label: "VERY HARD" },
    5: { bg: "#a855f7", badgeBg: "rgba(168,85,247,0.25)", glow: "rgba(168,85,247,0.75)", label: "BOSS" },
  };
  return themes[level];
}

function aerobicTheme(t: AerobicType) {
  const table: Record<AerobicType, { bg: string; glow: string; chip: string; icon: string }> = {
    Running: { bg: "#38bdf8", glow: "rgba(56,189,248,0.65)", chip: "rgba(56,189,248,0.22)", icon: "🏃" },
    Swimming: { bg: "#22c55e", glow: "rgba(34,197,94,0.65)", chip: "rgba(34,197,94,0.22)", icon: "🏊" },
    Cycling: { bg: "#f59e0b", glow: "rgba(245,158,11,0.65)", chip: "rgba(245,158,11,0.22)", icon: "🚴" },
    "Jump Rope": { bg: "#f43f5e", glow: "rgba(244,63,94,0.65)", chip: "rgba(244,63,94,0.22)", icon: "🪢" },
  };
  return table[t];
}

/** 🔊 beep (throttled) */
function useBeep() {
  const lastAtRef = useRef(0);

  function beep(freq = 740, dur = 0.11, gain = 0.06) {
    const now = Date.now();
    if (now - lastAtRef.current < 110) return;
    lastAtRef.current = now;

    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.type = "square";
      o.frequency.value = freq;

      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);

      const t = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      o.start(t);
      o.stop(t + dur + 0.01);

      setTimeout(() => ctx.close?.(), 220);
    } catch {}
  }

  return beep;
}

/** ✨ Click FX: particle burst + FULLSCREEN EMOJI */
type Burst = { id: number; x: number; y: number; glow: string };
type EmojiFX = { id: number; emoji: string };

function useClickFx() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [emojis, setEmojis] = useState<EmojiFX[]>([]);
  const idRef = useRef(1);

  function burst(clientX: number, clientY: number, glow: string) {
    const id = idRef.current++;
    setBursts((prev) => [...prev, { id, x: clientX, y: clientY, glow }]);
    setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 520);
  }

  function fullEmoji(emoji: string) {
    const id = idRef.current++;
    setEmojis((prev) => [...prev, { id, emoji }]);
    setTimeout(() => setEmojis((prev) => prev.filter((e) => e.id !== id)), 520);
  }

  const BurstsEl = (
    <div style={S.fxLayer} aria-hidden>
      {bursts.map((b) => (
        <div key={b.id} style={{ ...S.burst, left: b.x, top: b.y, boxShadow: `0 0 22px ${b.glow}` }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              style={{
                ...S.spark,
                boxShadow: `0 0 18px ${b.glow}`,
                animationDelay: `${i * 8}ms`,
                // CSS var for keyframes
                ...( { ["--r" as any]: `${i * 30}deg` } as any ),
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );

  const EmojisEl = (
    <div style={S.emojiLayer} aria-hidden>
      {emojis.map((e) => (
        <div key={e.id} style={S.emojiPop}>
          {e.emoji}
        </div>
      ))}
    </div>
  );

  return { burst, fullEmoji, BurstsEl, EmojisEl };
}

export default function WorkoutPage() {
  const [mode, setMode] = useState<Mode>("strength");
  const [strengthDraft, setStrengthDraft] = useState<StrengthLevel | null>(null);

  const [aerobicDraft, setAerobicDraft] = useState<AerobicType>("Running");
  const [minutesDraft, setMinutesDraft] = useState<number>(20);
  const [aerobicConfirmed, setAerobicConfirmed] = useState<{ type: AerobicType; minutes: number } | null>(null);

  const [strength, setStrength] = useState<number>(BASE_STR);
  const [agility, setAgility] = useState<number>(BASE_AGI);

  const beep = useBeep();
  const { burst, fullEmoji, BurstsEl, EmojisEl } = useClickFx();

  useEffect(() => {
    const saved = localStorage.getItem("dr_stats");
    if (saved) {
      const parsed = JSON.parse(saved);
      setStrength(typeof parsed.strength === "number" ? parsed.strength : BASE_STR);
      setAgility(typeof parsed.agility === "number" ? parsed.agility : BASE_AGI);
    } else {
      localStorage.setItem("dr_stats", JSON.stringify({ strength: BASE_STR, agility: BASE_AGI }));
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("workout_record_result");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.kind === "strength" && typeof parsed.gain === "number") {
        setStrength((s) => s + parsed.gain);
      }
    } catch {}
    localStorage.removeItem("workout_record_result");
  }, []);

  useEffect(() => {
    localStorage.setItem("dr_stats", JSON.stringify({ strength, agility }));
  }, [strength, agility]);

  const agilityHasChanges = useMemo(() => {
    if (!aerobicConfirmed) return true;
    return aerobicConfirmed.type !== aerobicDraft || aerobicConfirmed.minutes !== minutesDraft;
  }, [aerobicConfirmed, aerobicDraft, minutesDraft]);

  const agiPts = useMemo(() => agilityPointsFromMinutes(minutesDraft), [minutesDraft]);
  const agiT = useMemo(() => aerobicTheme(aerobicDraft), [aerobicDraft]);

  function confirmStrength() {
    if (!strengthDraft) return;
    const gain = strengthGain(strengthDraft);
    window.location.href = `/workout/record?level=${strengthDraft}&gain=${gain}`;
  }

  function confirmAgility() {
    const pts = agilityPointsFromMinutes(minutesDraft);
    setAerobicConfirmed({ type: aerobicDraft, minutes: minutesDraft });
    setAgility((a) => a + pts);
  }

  function cancelAgility() {
    if (!aerobicConfirmed) return;
    setAerobicDraft(aerobicConfirmed.type);
    setMinutesDraft(aerobicConfirmed.minutes);
  }

  function resetToBase() {
    setStrength(BASE_STR);
    setAgility(BASE_AGI);
    localStorage.setItem("dr_stats", JSON.stringify({ strength: BASE_STR, agility: BASE_AGI }));

    setStrengthDraft(null);
    setAerobicDraft("Running");
    setMinutesDraft(20);
    setAerobicConfirmed(null);
  }

  return (
    <main style={S.page}>
      <style jsx global>{`
        @keyframes press {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(2px) scale(0.99); }
        }
        @keyframes floatIn {
          0% { transform: translateY(6px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes bolt {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes spark {
          0% { opacity: 1; transform: rotate(var(--r)) translateX(0px) scale(1); }
          100% { opacity: 0; transform: rotate(var(--r)) translateX(64px) scale(0.7); }
        }
        @keyframes emojiPop {
          0% { opacity: 0; transform: scale(0.6) rotate(-10deg); }
          20% { opacity: 1; transform: scale(1.2) rotate(6deg); }
          55% { opacity: 1; transform: scale(1.05) rotate(-4deg); }
          100% { opacity: 0; transform: scale(1.5) rotate(10deg); }
        }

        /* ⚡ LV5 lightning border */
        .lv5 {
          position: relative;
          overflow: hidden;
        }
        .lv5::before {
          content: "";
          position: absolute;
          inset: -2px;
          padding: 2px;
          background: linear-gradient(
            90deg,
            rgba(168,85,247,0.0),
            rgba(255,255,255,0.95),
            rgba(168,85,247,0.0),
            rgba(255,255,255,0.95),
            rgba(168,85,247,0.0)
          );
          background-size: 200% 100%;
          animation: bolt 0.9s linear infinite;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: 0.95;
        }
      `}</style>

      {/* overlays */}
      {BurstsEl}
      {EmojisEl}

      <div style={S.bg}>
        <div style={S.panel}>
          <h1 style={S.title}>🏋️ WORKOUT</h1>

          <div style={S.statsRow}>
            <div style={S.statChip}>STR: {strength}</div>
            <div style={S.statChip}>AGI: {agility}</div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={S.resetBtn}
                onMouseEnter={() => beep()}
                onClick={(e) => {
                  beep(520, 0.12, 0.05);
                  burst(e.clientX, e.clientY, "rgba(255,211,111,0.9)");
                  fullEmoji("🧹");
                  resetToBase();
                }}
              >
                RESET
              </button>

              <button
                style={S.backBtn}
                onMouseEnter={() => beep()}
                onClick={(e) => {
                  beep(660, 0.11, 0.05);
                  burst(e.clientX, e.clientY, "rgba(158,230,255,0.9)");
                  fullEmoji("🏠");
                  window.location.href = "/home";
                }}
              >
                ⬅ HUB
              </button>
            </div>
          </div>

          <div style={S.tabs}>
            <button
              style={{ ...S.tab, ...(mode === "strength" ? S.tabActive : null) }}
              onMouseEnter={() => beep()}
              onClick={(e) => {
                beep(740, 0.11, 0.06);
                burst(e.clientX, e.clientY, "rgba(255,255,255,0.7)");
                fullEmoji("💪");
                setMode("strength");
              }}
            >
              STRENGTH
            </button>

            <button
              style={{ ...S.tab, ...(mode === "agility" ? S.tabActive : null) }}
              onMouseEnter={() => beep()}
              onClick={(e) => {
                beep(740, 0.11, 0.06);
                burst(e.clientX, e.clientY, "rgba(255,255,255,0.7)");
                fullEmoji("⚡");
                setMode("agility");
              }}
            >
              AGILITY (AEROBIC)
            </button>
          </div>

          <div style={S.content}>
            {mode === "strength" ? (
              <>
                <p style={S.subtitle}>
                  Pick a strength level, then <b>CONFIRM</b> to open the camera. MediaPipe Pose will count reps.
                </p>

                <div style={S.list}>
                  {STRENGTH_LEVELS.map((lvl) => {
                    const active = strengthDraft === lvl.level;
                    const t = levelTheme(lvl.level);

                    return (
                      <button
                        key={lvl.level}
                        className={lvl.level === 5 ? "lv5" : undefined}
                        onMouseEnter={(e) => {
                          beep();
                          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.transform = active ? "translateY(-1px)" : "translateY(0)";
                        }}
                        onMouseDown={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.animation = "press 0.08s ease-out forwards";
                        }}
                        onMouseUp={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.animation = "";
                        }}
                        onClick={(e) => {
                          // LV5 = skull (boss)
                          const emoji = lvl.level === 5 ? "💀" : "✨";
                          beep(lvl.level === 5 ? 220 : 880, 0.12, 0.07);
                          burst(e.clientX, e.clientY, t.glow);
                          fullEmoji(emoji);
                          setStrengthDraft(lvl.level);
                        }}
                        style={{
                          ...S.levelRow,
                          ...(active ? S.levelRowActive : null),
                          borderColor: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.75)",
                          background: `linear-gradient(180deg, ${t.bg} 0%, rgba(0,0,0,0.35) 80%)`,
                          boxShadow: active
                            ? `0 0 0 3px rgba(255,255,255,0.25), 10px 10px 0 rgba(0,0,0,0.55), 0 0 22px ${t.glow}`
                            : `6px 6px 0 rgba(0,0,0,0.45)`,
                          animation: "floatIn 0.18s ease-out",
                        }}
                      >
                        <span style={{ ...S.lvChip, background: "rgba(0,0,0,0.35)" }}>LV {lvl.level}</span>

                        <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontWeight: 1000, textTransform: "capitalize", display: "flex", gap: 8, alignItems: "center" }}>
                            {lvl.name}
                            {active && <span style={S.readyTag}>Ready!</span>}
                          </span>
                          <span style={{ fontSize: 11, opacity: 0.95 }}>
                            {t.label} • {lvl.desc}
                          </span>
                        </span>

                        <span style={{ justifySelf: "end", display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                          <span style={S.stars}>{stars(lvl.level)}</span>
                          <span style={{ ...S.badge, background: t.badgeBg, borderColor: "rgba(255,255,255,0.9)" }}>
                            +{strengthGain(lvl.level)} STR {active ? "✅" : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div style={S.actions}>
                  <button
                    style={{
                      ...S.confirmBtn,
                      filter: strengthDraft ? "none" : "grayscale(0.7) opacity(0.75)",
                    }}
                    disabled={!strengthDraft}
                    onMouseEnter={() => beep()}
                    onClick={(e) => {
                      if (!strengthDraft) return;
                      const t = levelTheme(strengthDraft);
                      beep(strengthDraft === 5 ? 160 : 990, 0.12, 0.08);
                      burst(e.clientX, e.clientY, t.glow);
                      fullEmoji(strengthDraft === 5 ? "💀" : "🔥");
                      confirmStrength();
                    }}
                  >
                    CONFIRM ➜ CAMERA
                  </button>
                </div>

                <div style={S.tip}>
                  After you press <b>Finish</b> on the camera page, STR will be added automatically when you return.
                </div>
              </>
            ) : (
              <>
                <p style={S.subtitle}>
                  Choose aerobic type and duration. Agility gain = <b>+1 AGI per 10 minutes</b>.
                </p>

                <div
                  style={{
                    ...S.agiCard,
                    boxShadow: `8px 8px 0 rgba(0,0,0,0.55), 0 0 18px ${agiT.glow}`,
                    background: `linear-gradient(180deg, ${agiT.bg} 0%, rgba(0,0,0,0.35) 85%)`,
                    animation: "floatIn 0.18s ease-out",
                  }}
                >
                  <div style={S.agiHeader}>
                    <div style={S.agiTitle}>
                      {agiT.icon} AGILITY TRAINING
                    </div>
                    <div style={{ ...S.agiChip, background: agiT.chip }}>
                      {aerobicDraft} • {minutesDraft} min
                    </div>
                  </div>

                  <div style={S.agilityGrid}>
                    <div style={S.inputWrap}>
                      <div style={S.label}>Activity</div>
                      <select
                        style={S.select}
                        value={aerobicDraft}
                        onMouseEnter={() => beep()}
                        onChange={(e) => {
                          beep(760, 0.09, 0.05);
                          setAerobicDraft(e.target.value as AerobicType);
                        }}
                      >
                        {AEROBIC_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={S.inputWrap}>
                      <div style={S.label}>Duration (minutes)</div>
                      <input
                        style={S.input}
                        type="number"
                        min={0}
                        step={5}
                        value={minutesDraft}
                        onMouseEnter={() => beep()}
                        onChange={(e) => {
                          beep(720, 0.08, 0.05);
                          setMinutesDraft(Number(e.target.value));
                        }}
                      />
                    </div>

                    <div style={{ ...S.preview, textShadow: `0 0 14px ${agiT.glow}` }}>
                      Gain: <span style={S.previewGlow}>+{agiPts} AGI</span>
                      {agiPts >= 3 ? "  🔥" : agiPts >= 2 ? "  ✨" : ""}
                    </div>
                  </div>

                  <div style={S.actions}>
                    <button
                      style={{
                        ...S.confirmBtn,
                        background: agiT.bg,
                        filter: agilityHasChanges ? "none" : "grayscale(0.7) opacity(0.75)",
                      }}
                      disabled={!agilityHasChanges}
                      onMouseEnter={() => beep()}
                      onClick={(e) => {
                        if (!agilityHasChanges) return;
                        beep(920, 0.12, 0.07);
                        burst(e.clientX, e.clientY, agiT.glow);
                        fullEmoji("⚡");
                        confirmAgility();
                      }}
                    >
                      CONFIRM ✅
                    </button>

                    <button
                      style={{
                        ...S.cancelBtn,
                        filter: !agilityHasChanges || !aerobicConfirmed ? "grayscale(0.7) opacity(0.75)" : "none",
                      }}
                      disabled={!agilityHasChanges || !aerobicConfirmed}
                      onMouseEnter={() => beep()}
                      onClick={(e) => {
                        if (!aerobicConfirmed) return;
                        beep(560, 0.11, 0.06);
                        burst(e.clientX, e.clientY, "rgba(255,123,123,0.8)");
                        fullEmoji("❌");
                        cancelAgility();
                      }}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0b1020" },
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
    width: "min(900px, 96vw)",
    padding: 22,
    background: "rgba(15, 23, 42, 0.85)",
    border: "6px solid rgba(255,255,255,0.85)",
    boxShadow: "10px 10px 0 rgba(0,0,0,0.65)",
    color: "white",
  },
  title: {
    margin: 0,
    textAlign: "center",
    letterSpacing: 2,
    textShadow: "3px 3px 0 rgba(0,0,0,0.7)",
  },

  statsRow: {
    marginTop: 12,
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  statChip: {
    border: "3px solid rgba(255,255,255,0.85)",
    padding: "8px 10px",
    background: "rgba(0,0,0,0.35)",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.45)",
    fontWeight: 900,
  },
  backBtn: {
    border: "3px solid rgba(255,255,255,0.85)",
    padding: "8px 10px",
    background: "#9ee6ff",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.45)",
    cursor: "pointer",
    fontWeight: 900,
  },
  resetBtn: {
    border: "3px solid rgba(255,255,255,0.85)",
    padding: "8px 10px",
    background: "#ffd36f",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.45)",
    cursor: "pointer",
    fontWeight: 900,
  },

  tabs: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 },
  tab: {
    padding: "10px 12px",
    border: "4px solid rgba(255,255,255,0.85)",
    background: "rgba(0,0,0,0.25)",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.45)",
    cursor: "pointer",
    fontWeight: 900,
    color: "white",
  },
  tabActive: { background: "rgba(255,255,255,0.18)" },

  content: { minHeight: 520, marginTop: 12 },
  subtitle: { margin: "6px 0 12px 0", textAlign: "center", fontSize: 12, opacity: 0.95 },

  list: {
    display: "grid",
    gap: 12,
    maxWidth: 760,
    margin: "0 auto",
    overflowY: "auto",
    paddingRight: 6,
  },

  levelRow: {
    display: "grid",
    gridTemplateColumns: "90px 1fr 190px",
    gap: 12,
    alignItems: "center",
    padding: "12px 12px",
    border: "3px solid rgba(255,255,255,0.75)",
    boxShadow: "6px 6px 0 rgba(0,0,0,0.45)",
    cursor: "pointer",
    textAlign: "left",
    color: "white",
    fontWeight: 900,
    transition: "transform 120ms ease, box-shadow 120ms ease, filter 120ms ease",
    transform: "translateY(0)",
  },
  levelRowActive: { transform: "translateY(-1px)", filter: "saturate(1.05)" },

  lvChip: {
    justifySelf: "start",
    border: "2px solid rgba(255,255,255,0.85)",
    padding: "6px 8px",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.35)",
    fontWeight: 1000,
    textAlign: "center",
  },

  badge: {
    border: "2px solid rgba(255,255,255,0.85)",
    padding: "8px 10px",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.35)",
    textAlign: "center",
    fontWeight: 1000,
    whiteSpace: "nowrap",
  },

  stars: {
    fontSize: 12,
    textShadow: "2px 2px 0 rgba(0,0,0,0.55)",
    opacity: 0.95,
  },

  readyTag: {
    fontSize: 11,
    fontWeight: 1000,
    padding: "2px 6px",
    border: "2px solid rgba(255,255,255,0.9)",
    background: "rgba(0,0,0,0.35)",
    boxShadow: "2px 2px 0 rgba(0,0,0,0.45)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  actions: { display: "flex", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" },
  confirmBtn: {
    padding: "10px 14px",
    border: "4px solid rgba(255,255,255,0.85)",
    background: "#ffd36f",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.45)",
    cursor: "pointer",
    fontWeight: 900,
    color: "black",
  },
  cancelBtn: {
    padding: "10px 14px",
    border: "4px solid rgba(255,255,255,0.85)",
    background: "#ff7b7b",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.45)",
    cursor: "pointer",
    fontWeight: 900,
    color: "black",
  },

  agiCard: {
    maxWidth: 760,
    margin: "0 auto",
    padding: 14,
    border: "4px solid rgba(255,255,255,0.85)",
    boxShadow: "8px 8px 0 rgba(0,0,0,0.55)",
  },
  agiHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  agiTitle: {
    fontWeight: 1000,
    letterSpacing: 1,
    textShadow: "2px 2px 0 rgba(0,0,0,0.6)",
  },
  agiChip: {
    border: "3px solid rgba(255,255,255,0.85)",
    padding: "6px 10px",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.45)",
    fontWeight: 1000,
  },

  agilityGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 12,
    alignItems: "end",
  },
  inputWrap: {
    padding: 10,
    border: "3px solid rgba(255,255,255,0.75)",
    background: "rgba(0,0,0,0.25)",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.4)",
  },
  label: { fontSize: 12, marginBottom: 6, textAlign: "left", opacity: 0.95 },
  select: {
    width: "100%",
    padding: "10px 10px",
    border: "3px solid rgba(255,255,255,0.85)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    fontWeight: 900,
    outline: "none",
  },
  input: {
    width: "100%",
    padding: "10px 10px",
    border: "3px solid rgba(255,255,255,0.85)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    fontWeight: 900,
    outline: "none",
  },
  preview: {
    gridColumn: "1 / -1",
    textAlign: "center",
    padding: "10px 12px",
    border: "3px solid rgba(255,255,255,0.75)",
    background: "rgba(0,0,0,0.25)",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.4)",
    fontWeight: 1000,
  },
  previewGlow: { fontWeight: 1100 },

  tip: { marginTop: 12, fontSize: 12, opacity: 0.9, textAlign: "center" },

  // FX
  fxLayer: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1000 },
  burst: { position: "absolute", width: 1, height: 1, pointerEvents: "none" },
  spark: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 10,
    height: 4,
    background: "rgba(255,255,255,0.95)",
    transformOrigin: "0 50%",
    animationName: "spark",
    animationDuration: "480ms",
    animationTimingFunction: "ease-out",
    animationFillMode: "forwards",
  } as any,

  // FULLSCREEN emoji
  emojiLayer: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1100 },
  emojiPop: {
    position: "absolute",
    left: "50%",
    top: "45%",
    transform: "translate(-50%, -50%)",
    fontSize: 120,
    filter: "drop-shadow(0 12px 0 rgba(0,0,0,0.55))",
    animation: "emojiPop 520ms ease-out forwards",
  },
};
