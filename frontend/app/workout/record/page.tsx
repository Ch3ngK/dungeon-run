"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
      // dynamic import makes Next bundling happier
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

        // ---- Rep logic (simple but works) ----
        // Pushups/dips: elbow angle opens/closes
        // Pullups: wrist/shoulder vertical relation (rough)
        let ok = visOk;
        let nextStage = localStage;

        if (exercise === "pullup") {
          // "down" when wrists below shoulders; "up" when wrists near/above shoulders
          // (y increases downward in mediapipe coords)
          const wristAboveShoulder = wrist.y < shoulder.y + 0.02;
          const wristBelowShoulder = wrist.y > shoulder.y + 0.10;

          if (wristBelowShoulder) nextStage = "down";
          if (wristAboveShoulder && localStage === "down") {
            nextStage = "up";
            localReps += 1;
          }
          ok = ok && !!hip; // prefer torso visible for pullups
        } else {
          const a = angleDeg(shoulder, elbow, wrist);

          // optional “form” hint: keep torso somewhat visible
          ok = ok && (!!hip ? (hip.visibility ?? 1) > 0.35 : true);

          // thresholds
          const downThresh = exercise === "dips" ? 95 : 100;
          const upThresh = exercise === "dips" ? 165 : 160;

          if (a <= downThresh) nextStage = "down";
          if (a >= upThresh && localStage === "down") {
            nextStage = "up";
            localReps += 1;
          }
        }

        // commit to React state
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
    };
  }, [ready, error, exercise]);

  function finish() {
    // store result for workout page to consume
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
    transform: "scaleX(-1)", // mirror selfie camera for user friendliness
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
};
