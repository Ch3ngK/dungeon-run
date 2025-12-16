"use client";

import { useEffect, useRef } from "react";

export default function Train() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    }
    startCamera();
  }, []);

  return (
    <div>
      <h1>Train</h1>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: "100%", maxWidth: "500px" }}
      ></video>
    </div>
  );
}
