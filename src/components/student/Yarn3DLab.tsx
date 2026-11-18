"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RotateCcw, Play, Pause, Move3d } from "lucide-react";

export type Lab3DMode = "ply" | "wrap_reel" | "beesley";

interface Yarn3DLabProps {
  mode: Lab3DMode;
  plyCount: number;
  singleTex: number;
  wrapTurns: number;
  wrapWeightGrains: number;
  beesleyThreads: number;
}

const PLY_COLORS = [0x22d3ee, 0xfbbf24, 0x34d399, 0xf472b6];

function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
      obj.geometry.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        mat.dispose();
      }
    }
  });
}

export default function Yarn3DLab({
  mode,
  plyCount,
  singleTex,
  wrapTurns,
  wrapWeightGrains,
  beesleyThreads,
}: Yarn3DLabProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [wrapStep, setWrapStep] = useState<1 | 2 | 3>(1);
  const [resetTick, setResetTick] = useState(0);

  const stateRef = useRef({
    isPlaying: true,
    wrapStep: 1 as 1 | 2 | 3,
    rotX: 0.25,
    rotY: 0.45,
    zoom: 1,
  });

  useEffect(() => {
    stateRef.current.isPlaying = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    stateRef.current.wrapStep = wrapStep;
  }, [wrapStep]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 560;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 7.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.65);
    rimLight.position.set(-5, -3, -4);
    scene.add(rimLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const grid = new THREE.GridHelper(12, 16, 0x1e293b, 0x111827);
    grid.position.y = -2.1;
    rootGroup.add(grid);

    let reelWheel: THREE.Group | null = null;
    let panSkein: THREE.Mesh | null = null;
    let beesleyBeam: THREE.Group | null = null;
    const beesleyTargetTilt = Math.max(
      -0.32,
      Math.min(0.32, (30 - beesleyThreads) * 0.014)
    );

    if (mode === "ply") {
      const clampedPly = Math.max(1, Math.min(4, plyCount));
      const strandRadius = Math.max(0.08, Math.min(0.28, 0.065 + Math.sqrt(Math.max(1, singleTex)) * 0.022));
      const helixRadius = clampedPly === 1 ? 0 : strandRadius * (clampedPly === 2 ? 1.05 : clampedPly === 3 ? 1.22 : 1.38);
      const length = 5.4;
      const turns = 3.2;
      const samples = 96;

      for (let p = 0; p < clampedPly; p++) {
        const phase = (p * Math.PI * 2) / clampedPly;
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= samples; i++) {
          const t = i / samples;
          const x = -length / 2 + t * length;
          const angle = t * Math.PI * 2 * turns + phase;
          const y = Math.cos(angle) * helixRadius;
          const z = Math.sin(angle) * helixRadius;
          pts.push(new THREE.Vector3(x, y, z));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        const geo = new THREE.TubeGeometry(curve, 96, strandRadius, 16, false);
        const colorHex = PLY_COLORS[p % PLY_COLORS.length] ?? 0x22d3ee;
        const mat = new THREE.MeshStandardMaterial({
          color: colorHex,
          roughness: 0.42,
          metalness: 0.12,
        });
        const mesh = new THREE.Mesh(geo, mat);
        rootGroup.add(mesh);
      }

      const binderRadius = helixRadius + strandRadius * 1.08;
      [-length / 2 + 0.12, length / 2 - 0.12].forEach((bx) => {
        const ringGeo = new THREE.TorusGeometry(binderRadius, 0.035, 12, 32);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.3 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.y = Math.PI / 2;
        ring.position.x = bx;
        rootGroup.add(ring);
      });
    } else if (mode === "wrap_reel") {
      const coneGroup = new THREE.Group();
      coneGroup.position.set(-2.9, -1.1, 0);
      const coneBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.52, 0.16, 24),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
      );
      coneGroup.add(coneBase);
      const yarnCone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.44, 1.35, 24),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.65 })
      );
      yarnCone.position.y = 0.75;
      coneGroup.add(yarnCone);
      rootGroup.add(coneGroup);

      const stand = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 2.5, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5, roughness: 0.4 })
      );
      stand.position.set(-0.85, -0.8, -0.45);
      rootGroup.add(stand);

      reelWheel = new THREE.Group();
      reelWheel.position.set(-0.85, 0.25, 0);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.9, 20),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.3 })
      );
      hub.rotation.x = Math.PI / 2;
      reelWheel.add(hub);

      for (let a = 0; a < 6; a++) {
        const ang = (a * Math.PI * 2) / 6;
        const arm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.035, 1.35, 10),
          new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.7, roughness: 0.25 })
        );
        arm.position.set(Math.cos(ang) * 0.68, Math.sin(ang) * 0.68, 0);
        arm.rotation.z = ang + Math.PI / 2;
        reelWheel.add(arm);

        const bar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.75, 12),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.65, roughness: 0.3 })
        );
        bar.rotation.x = Math.PI / 2;
        bar.position.set(Math.cos(ang) * 1.3, Math.sin(ang) * 1.3, 0);
        reelWheel.add(bar);
      }

      const woundBand = new THREE.Mesh(
        new THREE.CylinderGeometry(1.32, 1.32, 0.36, 6),
        new THREE.MeshStandardMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.72, roughness: 0.6 })
      );
      woundBand.rotation.x = Math.PI / 2;
      reelWheel.add(woundBand);
      rootGroup.add(reelWheel);

      const balanceGroup = new THREE.Group();
      balanceGroup.position.set(2.1, -1.5, 0);
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.55, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.3 })
      );
      balanceGroup.add(body);
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.22, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.7 })
      );
      screen.position.set(0, 0.02, 0.76);
      balanceGroup.add(screen);

      const pan = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.62, 0.06, 28),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 })
      );
      pan.position.set(0, 0.34, -0.05);
      balanceGroup.add(pan);

      panSkein = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.11, 14, 28),
        new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.6 })
      );
      panSkein.rotation.x = Math.PI / 2;
      panSkein.position.set(0, 0.48, -0.05);
      balanceGroup.add(panSkein);

      rootGroup.add(balanceGroup);
    } else {
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 0.22, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.3 })
      );
      base.position.set(0, -1.65, 0);
      rootGroup.add(base);

      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.16, 2.6, 20),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.78, roughness: 0.25 })
      );
      pillar.position.set(-0.15, -0.3, 0);
      rootGroup.add(pillar);

      const datumPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.5, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 })
      );
      datumPost.position.set(1.85, -0.85, 0);
      rootGroup.add(datumPost);

      const datumLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.05, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.8 })
      );
      datumLine.position.set(1.85, 0.98, 0);
      rootGroup.add(datumLine);

      beesleyBeam = new THREE.Group();
      beesleyBeam.position.set(-0.15, 0.98, 0);
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 0.09, 0.09),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.75, roughness: 0.25 })
      );
      bar.position.set(0.15, 0, 0);
      beesleyBeam.add(bar);

      const rider = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.24, 18),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 })
      );
      rider.position.set(1.35, -0.14, 0);
      beesleyBeam.add(rider);

      const hookStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.45, 10),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8 })
      );
      hookStem.position.set(-1.55, -0.24, 0);
      beesleyBeam.add(hookStem);

      const visibleThreads = Math.max(1, Math.min(12, Math.round(beesleyThreads / 4)));
      for (let t = 0; t < visibleThreads; t++) {
        const strand = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.018, 0.75, 8),
          new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.55 })
        );
        strand.position.set(-1.55 + (t - visibleThreads / 2) * 0.032, -0.78, 0);
        beesleyBeam.add(strand);
      }

      rootGroup.add(beesleyBeam);

      const swatch = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.05, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.85 })
      );
      swatch.position.set(-1.35, -1.5, 0.2);
      rootGroup.add(swatch);
    }

    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      stateRef.current.rotY += dx * 0.01;
      stateRef.current.rotX = Math.max(-1.1, Math.min(1.1, stateRef.current.rotX + dy * 0.01));
    };
    const onPointerUp = () => {
      isDragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      stateRef.current.zoom = Math.max(0.6, Math.min(1.85, stateRef.current.zoom - e.deltaY * 0.001));
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    domEl.addEventListener("wheel", onWheel, { passive: false });

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth || 560;
      const h = container.clientHeight || 320;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);

      if (stateRef.current.isPlaying && !isDragging && mode === "ply") {
        stateRef.current.rotY += 0.004;
      }

      if (reelWheel && stateRef.current.isPlaying && stateRef.current.wrapStep === 1) {
        reelWheel.rotation.z -= 0.045;
      }
      if (panSkein) {
        panSkein.visible = stateRef.current.wrapStep >= 2;
        panSkein.position.y =
          stateRef.current.wrapStep === 3 && stateRef.current.isPlaying
            ? 0.48 + Math.sin(Date.now() * 0.004) * 0.015
            : 0.48;
      }
      if (beesleyBeam) {
        beesleyBeam.rotation.z += (beesleyTargetTilt - beesleyBeam.rotation.z) * 0.1;
      }

      rootGroup.rotation.x = stateRef.current.rotX;
      rootGroup.rotation.y = stateRef.current.rotY;
      camera.position.z = 7.2 / stateRef.current.zoom;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      domEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      domEl.removeEventListener("wheel", onWheel);
      disposeObject3D(scene);
      renderer.dispose();
    };
  }, [mode, plyCount, singleTex, wrapTurns, beesleyThreads, resetTick]);

  const handleReset = () => {
    stateRef.current.rotX = 0.25;
    stateRef.current.rotY = 0.45;
    stateRef.current.zoom = 1;
    setResetTick((t) => t + 1);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium">
          <Move3d className="w-4 h-4" />
          <span>
            {mode === "ply" && `3D ${plyCount}-Ply Helical Yarn (${singleTex.toFixed(1)} Tex/ply)`}
            {mode === "wrap_reel" && `3D Wrap Reel (${wrapTurns} turns) + Balance (${wrapWeightGrains.toFixed(1)} gr)`}
            {mode === "beesley" && `3D Beesley's Balance (${beesleyThreads} threads)`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {mode === "wrap_reel" && (
            <div className="flex items-center gap-1 mr-2">
              {([1, 2, 3] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setWrapStep(s)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                    wrapStep === s
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s === 1 ? "1. Wind" : s === 2 ? "2. Cut Lea" : "3. Weigh"}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div ref={mountRef} className="w-full h-[290px] sm:h-[330px] cursor-grab active:cursor-grabbing" />

      <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>{"\u09ae\u09be\u0989\u09b8/\u099f\u09be\u099a \u09a6\u09bf\u09df\u09c7 \u09a1\u09cd\u09b0\u09cd\u09af\u09be\u0997 \u0995\u09b0\u09c7 \u09e9\u09ec\u09e6\u00b0 \u0998\u09c1\u09b0\u09bf\u09df\u09c7 \u098f\u09ac\u0982 \u09b8\u09cd\u0995\u09cd\u09b0\u09b2 \u0995\u09b0\u09c7 \u099c\u09c1\u09ae \u0995\u09b0\u09c7 \u09a6\u09c7\u0996\u09cb"}</span>
        {mode === "beesley" && (
          <span className={Math.abs(beesleyThreads - 30) <= 1 ? "text-emerald-400 font-medium" : "text-amber-300"}>
            {Math.abs(beesleyThreads - 30) <= 1
              ? "\u09aa\u09df\u09c7\u09a8\u09cd\u099f\u09be\u09b0 \u09b8\u09ac\u09c1\u099c Datum \u09a6\u09be\u0997\u09c7 \u09b8\u09ae\u09be\u09a8 \u09b9\u09df\u09c7\u099b\u09c7!"
              : beesleyThreads < 30
              ? "\u09b8\u09c1\u09a4\u09be \u0995\u09ae \u2014 \u09ac\u09be\u09ae \u09a6\u09bf\u0995 \u09b9\u09be\u09b2\u0995\u09be (\u0989\u09aa\u09b0\u09c7 \u0989\u09a0\u09c7\u099b\u09c7)"
              : "\u09b8\u09c1\u09a4\u09be \u09ac\u09c7\u09b6\u09bf \u2014 \u09ac\u09be\u09ae \u09a6\u09bf\u0995 \u09ad\u09be\u09b0\u09c0 (\u09a8\u09bf\u099a\u09c7 \u09a8\u09c7\u09ae\u09c7\u099b\u09c7)"}
          </span>
        )}
      </div>
    </div>
  );
}