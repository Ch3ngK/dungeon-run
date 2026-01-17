"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

// Simple exercise mapping for your 5 STR levels
type ExerciseKind = "pushup" | "dips" | "pullup";

function levelToExercise(level: number): ExerciseKind {
  if (level >= 1 && level <= 3) return "pushup"; // incline/knee/pushup
  if (level === 4) return "dips";
  return "pullup"; // level 5
}

// MediaPipe landmark index (PoseLandmark enum values)
const LM = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;

type MPPoint = { x: number; y: number; z?: number; visibility?: number };

function angleDeg(a: MPPoint, b: MPPoint, c: MPPoint) {
  // angle at b from ba to bc
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;

  const dot = abx * cbx + aby * cby;
  const mag1 = Math.sqrt(abx * abx + aby * aby);
  const mag2 = Math.sqrt(cbx * cbx + cby * cby);
  if (mag1 === 0 || mag2 === 0) return 180;

  let cos = dot / (mag1 * mag2);
  cos = Math.max(-1, Math.min(1, cos));
  return (Math.acos(cos) * 180) / Math.PI;
}

function pickSide(
  l: MPPoint | undefined,
  r: MPPoint | undefined
): MPPoint | undefined {
  // prefer higher visibility; fallback to whichever exists
  const lv = l?.visibility ?? 0;
  const rv = r?.visibility ?? 0;
  if (l && r) return lv >= rv ? l : r;
  return l ?? r;
}

type ConfettiPiece = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  life: number;
  maxLife: number;
};

export default function WorkoutRecordPage() {
  const sp = useSearchParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reps, setReps] = useState(0);
  const [stage, setStage] = useState<"up" | "down" | "unknown">("unknown");
  const [formOk, setFormOk] = useState<boolean>(true);

  const level = useMemo(() => Number(sp.get("level") ?? "1"), [sp]);
  const gain = useMemo(() => Number(sp.get("gain") ?? "5"), [sp]);
  const exercise = useMemo(() => levelToExercise(level), [level]);

  // ✅ Quotes feature (every 5 reps)
  const quotes = useMemo(
    () => [
      "No pain, no gain.",
      "Stronger than yesterday.",
      "Discipline beats motivation.",
      "Your only limit is you.",
      "Push harder than last time.",
      "Sweat now, shine later.",
      "One more rep!",
      "Don’t stop when you’re tired — stop when you’re done.",
      "Small progress is still progress.",
      "The body achieves what the mind believes.",
      "Pain is temporary. Pride is forever.",
      "You didn’t come this far to only come this far.",
    ],
    []
  );
  const [quote, setQuote] = useState<string | null>(null);
  const quoteTimeoutRef = useRef<number | null>(null);

  // 🎉 Special FX (every 10 reps)
  const [celebrateText, setCelebrateText] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const celebrateTimeoutRef = useRef<number | null>(null);

  // confetti state + animation loop
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const confettiRafRef = useRef<number | null>(null);
  const confettiIdRef = useRef(1);

  // milestone guards (prevent spam)
  const lastQuoteMilestoneRef = useRef<number>(0);
  const lastFxMilestoneRef = useRef<number>(0);

  function beep() {
    try {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = 880;

      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);

      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      o.start(now);
      o.stop(now + 0.2);

      // close context a bit later
      setTimeout(() => ctx.close?.(), 300);
    } catch {
      // ignore audio errors
    }
  }

  function startConfettiBurst() {
    const count = 60;
    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < count; i++) {
      const id = confettiIdRef.current++;
      const x = Math.random(); // 0..1 (relative)
      const y = -0.1 - Math.random() * 0.2;
      const vx = (Math.random() - 0.5) * 0.008;
      const vy = 0.004 + Math.random() * 0.006;
      const rot = Math.random() * 360;
      const vr = (Math.random() - 0.5) * 8;
      const size = 6 + Math.random() * 8;
      const maxLife = 140 + Math.floor(Math.random() * 50);
      pieces.push({
        id,
        x,
        y,
        vx,
        vy,
        rot,
        vr,
        size,
        life: 0,
        maxLife,
      });
    }
    setConfetti((prev) => [...prev, ...pieces]);
  }

  function runConfettiLoop() {
    if (confettiRafRef.current) return;
    const tick = () => {
      setConfetti((prev) => {
        if (prev.length === 0) return prev;

        const next = prev
          .map((p) => {
            const gravity = 0.00008;
            const drag = 0.999;

            const nx = p.x + p.vx;
            const ny = p.y + p.vy;
            const nvy = (p.vy + gravity) * drag;

            return {
              ...p,
              x: nx,
              y: ny,
              vy: nvy,
              vx: p.vx * drag,
              rot: p.rot + p.vr,
              life: p.life + 1,
            };
          })
          .filter((p) => p.life < p.maxLife && p.y < 1.3);

        return next;
      });

      confettiRafRef.current = requestAnimationFrame(tick);
    };

    confettiRafRef.current = requestAnimationFrame(tick);
  }

  function stopConfettiLoopSoon() {
    // If no pieces left, stop RAF to save CPU
    setTimeout(() => {
      setConfetti((prev) => {
        if (prev.length === 0 && confettiRafRef.current) {
          cancelAnimationFrame(confettiRafRef.current);
          confettiRafRef.current = null;
        }
        return prev;
      });
    }, 800);
  }

  function maybeShowQuote(currentReps: number) {
    if (currentReps <= 0) return;
    if (currentReps % 5 !== 0) return;
    if (lastQuoteMilestoneRef.current === currentReps) return;

    lastQuoteMilestoneRef.current = currentReps;

    const random = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(random);

    if (quoteTimeoutRef.current) window.clearTimeout(quoteTimeoutRef.current);
    quoteTimeoutRef.current = window.setTimeout(() => setQuote(null), 2500);
  }

  function maybeTriggerFx(currentReps: number) {
    if (currentReps <= 0) return;
    if (currentReps % 10 !== 0) return;
    if (lastFxMilestoneRef.current === currentReps) return;

    lastFxMilestoneRef.current = currentReps;

    // big text + flash + confetti + sound
    setCelebrateText(`🔥 ${currentReps} REPS!`);
    setFlash(true);
    beep();
    startConfettiBurst();
    runConfettiLoop();

    // clear flash quickly
    setTimeout(() => setFlash(false), 180);

    if (celebrateTimeoutRef.current)
      window.clearTimeout(celebrateTimeoutRef.current);
    celebrateTimeoutRef.current = window.setTimeout(() => {
      setCelebrateText(null);
      stopConfettiLoopSoon();
    }, 1200);
  }

  // Camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      try {
        setError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch (e: any) {
        setError(
          e?.message ||
            "Camera permission denied / unavailable. (Tip: camera needs HTTPS or localhost.)"
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // MediaPipe Pose loop (NO @mediapipe/camera_utils)
  useEffect(() => {
    if (!ready || error) return;

    let raf = 0;
    let stopped = false;

    // local refs to avoid stale closures
    let localStage: "up" | "down" | "unknown" = "unknown";
    let localReps = 0;

    async function boot() {
      const poseMod: any = await import("@mediapipe/pose");
      const Pose = poseMod.Pose;

      const pose = new Pose({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((res: any) => {
        if (!res?.poseLandmarks) return;

        const L = res.poseLandmarks as MPPoint[];

        // pick best side
        const shoulder = pickSide(L[LM.LEFT_SHOULDER], L[LM.RIGHT_SHOULDER]);
        const elbow = pickSide(L[LM.LEFT_ELBOW], L[LM.RIGHT_ELBOW]);
        const wrist = pickSide(L[LM.LEFT_WRIST], L[LM.RIGHT_WRIST]);
        const hip = pickSide(L[LM.LEFT_HIP], L[LM.RIGHT_HIP]);

        if (!shoulder || !elbow || !wrist) return;

        // basic visibility check
        const visOk =
          (shoulder.visibility ?? 1) > 0.5 &&
          (elbow.visibility ?? 1) > 0.5 &&
          (wrist.visibility ?? 1) > 0.5;

        let ok = visOk;
        let nextStage = localStage;

        if (exercise === "pullup") {
          const wristAboveShoulder = wrist.y < shoulder.y + 0.02;
          const wristBelowShoulder = wrist.y > shoulder.y + 0.10;

          if (wristBelowShoulder) nextStage = "down";
          if (wristAboveShoulder && localStage === "down") {
            nextStage = "up";
            localReps += 1;

            // ✅ features
            maybeShowQuote(localReps);
            maybeTriggerFx(localReps);
          }
          ok = ok && !!hip;
        } else {
          const a = angleDeg(shoulder, elbow, wrist);

          ok = ok && (!!hip ? (hip.visibility ?? 1) > 0.35 : true);

          const downThresh = exercise === "dips" ? 95 : 100;
          const upThresh = exercise === "dips" ? 165 : 160;

          if (a <= downThresh) nextStage = "down";
          if (a >= upThresh && localStage === "down") {
            nextStage = "up";
            localReps += 1;

            // ✅ features
            maybeShowQuote(localReps);
            maybeTriggerFx(localReps);
          }
        }

        localStage = nextStage;
        setStage(nextStage);
        setFormOk(ok);
        setReps(localReps);
      });

      const tick = async () => {
        if (stopped) return;
        if (videoRef.current) {
          try {
            await pose.send({ image: videoRef.current });
          } catch {
            // ignore occasional send errors
          }
        }
        raf = requestAnimationFrame(tick);
      };

      tick();

      return () => {
        stopped = true;
        cancelAnimationFrame(raf);
        try {
          pose.close?.();
        } catch {}
      };
    }

    let cleanup: null | (() => void) = null;
    boot().then((c) => (cleanup = c ?? null));

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      cleanup?.();

      if (quoteTimeoutRef.current) {
        window.clearTimeout(quoteTimeoutRef.current);
        quoteTimeoutRef.current = null;
      }
      if (celebrateTimeoutRef.current) {
        window.clearTimeout(celebrateTimeoutRef.current);
        celebrateTimeoutRef.current = null;
      }
      if (confettiRafRef.current) {
        cancelAnimationFrame(confettiRafRef.current);
        confettiRafRef.current = null;
      }
    };
  }, [ready, error, exercise, quotes]);

  function finish() {
    localStorage.setItem(
      "workout_record_result",
      JSON.stringify({
        kind: "strength",
        level: Number.isFinite(level) ? level : 1,
        gain: Number.isFinite(gain) ? gain : 5,
        reps,
        formOk,
        ts: Date.now(),
      })
    );
    window.location.href = "/workout";
  }

  function giveUp() {
    window.location.href = "/workout";
  }

  return (
    <main style={S.page}>
      {/* Flash overlay */}
      {flash && <div style={S.flash} />}

      <div style={S.bg}>
        <div style={S.panel}>
          <h1 style={S.title}>📹 RECORD STRENGTH</h1>

          <div style={S.infoRow}>
            <div style={S.chip}>LV {Number.isFinite(level) ? level : 1}</div>
            <div style={S.chip}>
              Exercise:{" "}
              {exercise === "pushup"
                ? "Push-up"
                : exercise === "dips"
                ? "Dips"
                : "Pull-up"}
            </div>
            <div style={S.chip}>
              Reward: +{Number.isFinite(gain) ? gain : 5} STR
            </div>
          </div>

          <div style={S.videoFrame}>
            {error ? (
              <div style={S.errorBox}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>
                  Camera Error
                </div>
                <div style={{ fontSize: 12 }}>{error}</div>
              </div>
            ) : (
              <>
                {!ready && <div style={S.loading}>Opening camera...</div>}
                <video ref={videoRef} muted playsInline style={S.video} />

                {/* Confetti layer */}
                <div style={S.confettiLayer}>
                  {confetti.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        ...S.confettiPiece,
                        left: `${p.x * 100}%`,
                        top: `${p.y * 100}%`,
                        width: p.size,
                        height: p.size * 0.6,
                        transform: `rotate(${p.rot}deg)`,
                        opacity: 1 - p.life / p.maxLife,
                      }}
                    />
                  ))}
                </div>

                {/* Big celebration text */}
                {celebrateText && (
                  <div style={S.celebrateWrap}>
                    <div style={S.celebrateText}>{celebrateText}</div>
                  </div>
                )}

                <div style={S.hud}>
                  <div>
                    Reps: <b>{reps}</b>
                  </div>
                  <div>
                    Stage: <b>{stage}</b>
                  </div>
                  <div>
                    Form:{" "}
                    <b style={{ color: formOk ? "#22c55e" : "#ff7b7b" }}>
                      {formOk ? "OK" : "BAD"}
                    </b>
                  </div>

                  {/* Quote popup */}
                  {quote && <div style={S.quoteBox}>{quote}</div>}
                </div>
              </>
            )}
          </div>

          <div style={S.controls}>
            <button
              style={{ ...S.btn, ...S.btnFinish }}
              onClick={finish}
              disabled={!!error}
            >
              ✅ Finish
            </button>
            <button style={{ ...S.btn, ...S.btnGiveUp }} onClick={giveUp}>
              ❌ Give Up
            </button>
          </div>

          <div style={S.tip}>
            Tip: Camera works on <b>https</b> or <b>localhost</b>. If you are on
            normal http LAN IP, browser will block it.
          </div>
        </div>
      </div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0b1020", position: "relative" },
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
    padding: 18,
    background: "rgba(15, 23, 42, 0.85)",
    border: "5px solid rgba(255,255,255,0.85)",
    boxShadow: "10px 10px 0 rgba(0,0,0,0.6)",
    color: "white",
  },
  title: {
    margin: 0,
    textAlign: "center",
    letterSpacing: 2,
    textShadow: "3px 3px 0 rgba(0,0,0,0.7)",
  },
  infoRow: {
    marginTop: 12,
    display: "flex",
    gap: 10,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  chip: {
    padding: "8px 10px",
    border: "3px solid rgba(255,255,255,0.85)",
    background: "rgba(0,0,0,0.35)",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.45)",
    fontWeight: 800,
  },
  videoFrame: {
    marginTop: 14,
    border: "4px solid rgba(255,255,255,0.85)",
    background: "rgba(0,0,0,0.6)",
    height: 420,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)", // mirror selfie camera
  },
  hud: {
    position: "absolute",
    left: 10,
    top: 10,
    padding: "8px 10px",
    border: "3px solid rgba(255,255,255,0.85)",
    background: "rgba(0,0,0,0.45)",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.45)",
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    fontSize: 12,
    alignItems: "center",
    zIndex: 5,
  },
  quoteBox: {
    marginTop: 6,
    padding: "8px 10px",
    border: "3px solid rgba(255,255,255,0.85)",
    background: "rgba(0,0,0,0.7)",
    boxShadow: "4px 4px 0 rgba(0,0,0,0.45)",
    color: "#ffd700",
    fontWeight: 900,
    textAlign: "center",
    maxWidth: 360,
  },
  loading: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    background: "rgba(0,0,0,0.35)",
  },
  errorBox: {
    padding: 14,
    maxWidth: 520,
    border: "3px solid #ff7b7b",
    background: "rgba(127, 29, 29, 0.55)",
  },
  controls: {
    marginTop: 14,
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  btn: {
    padding: "10px 14px",
    border: "4px solid rgba(255,255,255,0.85)",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "5px 5px 0 rgba(0,0,0,0.55)",
  },
  btnFinish: { background: "#22c55e" },
  btnGiveUp: { background: "#ff7b7b" },
  tip: {
    marginTop: 10,
    fontSize: 12,
    opacity: 0.9,
    textAlign: "center",
  },

  // 🎉 FX styles
  flash: {
    position: "fixed",
    inset: 0,
    background: "rgba(255,255,255,0.35)",
    pointerEvents: "none",
    zIndex: 999,
  },
  celebrateWrap: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    zIndex: 10,
  },
  celebrateText: {
    padding: "12px 16px",
    border: "4px solid rgba(255,255,255,0.9)",
    background: "rgba(0,0,0,0.65)",
    boxShadow: "8px 8px 0 rgba(0,0,0,0.6)",
    fontWeight: 1000,
    fontSize: 28,
    letterSpacing: 2,
    textShadow: "3px 3px 0 rgba(0,0,0,0.7)",
    animation: "pop 0.22s ease-out",
  } as any,

  confettiLayer: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 9,
  },
  confettiPiece: {
    position: "absolute",
    background: "rgba(255, 215, 0, 0.95)",
    border: "1px solid rgba(255,255,255,0.8)",
    boxShadow: "2px 2px 0 rgba(0,0,0,0.4)",
  },

  // NOTE: inline keyframes hack with style tag is better,
  // but you can keep this and add keyframes in global CSS if you want.
};
