"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
  Layers,
  Gauge,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";

type PickingType = "shuttle" | "rapier" | "projectile" | "airjet";
type ShedType = "open" | "center_closed" | "bottom_closed";
type WeaveType = "plain" | "twill21" | "twill22" | "denim31";
type LoomPartId =
  | "weavers_beam"
  | "back_rest"
  | "lease_rods"
  | "drop_wires"
  | "heald_frames"
  | "picking_unit"
  | "reed_sley"
  | "woven_cloth"
  | "breast_beam"
  | "cloth_roller";

interface PartMeta {
  id: LoomPartId;
  name: string;
  motion: string;
  role: string;
  defect: string;
  vivaTip: string;
}

const LOOM_PARTS: Record<LoomPartId, PartMeta> = {
  weavers_beam: {
    id: "weavers_beam",
    name: "Weaver's Beam (Warp Beam)",
    motion: "Secondary Motion (Let-off)",
    role: "Holds thousands of sized warp ends wound in parallel and releases warp yarn at constant tension as cloth is woven.",
    defect: "Uneven let-off tension causes thick & thin places (starting marks) across the fabric width.",
    vivaTip: "Positive let-off maintains constant warp tension automatically even as beam diameter shrinks.",
  },
  back_rest: {
    id: "back_rest",
    name: "Back Rest (Whip Roll)",
    motion: "Warp Guide & Tension Sensor",
    role: "Guides the warp sheet from the weaver's beam into a horizontal plane and senses tension variations during shedding.",
    defect: "Rough or misaligned back rest causes excessive warp abrasion and frequent end breakages.",
    vivaTip: "Raising the back rest creates an asymmetric shed that improves cover factor in plain weave.",
  },
  lease_rods: {
    id: "lease_rods",
    name: "Lease Rods (2 Rods)",
    motion: "Warp Separation",
    role: "Maintains 1-and-1 separation between adjacent warp ends in a figure-of-eight path, preventing entanglement and aiding quick piecing.",
    defect: "Missing or wrong lease causes crossed ends and warp tangling behind the heald frames.",
    vivaTip: "Lease rods also act as a shedding tension equalizer between upper and lower warp sheets.",
  },
  drop_wires: {
    id: "drop_wires",
    name: "Drop Wires (Warp Stop Motion)",
    motion: "Tertiary Motion (Safety)",
    role: "One lightweight metal pin hangs on each warp end. If a warp thread breaks, its drop wire falls onto the serrated bar and stops the loom immediately.",
    defect: "Disabled warp stop motion creates long 'Missing End' streaks running warp-way through the fabric.",
    vivaTip: "Modern looms use electrical contact bars to pinpoint the exact zone of a broken warp end.",
  },
  heald_frames: {
    id: "heald_frames",
    name: "Heald Frames & Healds (Shafts H1-H4)",
    motion: "Primary Motion (Shedding)",
    role: "Raises and lowers specific groups of warp ends according to the lifting plan to open a V-shaped passage (the Shed) for weft insertion.",
    defect: "Wrong drafting or broken heald wire causes 'Wrong Draft / Wrong Drawing-in' or stitching faults.",
    vivaTip: "Tappet shedding handles simple weaves (up to 8 shafts), Dobby up to 24-32 shafts, Jacquard controls individual ends.",
  },
  picking_unit: {
    id: "picking_unit",
    name: "Picking Mechanism (Weft Insertion)",
    motion: "Primary Motion (Picking)",
    role: "Propels the weft yarn across the open warp shed from one selvedge to the other between ~110 deg and ~245 deg of the crank cycle.",
    defect: "Weak or mistimed picking causes 'Broken Pick', 'Double Pick', or shuttle fly-out/trapping.",
    vivaTip: "Shuttle (~180 PPM) is limited by heavy mass; Air-Jet reaches 800-1200+ PPM using main + relay air nozzles.",
  },
  reed_sley: {
    id: "reed_sley",
    name: "Reed & Sley (Beat-up Unit)",
    motion: "Primary Motion (Beat-up)",
    role: "Comb-like metallic reed oscillates via crank/cam to push each newly inserted weft pick firmly into the Fell of Cloth at 0 deg (Front Center).",
    defect: "Damaged reed dent leaves permanent warp-way 'Reed Marks'; weak beat-up causes 'Cracks' or low PPI.",
    vivaTip: "Reed also controls warp density (EPI) and fabric width through denting order (e.g., 2 ends/dent).",
  },
  woven_cloth: {
    id: "woven_cloth",
    name: "Fell of Cloth & Woven Fabric",
    motion: "Interlacement Zone",
    role: "The exact line where warp and weft interlace into stable woven fabric. Every beat-up locks one new pick according to the weave repeat.",
    defect: "Incorrect loom timing or temple pressure causes uneven PPI, selvedge tearing, or temple marks.",
    vivaTip: "Denim uses a 3/1 Right-Hand (Z) Twill with indigo-dyed warp and undyed white weft, showing blue face and white back.",
  },
  breast_beam: {
    id: "breast_beam",
    name: "Breast Beam (Front Rest)",
    motion: "Fabric Guide",
    role: "Smooth front support beam that guides the newly formed woven fabric cleanly downward toward the take-up roller.",
    defect: "Burrs or scratches on the breast beam cause snagging and filament pulls on delicate fabrics.",
    vivaTip: "The warp line runs horizontally from Back Rest -> Heald Eyes -> Fell of Cloth -> Breast Beam.",
  },
  cloth_roller: {
    id: "cloth_roller",
    name: "Emery Take-up & Cloth Roller",
    motion: "Secondary Motion (Take-up)",
    role: "Pulls the woven fabric forward by an exact distance per pick (determining PPI) and winds finished cloth neatly onto the cloth roller.",
    defect: "Slippage on the emery roller causes 'Thick Places' (too many picks per inch) and irregular GSM.",
    vivaTip: "Take-up rate directly sets Picks Per Inch (PPI) = Loom RPM / Fabric Take-up Speed.",
  },
};

interface GuidedStep {
  title: string;
  angle: number;
  part: LoomPartId;
  summary: string;
}

const GUIDED_STEPS: GuidedStep[] = [
  {
    title: "Step 1: Shedding (60 deg)",
    angle: 60,
    part: "heald_frames",
    summary:
      "Heald frames lift selected warp ends upward and pull remaining ends downward, forming the V-shaped Shed opening.",
  },
  {
    title: "Step 2: Picking / Weft Insertion (175 deg)",
    angle: 175,
    part: "picking_unit",
    summary:
      "While the shed dwells fully open (110-250 deg), the picking unit carries the weft yarn cleanly across the warp sheet.",
  },
  {
    title: "Step 3: Shed Crossing (300 deg)",
    angle: 300,
    part: "woven_cloth",
    summary:
      "Heald frames reverse and cross each other, locking the newly inserted weft pick tightly inside the warp interlacement.",
  },
  {
    title: "Step 4: Beat-up at Front Center (0 deg)",
    angle: 0,
    part: "reed_sley",
    summary:
      "The crank pushes the Reed forward to 0 deg, beating the weft pick firmly into the Fell of Cloth to form a new row of fabric.",
  },
  {
    title: "Step 5: Let-off & Take-up (25 deg)",
    angle: 25,
    part: "cloth_roller",
    summary:
      "Weaver's Beam releases fresh warp under constant tension while the Take-up Roller advances the newly woven cloth by 1 pick.",
  },
];

const WEAVE_CONFIG: Record<
  WeaveType,
  {
    label: string;
    repeat: number;
    matrix: number[][]; // [pick % repeat][shaft 0..3] => 1 = warp UP, 0 = warp DOWN
    warpColor: number;
    weftColor: number;
    note: string;
  }
> = {
  plain: {
    label: "Plain (1/1)",
    repeat: 2,
    matrix: [
      [1, 0, 1, 0],
      [0, 1, 0, 1],
    ],
    warpColor: 0x38bdf8,
    weftColor: 0xf59e0b,
    note: "Simplest & strongest weave; 1 up, 1 down alternation.",
  },
  twill21: {
    label: "Twill (2/1)",
    repeat: 3,
    matrix: [
      [1, 1, 0, 1],
      [0, 1, 1, 0],
      [1, 0, 1, 1],
    ],
    warpColor: 0x22d3ee,
    weftColor: 0xfb7185,
    note: "Warp-faced diagonal twill lines; 2 up, 1 down repeat.",
  },
  twill22: {
    label: "Twill (2/2)",
    repeat: 4,
    matrix: [
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 1, 1],
      [1, 0, 0, 1],
    ],
    warpColor: 0x34d399,
    weftColor: 0xfbbf24,
    note: "Balanced twill with prominent 45-degree diagonal wale.",
  },
  denim31: {
    label: "Denim (3/1 Z-Twill)",
    repeat: 4,
    matrix: [
      [1, 1, 1, 0],
      [0, 1, 1, 1],
      [1, 0, 1, 1],
      [1, 1, 0, 1],
    ],
    warpColor: 0x1d4ed8,
    weftColor: 0xf1f5f9,
    note: "Classic Denim: Indigo warp (3 up, 1 down) + White weft.",
  },
};

const PICKING_INFO: Record<
  PickingType,
  { label: string; ppm: string; desc: string }
> = {
  shuttle: {
    label: "Shuttle",
    ppm: "160-220 PPM",
    desc: "Conventional wooden shuttle carrying a weft pirn back and forth.",
  },
  rapier: {
    label: "Rapier",
    ppm: "450-650 PPM",
    desc: "Twin flexible/rigid rapiers meet at center to transfer weft yarn.",
  },
  projectile: {
    label: "Projectile",
    ppm: "350-450 PPM",
    desc: "Compact torsion-bar fired steel gripper pulls weft across wide looms.",
  },
  airjet: {
    label: "Air-Jet",
    ppm: "850-1200+ PPM",
    desc: "High-velocity main & relay compressed air jets propel weft yarn.",
  },
};

function getPhaseLabel(deg: number): { name: string; color: string } {
  const a = ((deg % 360) + 360) % 360;
  if (a <= 25 || a >= 335) return { name: "Beat-up (Reed Strike)", color: "text-rose-300" };
  if (a < 110) return { name: "Shed Opening", color: "text-cyan-300" };
  if (a <= 245) return { name: "Dwell & Picking (Weft Insertion)", color: "text-amber-300" };
  return { name: "Shed Closing & Crossing", color: "text-emerald-300" };
}

export default function Loom3DSimulator() {
  const mountRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(0.6);
  const [crankAngle, setCrankAngle] = useState(175);
  const [pickingType, setPickingType] = useState<PickingType>("shuttle");
  const [shedType, setShedType] = useState<ShedType>("open");
  const [weaveType, setWeaveType] = useState<WeaveType>("denim31");
  const [selectedPart, setSelectedPart] = useState<LoomPartId>("heald_frames");
  const [activeStepIdx, setActiveStepIdx] = useState<number | null>(null);
  const [picksWoven, setPicksWoven] = useState(14);

  // Refs synced for animation loop without re-creating WebGL context
  const stateRef = useRef({
    isPlaying,
    speed,
    crankAngle,
    pickingType,
    shedType,
    weaveType,
    selectedPart,
    pickIndex: 14,
  });

  useEffect(() => {
    stateRef.current.isPlaying = isPlaying;
    stateRef.current.speed = speed;
    stateRef.current.pickingType = pickingType;
    stateRef.current.shedType = shedType;
    stateRef.current.weaveType = weaveType;
    stateRef.current.selectedPart = selectedPart;
  }, [isPlaying, speed, pickingType, shedType, weaveType, selectedPart]);

  const cameraControlsRef = useRef<{
    zoom: (delta: number) => void;
    reset: () => void;
  } | null>(null);

  const applyStep = (idx: number) => {
    const step = GUIDED_STEPS[idx];
    if (!step) return;
    setActiveStepIdx(idx);
    setIsPlaying(false);
    setCrankAngle(step.angle);
    stateRef.current.crankAngle = step.angle;
    setSelectedPart(step.part);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070d19);

    const width = Math.max(300, container.clientWidth);
    const height = Math.max(300, container.clientHeight);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0xdbeafe, 0.9);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(7, 11, 9);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.65);
    rimLight.position.set(-8, 5, -6);
    scene.add(rimLight);

    // Subtle floor grid
    const grid = new THREE.GridHelper(18, 24, 0x1e293b, 0x0f172a);
    grid.position.y = -2.15;
    scene.add(grid);

    // Orbit camera state
    let theta = 0.68;
    let phi = 1.12;
    let radius = width < 520 ? 14.5 : 11.8;
    const target = new THREE.Vector3(0.3, 0.0, 0);

    const updateCamera = () => {
      camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = target.y + radius * Math.cos(phi);
      camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(target);
    };
    updateCamera();

    cameraControlsRef.current = {
      zoom: (delta: number) => {
        radius = Math.min(20, Math.max(6.2, radius + delta));
        updateCamera();
      },
      reset: () => {
        theta = 0.68;
        phi = 1.12;
        radius = container.clientWidth < 520 ? 14.5 : 11.8;
        updateCamera();
      },
    };

    // Interactive mesh registry for highlight + raycasting
    const partMeshes: Record<LoomPartId, THREE.Mesh[]> = {
      weavers_beam: [],
      back_rest: [],
      lease_rods: [],
      drop_wires: [],
      heald_frames: [],
      picking_unit: [],
      reed_sley: [],
      woven_cloth: [],
      breast_beam: [],
      cloth_roller: [],
    };
    const allClickable: THREE.Mesh[] = [];

    const registerMesh = (mesh: THREE.Mesh, partId: LoomPartId) => {
      mesh.userData.partId = partId;
      partMeshes[partId].push(mesh);
      allClickable.push(mesh);
    };

    // Machine Side Frames (structural dark steel)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.65,
      roughness: 0.4,
    });
    for (const zSide of [-2.45, 2.45]) {
      const baseRail = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.24, 0.22), frameMat);
      baseRail.position.set(0.2, -1.95, zSide);
      scene.add(baseRail);

      for (const xPost of [-4.4, -0.5, 4.6]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.3, 0.22), frameMat);
        post.position.set(xPost, -0.35, zSide);
        scene.add(post);
      }
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.16, 0.16), frameMat);
      topRail.position.set(0.1, 1.35, zSide);
      scene.add(topRail);
    }

    // 1. Weaver's Beam (x = -4.2)
    const beamGroup = new THREE.Group();
    beamGroup.position.set(-4.2, -0.55, 0);
    const beamCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 4.3, 28),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.55, metalness: 0.15 }),
    );
    beamCore.rotation.x = Math.PI / 2;
    registerMesh(beamCore, "weavers_beam");
    beamGroup.add(beamCore);

    const flangeMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.75, roughness: 0.3 });
    for (const zF of [-2.18, 2.18]) {
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.08, 28), flangeMat);
      flange.rotation.x = Math.PI / 2;
      flange.position.z = zF;
      registerMesh(flange, "weavers_beam");
      beamGroup.add(flange);
    }
    scene.add(beamGroup);

    // 2. Back Rest (x = -3.45, y = 0.05)
    const backRest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 4.6, 20),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 }),
    );
    backRest.rotation.x = Math.PI / 2;
    backRest.position.set(-3.45, 0.05, 0);
    registerMesh(backRest, "back_rest");
    scene.add(backRest);

    // 3. Lease Rods (x = -2.85 & -2.45)
    const leaseMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.5, roughness: 0.35 });
    for (const [lx, ly] of [
      [-2.85, 0.16],
      [-2.45, -0.06],
    ] as const) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.5, 16), leaseMat);
      rod.rotation.x = Math.PI / 2;
      rod.position.set(lx, ly, 0);
      registerMesh(rod, "lease_rods");
      scene.add(rod);
    }

    // 4. Drop Wires (x = -1.95)
    const dropGroup = new THREE.Group();
    dropGroup.position.set(-1.95, 0.05, 0);
    const contactBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.12, 4.4),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7, roughness: 0.3 }),
    );
    contactBar.position.y = -0.22;
    registerMesh(contactBar, "drop_wires");
    dropGroup.add(contactBar);
    const wirePinMat = new THREE.MeshStandardMaterial({ color: 0xfde047, metalness: 0.8, roughness: 0.25 });
    for (let i = 0; i < 16; i++) {
      const zPos = -1.8 + (i / 15) * 3.6;
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.38, 0.04), wirePinMat);
      pin.position.set(0, 0.05, zPos);
      registerMesh(pin, "drop_wires");
      dropGroup.add(pin);
    }
    scene.add(dropGroup);

    // 5. Four Heald Frames (H1..H4 at x = -1.25, -0.95, -0.65, -0.35)
    const healdXPositions = [-1.25, -0.95, -0.65, -0.35];
    const healdColors = [0x38bdf8, 0x818cf8, 0x34d399, 0xf472b6];
    const healdFrames: THREE.Group[] = [];

    for (let s = 0; s < 4; s++) {
      const frame = new THREE.Group();
      const xPos = healdXPositions[s] ?? -0.8;
      frame.position.set(xPos, 0, 0);

      const hMat = new THREE.MeshStandardMaterial({
        color: healdColors[s] ?? 0x38bdf8,
        metalness: 0.55,
        roughness: 0.35,
      });

      const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 4.35), hMat);
      topBar.position.y = 1.05;
      registerMesh(topBar, "heald_frames");
      frame.add(topBar);

      const botBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 4.35), hMat);
      botBar.position.y = -1.05;
      registerMesh(botBar, "heald_frames");
      frame.add(botBar);

      for (const zSide of [-2.14, 2.14]) {
        const stay = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.15, 0.08), hMat);
        stay.position.z = zSide;
        registerMesh(stay, "heald_frames");
        frame.add(stay);
      }

      // Heald wires for the ends belonging to this shaft
      const wireMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.25 });
      for (let e = s; e < 16; e += 4) {
        const zEnd = -1.8 + (e / 15) * 3.6;
        const hWire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.0, 6), wireMat);
        hWire.position.set(0, 0, zEnd);
        registerMesh(hWire, "heald_frames");
        frame.add(hWire);
      }

      scene.add(frame);
      healdFrames.push(frame);
    }

    // 6. Reed & Sley Assembly (oscillates between x = 0.45 back and x = 1.65 beat-up)
    const reedGroup = new THREE.Group();
    reedGroup.position.set(0.6, 0, 0);
    const sleyMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, metalness: 0.5, roughness: 0.35 });
    const sleyCap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 4.5), sleyMat);
    sleyCap.position.y = 0.85;
    registerMesh(sleyCap, "reed_sley");
    reedGroup.add(sleyCap);

    const sleyRace = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 4.5), sleyMat);
    sleyRace.position.y = -0.68;
    registerMesh(sleyRace, "reed_sley");
    reedGroup.add(sleyRace);

    const dentMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });
    for (let d = 0; d < 28; d++) {
      const zD = -1.95 + (d / 27) * 3.9;
      const dent = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.45, 0.018), dentMat);
      dent.position.set(0, 0.08, zD);
      registerMesh(dent, "reed_sley");
      reedGroup.add(dent);
    }
    scene.add(reedGroup);

    // 7. Picking Carriers (Shuttle, Twin Rapiers, Projectile, Air-Jet Stream)
    const shuttleMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.14, 0.72, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.2 }),
    );
    shuttleMesh.rotation.x = Math.PI / 2;
    shuttleMesh.position.set(1.05, 0, -2.2);
    registerMesh(shuttleMesh, "picking_unit");
    scene.add(shuttleMesh);

    const rapierMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.85, roughness: 0.2 });
    const rapierLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 2.2), rapierMat);
    rapierLeft.position.set(1.05, 0, -3.2);
    registerMesh(rapierLeft, "picking_unit");
    scene.add(rapierLeft);

    const rapierRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 2.2), rapierMat);
    rapierRight.position.set(1.05, 0, 3.2);
    registerMesh(rapierRight, "picking_unit");
    scene.add(rapierRight);

    const projectileMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.07, 0.34),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 }),
    );
    projectileMesh.position.set(1.05, 0, -2.2);
    registerMesh(projectileMesh, "picking_unit");
    scene.add(projectileMesh);

    const airJetBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.12, 3.8, 12),
      new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.65,
      }),
    );
    airJetBeam.rotation.x = Math.PI / 2;
    airJetBeam.position.set(1.05, 0, 0);
    registerMesh(airJetBeam, "picking_unit");
    scene.add(airJetBeam);

    // Active weft trail being inserted across the shed
    const activeWeftMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
    const activeWeftMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1, 8), activeWeftMat);
    activeWeftMesh.rotation.x = Math.PI / 2;
    activeWeftMesh.visible = false;
    scene.add(activeWeftMesh);

    // 8. 16 Live Warp Threads (LineSegments / dynamic BufferGeometry)
    const warpCount = 16;
    const warpLines: THREE.Line[] = [];
    const warpLineMat = new THREE.LineBasicMaterial({ color: 0x1d4ed8 });

    for (let i = 0; i < warpCount; i++) {
      const zPos = -1.8 + (i / (warpCount - 1)) * 3.6;
      const pts = [
        new THREE.Vector3(-4.2, -0.1, zPos),
        new THREE.Vector3(-3.45, 0.05, zPos),
        new THREE.Vector3(-2.85, i % 2 === 0 ? 0.22 : -0.1, zPos),
        new THREE.Vector3(-2.45, i % 2 === 0 ? -0.1 : 0.15, zPos),
        new THREE.Vector3(healdXPositions[i % 4] ?? -0.8, 0, zPos),
        new THREE.Vector3(1.72, 0.05, zPos),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, warpLineMat);
      scene.add(line);
      warpLines.push(line);
    }

    // 9. Live Woven Cloth (14 visible weft rows x 16 warp cells advancing from x = 1.72 to x = 4.25!)
    const clothGroup = new THREE.Group();
    const clothRows = 14;
    const clothCols = 16;
    const cellW = (4.25 - 1.72) / clothRows;
    const cellD = 3.7 / clothCols;
    const clothCells: THREE.Mesh[][] = [];

    // Backing sheet for clean clickability & cloth body
    const clothBase = new THREE.Mesh(
      new THREE.BoxGeometry(4.25 - 1.72, 0.02, 3.75),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 }),
    );
    clothBase.position.set((4.25 + 1.72) / 2, 0.03, 0);
    registerMesh(clothBase, "woven_cloth");
    clothGroup.add(clothBase);

    const cellGeo = new THREE.BoxGeometry(cellW * 0.92, 0.048, cellD * 0.88);
    for (let r = 0; r < clothRows; r++) {
      const rowArr: THREE.Mesh[] = [];
      const xCell = 1.72 + (r + 0.5) * cellW;
      for (let c = 0; c < clothCols; c++) {
        const zCell = -1.85 + (c + 0.5) * cellD;
        const mat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.65 });
        const cell = new THREE.Mesh(cellGeo, mat);
        cell.position.set(xCell, 0.055, zCell);
        registerMesh(cell, "woven_cloth");
        clothGroup.add(cell);
        rowArr.push(cell);
      }
      clothCells.push(rowArr);
    }
    scene.add(clothGroup);

    // 10. Breast Beam (x = 4.35, y = 0.05)
    const breastBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 4.6, 20),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 }),
    );
    breastBeam.rotation.x = Math.PI / 2;
    breastBeam.position.set(4.35, 0.05, 0);
    registerMesh(breastBeam, "breast_beam");
    scene.add(breastBeam);

    // 11. Emery Take-up & Cloth Roller (x = 4.2, y = -0.85)
    const clothRollerGroup = new THREE.Group();
    clothRollerGroup.position.set(4.2, -0.88, 0);
    const clothRollMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 4.1, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.65 }),
    );
    clothRollMesh.rotation.x = Math.PI / 2;
    registerMesh(clothRollMesh, "cloth_roller");
    clothRollerGroup.add(clothRollMesh);

    const emeryRoll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 4.3, 20),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.4 }),
    );
    emeryRoll.rotation.x = Math.PI / 2;
    emeryRoll.position.set(0.32, 0.46, 0);
    registerMesh(emeryRoll, "cloth_roller");
    clothRollerGroup.add(emeryRoll);
    scene.add(clothRollerGroup);

    // Pointer / Touch / Raycast controls
    const raycaster = new THREE.Raycaster();
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let downX = 0;
    let downY = 0;
    let pinchDist = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      theta -= dx * 0.008;
      phi = Math.min(Math.PI * 0.48, Math.max(0.28, phi - dy * 0.008));
      updateCamera();
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      const moveDist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moveDist < 6) {
        const rect = renderer.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(allClickable, false);
        const hit = hits[0];
        if (hit && typeof hit.object.userData.partId === "string") {
          setSelectedPart(hit.object.userData.partId as LoomPartId);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      radius = Math.min(20, Math.max(6.2, radius + e.deltaY * 0.006));
      updateCamera();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        if (t0 && t1) {
          pinchDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        if (t0 && t1) {
          const newDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
          const diff = pinchDist - newDist;
          pinchDist = newDist;
          radius = Math.min(20, Math.max(6.2, radius + diff * 0.025));
          updateCamera();
        }
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    domEl.addEventListener("wheel", onWheel, { passive: false });
    domEl.addEventListener("touchstart", onTouchStart, { passive: true });
    domEl.addEventListener("touchmove", onTouchMove, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = Math.max(280, container.clientWidth);
      const h = Math.max(280, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Animation loop
    let rafId = 0;
    let lastTime = performance.now();
    let uiSyncAccum = 0;

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const st = stateRef.current;
      if (st.isPlaying) {
        const prevAngle = st.crankAngle;
        const degPerSec = 115 * st.speed;
        st.crankAngle = (st.crankAngle + degPerSec * dt) % 360;
        if (st.crankAngle < prevAngle) {
          st.pickIndex += 1;
          setPicksWoven(st.pickIndex);
        }
        uiSyncAccum += dt;
        if (uiSyncAccum >= 0.05) {
          uiSyncAccum = 0;
          setCrankAngle(Math.round(st.crankAngle));
        }
      }

      const deg = st.crankAngle;
      const rad = (deg * Math.PI) / 180;
      const weave = WEAVE_CONFIG[st.weaveType];
      const currentRow = weave.matrix[st.pickIndex % weave.repeat] ?? [1, 0, 1, 0];
      const nextRow = weave.matrix[(st.pickIndex + 1) % weave.repeat] ?? [0, 1, 0, 1];

      // Update warp & weft material colors
      warpLineMat.color.setHex(weave.warpColor);
      activeWeftMat.color.setHex(weave.weftColor);
      (clothRollMesh.material as THREE.MeshStandardMaterial).color.setHex(weave.warpColor);

      // Shedding envelope: 0 at Beat-up (0 deg), 1 during dwell (100..255 deg)
      let shedOpen = 0;
      if (deg < 100) {
        shedOpen = Math.sin((deg / 100) * (Math.PI / 2));
      } else if (deg <= 255) {
        shedOpen = 1;
      } else {
        shedOpen = Math.cos(((deg - 255) / 105) * (Math.PI / 2));
      }

      const shaftY: number[] = [0, 0, 0, 0];
      for (let s = 0; s < 4; s++) {
        const isUp = (currentRow[s] ?? 0) === 1;
        const nextUp = (nextRow[s] ?? 0) === 1;
        let yVal = 0;
        if (st.shedType === "open") {
          if (isUp && nextUp) {
            yVal = 0.56;
          } else if (!isUp && !nextUp) {
            yVal = -0.56;
          } else {
            yVal = (isUp ? 0.56 : -0.56) * shedOpen;
          }
        } else if (st.shedType === "center_closed") {
          yVal = (isUp ? 0.56 : -0.56) * shedOpen;
        } else {
          // Bottom-closed shed: all ends return to bottom line (-0.42) between picks
          yVal = isUp ? -0.42 + 0.98 * shedOpen : -0.42;
        }
        shaftY[s] = yVal;
        const hf = healdFrames[s];
        if (hf) hf.position.y = yVal;
      }

      // Update 16 Warp threads
      for (let i = 0; i < warpCount; i++) {
        const line = warpLines[i];
        if (!line) continue;
        const posAttr = line.geometry.getAttribute("position") as THREE.BufferAttribute;
        const yShaft = shaftY[i % 4] ?? 0;
        posAttr.setY(4, yShaft);
        posAttr.needsUpdate = true;
      }

      // Crank Beat-up Reed motion: reaches x = 1.66 at 0 deg (Beat-up), retracts to x = 0.42 at 180 deg
      const reedX = 1.04 + 0.62 * Math.cos(rad);
      reedGroup.position.x = reedX;

      // Picking motion (110 deg -> 245 deg)
      const inPick = deg >= 110 && deg <= 245;
      const pickProgress = inPick ? (deg - 110) / 135 : 0;
      const dirLeftToRight = st.pickIndex % 2 === 0;
      const carrierZ = dirLeftToRight
        ? -2.15 + pickProgress * 4.3
        : 2.15 - pickProgress * 4.3;

      shuttleMesh.visible = st.pickingType === "shuttle";
      rapierLeft.visible = st.pickingType === "rapier";
      rapierRight.visible = st.pickingType === "rapier";
      projectileMesh.visible = st.pickingType === "projectile";
      airJetBeam.visible = st.pickingType === "airjet" && inPick;

      if (st.pickingType === "shuttle") {
        shuttleMesh.position.z = inPick ? carrierZ : dirLeftToRight ? -2.25 : 2.25;
      } else if (st.pickingType === "rapier") {
        const reach = inPick ? Math.sin(pickProgress * Math.PI) : 0;
        rapierLeft.position.z = -3.15 + reach * 2.05;
        rapierRight.position.z = 3.15 - reach * 2.05;
      } else if (st.pickingType === "projectile") {
        projectileMesh.position.z = inPick ? -2.15 + pickProgress * 4.3 : -2.25;
      } else if (st.pickingType === "airjet") {
        airJetBeam.scale.set(1, Math.max(0.05, pickProgress), 1);
        airJetBeam.position.z = -1.9 + pickProgress * 1.9;
      }

      // Active weft yarn visible from picking start until beat-up
      if (deg >= 110) {
        activeWeftMesh.visible = true;
        const weftLen = inPick ? Math.max(0.15, pickProgress * 3.7) : 3.7;
        activeWeftMesh.scale.set(1, weftLen, 1);
        const startZ = st.pickingType === "projectile" || st.pickingType === "airjet" || dirLeftToRight ? -1.85 : 1.85;
        const sign = startZ < 0 ? 1 : -1;
        activeWeftMesh.position.z = inPick ? startZ + sign * (weftLen / 2) : 0;
        // Reed sweeps weft forward during closing/beat-up
        activeWeftMesh.position.x = deg <= 245 ? 1.05 : Math.min(1.68, reedX + 0.08);
      } else {
        activeWeftMesh.visible = false;
      }

      // Rotate Weaver's Beam (Let-off) and Cloth Roller (Take-up) subtly
      const rollAngle = (st.pickIndex * 360 + deg) * 0.0025;
      beamGroup.rotation.z = -rollAngle;
      clothRollerGroup.rotation.z = -rollAngle * 1.2;

      // Update live Woven Cloth pattern (advances by 1 pick every cycle!)
      for (let r = 0; r < clothRows; r++) {
        const rowMeshes = clothCells[r];
        if (!rowMeshes) continue;
        const historicalPick = Math.max(0, st.pickIndex - r);
        const patternRow = weave.matrix[historicalPick % weave.repeat] ?? [1, 0, 1, 0];
        for (let c = 0; c < clothCols; c++) {
          const cell = rowMeshes[c];
          if (!cell) continue;
          const warpOnTop = (patternRow[c % 4] ?? 0) === 1;
          const mat = cell.material as THREE.MeshStandardMaterial;
          mat.color.setHex(warpOnTop ? weave.warpColor : weave.weftColor);
          cell.position.y = warpOnTop ? 0.064 : 0.044;
        }
      }

      // Highlight selected part with subtle pulse
      const pulse = 0.28 + 0.16 * Math.sin(now * 0.006);
      for (const partKey of Object.keys(partMeshes) as LoomPartId[]) {
        const isSel = partKey === st.selectedPart;
        for (const m of partMeshes[partKey]) {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat && "emissive" in mat) {
            if (isSel) {
              mat.emissive.setHex(0x38bdf8);
              mat.emissiveIntensity = pulse;
            } else if (partKey !== "picking_unit" || m !== airJetBeam) {
              mat.emissive.setHex(0x000000);
              mat.emissiveIntensity = 0;
            }
          }
        }
      }

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      domEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      domEl.removeEventListener("wheel", onWheel);
      domEl.removeEventListener("touchstart", onTouchStart);
      domEl.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);

  const phaseInfo = useMemo(() => getPhaseLabel(crankAngle), [crankAngle]);
  const selectedMeta = LOOM_PARTS[selectedPart];
  const weaveMeta = WEAVE_CONFIG[weaveType];
  const pickMeta = PICKING_INFO[pickingType];

  // SVG needle coordinates for 0-360 timing wheel (0 deg = top / Beat-up)
  const needleRad = ((crankAngle - 90) * Math.PI) / 180;
  const nx = 60 + 44 * Math.cos(needleRad);
  const ny = 60 + 44 * Math.sin(needleRad);

  return (
    <div className="space-y-4">
      {/* Top Control Strip: Weave, Picking, Shed */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1220] p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              1. Weave Pattern (Live Cloth)
            </span>
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(WEAVE_CONFIG) as WeaveType[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWeaveType(w)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  weaveType === w
                    ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50"
                    : "bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {WEAVE_CONFIG[w].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">{weaveMeta.note}</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1220] p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              2. Picking System
            </span>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
              {pickMeta.ppm}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(PICKING_INFO) as PickingType[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPickingType(p)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  pickingType === p
                    ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/50"
                    : "bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {PICKING_INFO[p].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">{pickMeta.desc}</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1220] p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              3. Shed Type
            </span>
            <Gauge className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 md:grid-cols-1">
            {(
              [
                { id: "open", label: "Open Shed (High Speed)" },
                { id: "center_closed", label: "Center-Closed Shed" },
                { id: "bottom_closed", label: "Bottom-Closed Shed" },
              ] as const
            ).map((sh) => (
              <button
                key={sh.id}
                type="button"
                onClick={() => setShedType(sh.id)}
                className={`rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition ${
                  shedType === sh.id
                    ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/50"
                    : "bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {sh.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 3D Viewport + Side Timing & Inspector */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* 3D Loom Canvas */}
        <div className="lg:col-span-8">
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#070D19]">
            {/* Top HUD */}
            <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 py-1.5 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className={`text-xs font-semibold ${phaseInfo.color}`}>
                  {phaseInfo.name}
                </span>
                <span className="text-[11px] text-slate-400">
                  &middot; {crankAngle}&deg;
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur">
                <span>Picks Woven:</span>
                <span className="font-bold text-cyan-300">{picksWoven}</span>
              </div>
            </div>

            {/* Canvas */}
            <div
              ref={mountRef}
              className="h-[340px] w-full cursor-grab touch-none active:cursor-grabbing sm:h-[420px]"
            />

            {/* Bottom-right Zoom Controls */}
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => cameraControlsRef.current?.zoom(-1.5)}
                title="Zoom In"
                className="rounded-lg border border-slate-700/80 bg-slate-950/85 p-2 text-slate-200 hover:bg-slate-800"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => cameraControlsRef.current?.zoom(1.5)}
                title="Zoom Out"
                className="rounded-lg border border-slate-700/80 bg-slate-950/85 p-2 text-slate-200 hover:bg-slate-800"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => cameraControlsRef.current?.reset()}
                title="Reset View"
                className="rounded-lg border border-slate-700/80 bg-slate-950/85 p-2 text-slate-200 hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* Bottom-left Hint */}
            <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg bg-slate-950/75 px-2.5 py-1 text-[10px] text-slate-400 backdrop-blur">
              Drag to orbit &middot; Pinch/Scroll to zoom &middot; Click any part to inspect
            </div>
          </div>

          {/* Playback + Manual Crank Angle Slider */}
          <div className="mt-3 rounded-2xl border border-slate-800/80 bg-[#0B1220] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveStepIdx(null);
                    setIsPlaying((p) => !p);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {isPlaying ? "Pause Loom" : "Run Loom"}
                </button>
                <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 p-1 text-[11px]">
                  {[0.25, 0.6, 1.2].map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setSpeed(sp)}
                      className={`rounded-lg px-2 py-1 font-medium transition ${
                        speed === sp
                          ? "bg-slate-800 text-cyan-300"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {sp === 0.25 ? "0.25x" : sp === 0.6 ? "0.5x" : "1x"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step-by-Step Walkthrough */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = activeStepIdx === null ? 0 : (activeStepIdx - 1 + GUIDED_STEPS.length) % GUIDED_STEPS.length;
                    applyStep(next);
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800"
                  title="Previous Step"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = activeStepIdx === null ? 0 : (activeStepIdx + 1) % GUIDED_STEPS.length;
                    applyStep(next);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/25"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {activeStepIdx === null
                    ? "Step-by-Step Guide"
                    : `Next Step (${activeStepIdx + 1}/${GUIDED_STEPS.length})`}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Crank Slider */}
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Manual Crank Shaft Angle (Scrub 0&deg; &ndash; 360&deg;)</span>
                <span className="font-mono font-semibold text-cyan-300">{crankAngle}&deg;</span>
              </div>
              <input
                type="range"
                min={0}
                max={359}
                value={crankAngle}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setIsPlaying(false);
                  setActiveStepIdx(null);
                  setCrankAngle(val);
                  stateRef.current.crankAngle = val;
                }}
                className="h-2 w-full cursor-pointer accent-cyan-400"
              />
            </div>

            {activeStepIdx !== null && GUIDED_STEPS[activeStepIdx] && (
              <div className="mt-3 rounded-xl border border-violet-500/35 bg-violet-500/10 p-3 text-xs text-violet-100">
                <p className="font-semibold text-violet-200">
                  {GUIDED_STEPS[activeStepIdx].title}
                </p>
                <p className="mt-1 text-slate-300">{GUIDED_STEPS[activeStepIdx].summary}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Live 0-360 Timing Wheel + Clickable Part Study Card */}
        <div className="space-y-4 lg:col-span-4">
          {/* 0-360 Timing Diagram */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#0B1220] p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Loom Timing Diagram (0&deg;&ndash;360&deg;)
              </h3>
              <span className="font-mono text-xs font-bold text-cyan-300">{crankAngle}&deg;</span>
            </div>
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0">
                <circle cx="60" cy="60" r="46" fill="none" stroke="#1e293b" strokeWidth="10" />
                {/* Beat-up zone near 0 deg (top) */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="10"
                  strokeDasharray="36 254"
                  strokeDashoffset="18"
                  transform="rotate(-90 60 60)"
                />
                {/* Picking & Dwell arc (110 to 245 deg) */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="10"
                  strokeDasharray="108 182"
                  strokeDashoffset="-88"
                  transform="rotate(-90 60 60)"
                />
                <text x="60" y="10" textAnchor="middle" fill="#fda4af" fontSize="8" fontWeight="bold">
                  0&deg; Beat-up
                </text>
                <text x="60" y="117" textAnchor="middle" fill="#fcd34d" fontSize="8" fontWeight="bold">
                  180&deg; Picking
                </text>
                <line x1="60" y1="60" x2={nx} y2={ny} stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="60" cy="60" r="4" fill="#38bdf8" />
              </svg>
              <div className="space-y-1.5 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span>Beat-up (335&deg;&ndash;25&deg;)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span>Dwell &amp; Picking (110&deg;&ndash;245&deg;)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                  <span>Shed Open/Close Transition</span>
                </div>
              </div>
            </div>
          </div>

          {/* Part Inspector Study Card */}
          <div className="rounded-2xl border border-cyan-500/30 bg-[#0B1220] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-block rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                  {selectedMeta.motion}
                </span>
                <h3 className="mt-1 text-sm font-bold text-white">{selectedMeta.name}</h3>
              </div>
              <Info className="h-4 w-4 shrink-0 text-cyan-400" />
            </div>

            <p className="mt-2.5 text-xs leading-relaxed text-slate-300">{selectedMeta.role}</p>

            <div className="mt-3 rounded-xl border border-rose-500/25 bg-rose-500/10 p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Common Fault / Defect</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-rose-100/90">{selectedMeta.defect}</p>
            </div>

            <div className="mt-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Exam &amp; Viva Key Point</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-emerald-100/90">{selectedMeta.vivaTip}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clickable Machine Parts Selector Strip */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0B1220] p-3.5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Inspect Machine Parts (Click any part below or directly inside the 3D Loom)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(LOOM_PARTS) as LoomPartId[]).map((partId) => (
            <button
              key={partId}
              type="button"
              onClick={() => setSelectedPart(partId)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                selectedPart === partId
                  ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/60"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {LOOM_PARTS[partId].name.split(" (")[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}