"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as Astronomy from "astronomy-engine";
import styles from "./solar-system.module.css";

type PlanetDefinition = {
  name: string;
  body: Astronomy.Body;
  type: string;
  radius: number;
  color: number;
  orbitColor: number;
  period: string;
  periodDays: number;
  distance: string;
  au: number;
};

type MoonDefinition = {
  name: string;
  parent: string;
  radius: number;
  distance: number;
  periodDays: number;
  color: number;
};

const PLANETS: PlanetDefinition[] = [
  { name: "Mercury", body: Astronomy.Body.Mercury, type: "TERRESTRIAL", radius: 0.9, color: 0x9b9b9b, orbitColor: 0x555555, period: "88 days", periodDays: 88, distance: "0.39 AU", au: 0.39 },
  { name: "Venus", body: Astronomy.Body.Venus, type: "TERRESTRIAL", radius: 1.35, color: 0xd6a86a, orbitColor: 0x66605a, period: "224.7 days", periodDays: 224.7, distance: "0.72 AU", au: 0.72 },
  { name: "Earth", body: Astronomy.Body.Earth, type: "TERRESTRIAL", radius: 1.5, color: 0x4e83c2, orbitColor: 0x737b87, period: "365.25 days", periodDays: 365.25, distance: "1.00 AU", au: 1 },
  { name: "Mars", body: Astronomy.Body.Mars, type: "TERRESTRIAL", radius: 1.15, color: 0xb95843, orbitColor: 0x66534e, period: "687 days", periodDays: 687, distance: "1.52 AU", au: 1.52 },
  { name: "Jupiter", body: Astronomy.Body.Jupiter, type: "GAS GIANT", radius: 4.5, color: 0xc18d68, orbitColor: 0x6e6259, period: "11.86 years", periodDays: 4332.6, distance: "5.20 AU", au: 5.2 },
  { name: "Saturn", body: Astronomy.Body.Saturn, type: "GAS GIANT", radius: 3.8, color: 0xd5bc82, orbitColor: 0x706856, period: "29.45 years", periodDays: 10759, distance: "9.58 AU", au: 9.58 },
  { name: "Uranus", body: Astronomy.Body.Uranus, type: "ICE GIANT", radius: 2.7, color: 0x7cc7d1, orbitColor: 0x596b6d, period: "84 years", periodDays: 30687, distance: "19.2 AU", au: 19.2 },
  { name: "Neptune", body: Astronomy.Body.Neptune, type: "ICE GIANT", radius: 2.6, color: 0x4774d6, orbitColor: 0x4d5a75, period: "164.8 years", periodDays: 60190, distance: "30.05 AU", au: 30.05 },
  { name: "Pluto", body: Astronomy.Body.Pluto, type: "DWARF PLANET", radius: 0.72, color: 0xb7a38f, orbitColor: 0x4d4a47, period: "248 years", periodDays: 90560, distance: "39.5 AU", au: 39.5 },
];

const MOONS: MoonDefinition[] = [
  { name: "Moon", parent: "Earth", radius: 0.42, distance: 3.6, periodDays: 27.32, color: 0xbcbcbc },
  { name: "Phobos", parent: "Mars", radius: 0.16, distance: 2.0, periodDays: 0.319, color: 0x8a8177 },
  { name: "Deimos", parent: "Mars", radius: 0.11, distance: 2.8, periodDays: 1.263, color: 0xaaa19a },
  { name: "Io", parent: "Jupiter", radius: 0.28, distance: 5.8, periodDays: 1.769, color: 0xd6bd78 },
  { name: "Europa", parent: "Jupiter", radius: 0.25, distance: 7.0, periodDays: 3.551, color: 0xcbbfa8 },
  { name: "Ganymede", parent: "Jupiter", radius: 0.34, distance: 8.5, periodDays: 7.155, color: 0x9c968b },
  { name: "Callisto", parent: "Jupiter", radius: 0.32, distance: 10.3, periodDays: 16.689, color: 0x77706b },
  { name: "Titan", parent: "Saturn", radius: 0.31, distance: 6.7, periodDays: 15.945, color: 0xc9a66e },
  { name: "Titania", parent: "Uranus", radius: 0.16, distance: 4.8, periodDays: 8.706, color: 0xaaa9a5 },
  { name: "Triton", parent: "Neptune", radius: 0.19, distance: 4.5, periodDays: 5.877, color: 0xc2b7ac },
];

const MIN_DATE = new Date("1950-01-01T00:00:00Z").getTime();
const MAX_DATE = new Date("2050-12-31T23:59:59Z").getTime();
const DEFAULT_SPEED = 0.35;
const DAY_MS = 86400000;

const MISSION_DEFS = [
  { name: "VOYAGER 1", color: 0x72b7ff, start: 1977, direction: new THREE.Vector3(0.78, 0.08, -0.62), bend: new THREE.Vector3(0, 5, 0) },
  { name: "VOYAGER 2", color: 0x8dffb4, start: 1977, direction: new THREE.Vector3(-0.42, -0.12, -0.9), bend: new THREE.Vector3(0, -4, 0) },
  { name: "NEW HORIZONS", color: 0xffcf70, start: 2006, direction: new THREE.Vector3(-0.62, 0.18, 0.76), bend: new THREE.Vector3(4, 3, 0) },
  { name: "PARKER SOLAR PROBE", color: 0xff785f, start: 2018, direction: new THREE.Vector3(0.9, 0.02, 0.3), bend: new THREE.Vector3(-2, -3, 0) },
  { name: "JUNO", color: 0x9d8cff, start: 2011, direction: new THREE.Vector3(-0.2, 0.08, 0.98), bend: new THREE.Vector3(3, 2, 0) },
];

function visualDistance(au: number) {
  return 15 + Math.pow(Math.max(au, 0.05), 0.58) * 14;
}

function planetPosition(body: Astronomy.Body, date: Date) {
  const vector = Astronomy.HelioVector(body, date);
  const length = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2) || 1;
  const distance = visualDistance(length);
  return new THREE.Vector3((vector.x / length) * distance, (vector.z / length) * distance, (-vector.y / length) * distance);
}

function makeLabel(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "500 34px Arial";
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(10, 2.5, 1);
  return sprite;
}

function makeOrbit(radius: number, color: number) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 256; i += 1) {
    const angle = (i / 256) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.26 });
  return new THREE.LineLoop(geometry, material);
}

function makePlanetTexture(planet: PlanetDefinition) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 384;
  const ctx = canvas.getContext("2d")!;
  const base = `#${planet.color.toString(16).padStart(6, "0")}`;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const random = (seed: number) => {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  };
  if (planet.name === "Earth") {
    ctx.fillStyle = "#174f86";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 22; i += 1) {
      const x = random(i + 1) * canvas.width;
      const y = (0.12 + random(i + 2) * 0.76) * canvas.height;
      const w = (24 + random(i + 3) * 100) * (1 + Math.abs(Math.sin(y)));
      const h = 16 + random(i + 4) * 62;
      ctx.fillStyle = i % 5 === 0 ? "#9a8b55" : "#3f713f";
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, random(i + 5) * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(240,245,240,.52)";
    for (let i = 0; i < 12; i += 1) {
      const x = random(i + 20) * canvas.width;
      const y = random(i + 30) * canvas.height;
      ctx.beginPath();
      ctx.ellipse(x, y, 35 + random(i + 40) * 75, 5 + random(i + 50) * 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (planet.name === "Jupiter") {
    const bands = ["#a8785b", "#d8b08c", "#8f624d", "#e2c5a1", "#a96f55", "#d1a27e"];
    bands.forEach((color, index) => { ctx.fillStyle = color; ctx.fillRect(0, (index / bands.length) * canvas.height, canvas.width, canvas.height / bands.length + 2); });
    ctx.fillStyle = "rgba(116,67,49,.78)";
    ctx.beginPath(); ctx.ellipse(520, 255, 75, 34, -0.08, 0, Math.PI * 2); ctx.fill();
  } else if (planet.name === "Saturn") {
    const bands = ["#b89d70", "#d9c18c", "#9d835e", "#e2d19f", "#c3a878", "#a88d66"];
    bands.forEach((color, index) => { ctx.fillStyle = color; ctx.fillRect(0, (index / bands.length) * canvas.height, canvas.width, canvas.height / bands.length + 2); });
  } else if (planet.name === "Uranus" || planet.name === "Neptune") {
    for (let i = 0; i < 12; i += 1) { ctx.fillStyle = i % 2 ? "rgba(255,255,255,.07)" : "rgba(0,20,60,.08)"; ctx.fillRect(0, (i / 12) * canvas.height, canvas.width, canvas.height / 12 + 3); }
  } else if (planet.name === "Mars") {
    ctx.fillStyle = "rgba(80,35,24,.32)";
    for (let i = 0; i < 26; i += 1) { ctx.beginPath(); ctx.ellipse(random(i + 60) * canvas.width, random(i + 80) * canvas.height, 5 + random(i + 90) * 25, 3 + random(i + 100) * 12, 0, 0, Math.PI * 2); ctx.fill(); }
  } else if (planet.name === "Mercury") {
    ctx.fillStyle = "rgba(35,35,35,.28)";
    for (let i = 0; i < 34; i += 1) { const r = 2 + random(i + 110) * 11; ctx.beginPath(); ctx.arc(random(i + 120) * canvas.width, random(i + 130) * canvas.height, r, 0, Math.PI * 2); ctx.fill(); }
  } else if (planet.name === "Venus") {
    for (let i = 0; i < 18; i += 1) { ctx.strokeStyle = `rgba(255,245,205,${0.06 + random(i + 140) * 0.12})`; ctx.lineWidth = 7 + random(i + 150) * 12; ctx.beginPath(); ctx.moveTo(0, random(i + 160) * canvas.height); ctx.bezierCurveTo(250, random(i + 170) * canvas.height, 520, random(i + 180) * canvas.height, canvas.width, random(i + 190) * canvas.height); ctx.stroke(); }
  } else {
    ctx.fillStyle = "rgba(255,255,255,.08)";
    for (let i = 0; i < 18; i += 1) ctx.fillRect(0, (i / 18) * canvas.height, canvas.width, 1 + random(i + 200) * 3);
  }
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < image.data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 14;
    image.data[i] = Math.max(0, Math.min(255, image.data[i] + grain));
    image.data[i + 1] = Math.max(0, Math.min(255, image.data[i + 1] + grain));
    image.data[i + 2] = Math.max(0, Math.min(255, image.data[i + 2] + grain));
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeOrbitalTrail(planet: PlanetDefinition, date: Date) {
  const samples = 720;
  const points: THREE.Vector3[] = [];
  const windowDays = Math.max(planet.periodDays, 365.25) * 0.999;
  const start = date.getTime() - (windowDays * DAY_MS) / 2;
  for (let i = 0; i < samples; i += 1) {
    const sampleDate = new Date(start + (i / (samples - 1)) * windowDays * DAY_MS);
    points.push(planetPosition(planet.body, sampleDate));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: planet.orbitColor,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  line.userData.planetTrail = planet.name;
  return line;
}

function makeSpacecraftModel(color: number) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.95, 16), new THREE.MeshStandardMaterial({ color: 0xbdbdbd, metalness: 0.65, roughness: 0.35 }));
  body.rotation.z = Math.PI / 2;
  group.add(body);
  const dish = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.18, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xe7e7e7, metalness: 0.25, roughness: 0.5, side: THREE.DoubleSide }));
  dish.rotation.z = -Math.PI / 2;
  dish.position.x = -0.48;
  group.add(dish);
  const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x1b355a, metalness: 0.25, roughness: 0.5 });
  [-1, 1].forEach((side) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 0.42), panelMaterial);
    panel.position.y = side * 0.62;
    group.add(panel);
  });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), new THREE.MeshBasicMaterial({ color }));
  beacon.position.x = 0.5;
  group.add(beacon);
  group.scale.setScalar(1.15);
  return group;
}

function missionCurve(def: (typeof MISSION_DEFS)[number]) {
  const d = def.direction.clone().normalize();
  const start = d.clone().multiplyScalar(visualDistance(0.8));
  const far = d.clone().multiplyScalar(155);
  const c1 = start.clone().add(d.clone().multiplyScalar(28)).add(def.bend);
  const c2 = far.clone().multiplyScalar(0.55).add(def.bend.clone().multiplyScalar(2));
  return new THREE.CatmullRomCurve3([start, c1, c2, far]);
}

function makeAsteroidField() {
  const count = 1500;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const radius = 2.05 + Math.random() * 1.35;
    const angle = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 1.2;
    const distance = visualDistance(radius);
    positions[i * 3] = Math.cos(angle) * distance;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * distance;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0x9b9287, size: 0.16, transparent: true, opacity: 0.65, sizeAttenuation: true });
  return new THREE.Points(geometry, material);
}

function makeComet(name: string, color: number, phase: number) {
  const group = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), new THREE.MeshBasicMaterial({ color }));
  group.add(head);
  const tailGeometry = new THREE.BufferGeometry();
  const tailPositions = new Float32Array(30 * 3);
  for (let i = 0; i < 30; i += 1) {
    tailPositions[i * 3] = -i * 0.38;
    tailPositions[i * 3 + 1] = Math.sin(i * 0.45 + phase) * 0.08;
    tailPositions[i * 3 + 2] = Math.cos(i * 0.4 + phase) * 0.08;
  }
  tailGeometry.setAttribute("position", new THREE.BufferAttribute(tailPositions, 3));
  group.add(new THREE.Points(tailGeometry, new THREE.PointsMaterial({ color, size: 0.16, transparent: true, opacity: 0.38 })));
  group.userData.cometName = name;
  group.userData.phase = phase;
  return group;
}

export default function SolarSystemScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectsRef = useRef(new Map<string, THREE.Mesh>());
  const positionsRef = useRef(new Map<string, THREE.Vector3>());
  const simDateRef = useRef(new Date());
  const pausedRef = useRef(false);
  const speedRef = useRef(DEFAULT_SPEED);
  const selectedRef = useRef("Earth");
  const flyTargetRef = useRef<THREE.Vector3 | null>(null);
  const flyCameraRef = useRef<THREE.Vector3 | null>(null);
  const [simDate, setSimDate] = useState(new Date());
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState("Earth");
  const [search, setSearch] = useState("");
  const [sceneReady, setSceneReady] = useState(false);
  const [layers, setLayers] = useState({ moons: true, missions: true, asteroids: false, trails: true });

  const filteredPlanets = PLANETS.filter((planet) => planet.name.toLowerCase().includes(search.toLowerCase()));
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { simDateRef.current = simDate; }, [simDate]);

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020204);
    scene.fog = new THREE.FogExp2(0x020204, 0.0009);
    const camera = new THREE.PerspectiveCamera(52, mount.clientWidth / mount.clientHeight, 0.1, 2500);
    camera.position.set(0, 48, 92);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.minDistance = 6;
    controls.maxDistance = 520;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0x7c879c, 0.2));
    scene.add(new THREE.PointLight(0xffe8bf, 7.0, 0, 0.16));
    const solarLight = new THREE.DirectionalLight(0xfff0cf, 3.2);
    solarLight.position.set(0, 0, 0);
    scene.add(solarLight);

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(4200 * 3);
    for (let i = 0; i < 4200; i += 1) {
      const radius = 700 + Math.random() * 1000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 1.25, transparent: true, opacity: 0.78 })));

    const sun = new THREE.Mesh(new THREE.SphereGeometry(5.2, 96, 96), new THREE.MeshStandardMaterial({ color: 0xffc15d, emissive: 0xff8a22, emissiveIntensity: 2.6, roughness: 0.28 }));
    scene.add(sun);
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(7.6, 48, 48), new THREE.MeshBasicMaterial({ color: 0xffa62b, transparent: true, opacity: 0.075, depthWrite: false })));
    const sunLabel = makeLabel("SUN");
    sunLabel.position.set(0, 7.2, 0);
    sunLabel.scale.set(8, 2, 1);
    scene.add(sunLabel);

    const trailGroup = new THREE.Group();
    scene.add(trailGroup);
    const trailMap = new Map<string, THREE.Line>();
    PLANETS.forEach((planet) => {
      scene.add(makeOrbit(visualDistance(planet.au), planet.orbitColor));
      const trail = makeOrbitalTrail(planet, simDateRef.current);
      trailGroup.add(trail);
      trail.visible = true;
      trailMap.set(planet.name, trail);
    });

    const moonGroup = new THREE.Group();
    const moonMeshes = new Map<string, THREE.Mesh>();
    MOONS.forEach((moon) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(moon.radius, 20, 20), new THREE.MeshStandardMaterial({ color: moon.color, roughness: 0.9 }));
      mesh.userData.moon = moon.name;
      moonGroup.add(mesh);
      moonMeshes.set(moon.name, mesh);
    });
    scene.add(moonGroup);

    const asteroidField = makeAsteroidField();
    asteroidField.visible = false;
    scene.add(asteroidField);

    const cometGroup = new THREE.Group();
    const comets = [makeComet("HALLEY", 0xbfdcff, 0.2), makeComet("67P", 0xe8c58b, 1.7), makeComet("HALE-BOPP", 0xffffff, 3.4)];
    comets.forEach((comet) => cometGroup.add(comet));
    scene.add(cometGroup);

    const missionGroup = new THREE.Group();
    const missionCurves = new Map<string, THREE.CatmullRomCurve3>();
    const missionModels = new Map<string, THREE.Group>();
    MISSION_DEFS.forEach((mission) => {
      const curve = missionCurve(mission);
      missionCurves.set(mission.name, curve);
      const points = curve.getPoints(220);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.LineDashedMaterial({ color: mission.color, transparent: true, opacity: 0.42, dashSize: 1.8, gapSize: 1.1 });
      const path = new THREE.Line(geometry, line);
      path.computeLineDistances();
      missionGroup.add(path);
      const model = makeSpacecraftModel(mission.color);
      const label = makeLabel(mission.name);
      label.scale.set(11, 2.2, 1);
      label.position.y = 1.8;
      model.add(label);
      missionGroup.add(model);
      missionModels.set(mission.name, model);
    });
    scene.add(missionGroup);

    PLANETS.forEach((planet) => {
      const texture = makePlanetTexture(planet);
      const material = new THREE.MeshStandardMaterial({ map: texture, color: 0xffffff, roughness: planet.name === "Earth" ? 0.58 : planet.name === "Venus" ? 0.72 : 0.82, metalness: 0, envMapIntensity: 0.18 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(planet.radius, 48, 48), material);
      mesh.userData.planet = planet.name;
      scene.add(mesh);
      objectsRef.current.set(planet.name, mesh);
      const text = makeLabel(planet.name);
      text.position.y = planet.radius + 2.2;
      text.scale.set(8, 2, 1);
      mesh.add(text);
      if (["Earth", "Venus", "Uranus", "Neptune"].includes(planet.name)) {
        const atmosphereColor = planet.name === "Venus" ? 0xffd8a0 : planet.name === "Earth" ? 0x4d9dff : planet.name === "Neptune" ? 0x4f78ff : 0x7de6f2;
        mesh.add(new THREE.Mesh(new THREE.SphereGeometry(planet.radius * 1.035, 40, 40), new THREE.MeshBasicMaterial({ color: atmosphereColor, transparent: true, opacity: planet.name === "Earth" ? 0.1 : 0.055, side: THREE.BackSide, depthWrite: false })));
      }
      if (planet.name === "Saturn") {
        const ring = new THREE.Mesh(new THREE.RingGeometry(5.0, 7.0, 128), new THREE.MeshStandardMaterial({ color: 0xc8b58e, roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.78 }));
        ring.rotation.x = Math.PI / 2.25;
        mesh.add(ring);
      }
      if (planet.name === "Uranus") {
        const ring = new THREE.Mesh(new THREE.RingGeometry(3.3, 4.0, 128), new THREE.MeshStandardMaterial({ color: 0x99c5c9, roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.35 }));
        ring.rotation.x = Math.PI / 2.1;
        mesh.add(ring);
      }
    });

    const flyTo = (name: string) => {
      const target = name === "SUN" ? new THREE.Vector3() : positionsRef.current.get(name)?.clone();
      if (!target) return;
      const planet = PLANETS.find((item) => item.name === name);
      const distance = planet ? Math.max(planet.radius * 8, 15) : 30;
      const direction = target.clone().normalize();
      const cameraTarget = target.clone().add(new THREE.Vector3(0, planet ? planet.radius * 1.5 : 3, 0));
      const cameraPosition = target.clone().add(direction.multiplyScalar(distance)).add(new THREE.Vector3(0, planet ? planet.radius * 2.2 : 8, 0));
      flyTargetRef.current = cameraTarget;
      flyCameraRef.current = cameraPosition;
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(Array.from(objectsRef.current.values()), false);
      if (hits.length) {
        const name = String(hits[0].object.userData.planet);
        setSelected(name);
        flyTo(name);
      }
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resize);

    let rafId = 0;
    let last = performance.now();
    let trailClock = 0;
    const animate = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!pausedRef.current) {
        const next = new Date(simDateRef.current.getTime() + delta * speedRef.current * DAY_MS);
        if (next.getTime() > MAX_DATE) next.setTime(MIN_DATE);
        simDateRef.current = next;
        if (Math.floor(now / 100) % 2 === 0) setSimDate(new Date(next));
      }

      PLANETS.forEach((planet) => {
        const position = planetPosition(planet.body, simDateRef.current);
        const mesh = objectsRef.current.get(planet.name);
        if (mesh) mesh.position.copy(position);
        positionsRef.current.set(planet.name, position.clone());
      });

      MOONS.forEach((moon) => {
        const parent = positionsRef.current.get(moon.parent);
        const mesh = moonMeshes.get(moon.name);
        if (!parent || !mesh) return;
        const days = (simDateRef.current.getTime() - new Date("2000-01-01T12:00:00Z").getTime()) / DAY_MS;
        const angle = (days / moon.periodDays) * Math.PI * 2 + moon.distance;
        mesh.position.set(parent.x + Math.cos(angle) * moon.distance, parent.y + Math.sin(angle * 0.7) * moon.distance * 0.08, parent.z + Math.sin(angle) * moon.distance);
      });

      const missionTime = (simDateRef.current.getTime() - new Date("2000-01-01T00:00:00Z").getTime()) / DAY_MS;
      MISSION_DEFS.forEach((mission) => {
        const curve = missionCurves.get(mission.name);
        const model = missionModels.get(mission.name);
        if (!curve || !model) return;
        const progress = Math.min(0.98, Math.max(0.02, (missionTime / 365.25 - (mission.start - 2000)) / 42));
        model.position.copy(curve.getPointAt(progress));
        model.rotation.y += delta * 0.18;
      });

      const cometTime = missionTime / 120;
      comets.forEach((comet, index) => {
        const angle = cometTime + Number(comet.userData.phase) + index * 1.7;
        const radius = 18 + index * 9 + Math.sin(angle * 0.37) * 8;
        comet.position.set(Math.cos(angle) * visualDistance(radius / 14), Math.sin(angle * 0.5) * 4, Math.sin(angle) * visualDistance(radius / 14));
        comet.rotation.y = -angle;
      });

      trailClock += delta;
      if (trailClock > 2 && !pausedRef.current) {
        trailClock = 0;
        PLANETS.forEach((planet) => {
          const old = trailMap.get(planet.name);
          const next = makeOrbitalTrail(planet, simDateRef.current);
          trailGroup.remove(old!);
          old?.geometry.dispose();
          (old?.material as THREE.Material | undefined)?.dispose();
          trailGroup.add(next);
          trailMap.set(planet.name, next);
        });
      }

      objectsRef.current.forEach((mesh, name) => {
        const material = mesh.material as THREE.MeshStandardMaterial;
        const isSelected = name === selectedRef.current;
        material.emissive = new THREE.Color(isSelected ? 0x303030 : 0x000000);
        material.emissiveIntensity = isSelected ? 0.7 : 0;
        mesh.rotation.y += delta * 0.05;
      });

      if (flyTargetRef.current && flyCameraRef.current) {
        controls.target.lerp(flyTargetRef.current, 0.075);
        camera.position.lerp(flyCameraRef.current, 0.075);
        if (camera.position.distanceTo(flyCameraRef.current) < 0.15) {
          flyTargetRef.current = null;
          flyCameraRef.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    setSceneReady(true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      objectsRef.current.clear();
      positionsRef.current.clear();
      controlsRef.current = null;
    };
  }, []);

  const selectPlanet = (name: string) => {
    setSelected(name);
    const target = positionsRef.current.get(name)?.clone();
    if (!target) return;
    const planet = PLANETS.find((item) => item.name === name);
    const distance = planet ? Math.max(planet.radius * 8, 15) : 30;
    const direction = target.clone().normalize();
    flyTargetRef.current = target.clone();
    flyCameraRef.current = target.clone().add(direction.multiplyScalar(distance)).add(new THREE.Vector3(0, planet ? planet.radius * 2.2 : 8, 0));
  };

  const resetView = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.target.set(0, 0, 0);
    controls.object.position.set(0, 48, 92);
    controls.update();
  };

  return (
    <div className={styles.sceneShell}>
      <div ref={mountRef} className={styles.canvas} />
      {!sceneReady && <div className={styles.sceneLoading}>INITIALIZING 3D SPACE...</div>}

      <aside className={styles.leftPanel}>
        <div className={styles.panelHeading}>DESTINATIONS <span>{PLANETS.length}</span></div>
        <input className={styles.search} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="SEARCH WORLD" aria-label="Search planets" />
        <div className={styles.planetList}>
          {filteredPlanets.map((planet) => (
            <button key={planet.name} className={`${styles.planetButton} ${selected === planet.name ? styles.active : ""}`} onClick={() => selectPlanet(planet.name)}>
              <i style={{ background: `#${planet.color.toString(16).padStart(6, "0")}` }} />
              <span>{planet.name.toUpperCase()}</span>
              <small>{planet.type}</small>
            </button>
          ))}
        </div>
      </aside>

      <div className={styles.layerPanel}>
        <span>LAYERS</span>
        {([['moons', 'MOONS'], ['missions', 'SPACECRAFT'], ['asteroids', 'ASTEROIDS / COMETS'], ['trails', 'ORBITAL TRAILS']] as const).map(([key, label]) => (
          <button key={key} className={layers[key] ? styles.layerActive : ""} onClick={() => setLayers((current) => ({ ...current, [key]: !current[key] }))}>{label}</button>
        ))}
      </div>

      <div className={styles.sceneTools}>
        <button onClick={resetView}>HOME</button>
        <button onClick={() => selectPlanet("Earth")}>EARTH</button>
      </div>

      <div className={styles.timeline}>
        <div className={styles.timelineTop}>
          <div><span>DATE + TIME</span><strong>{simDate.toISOString().slice(0, 16).replace("T", " / ")} UTC</strong></div>
          <div className={styles.speedControls}>
            <span>SPEED</span>
            {[0, 0.35, 3, 30, 300].map((value) => (
              <button key={value} className={speed === value ? styles.speedActive : ""} onClick={() => { setSpeed(value); setPaused(value === 0); }}>
                {value === 0 ? "PAUSE" : value < 1 ? "REAL" : `${value}×`}
              </button>
            ))}
            <button onClick={() => setPaused((value) => !value)}>{paused ? "PLAY" : "STOP"}</button>
          </div>
        </div>
        <input className={styles.dateSlider} type="range" min={MIN_DATE} max={MAX_DATE} step={DAY_MS} value={Math.min(MAX_DATE, Math.max(MIN_DATE, simDate.getTime()))} onChange={(event) => { const next = new Date(Number(event.target.value)); simDateRef.current = next; setSimDate(next); }} aria-label="Solar system date" />
        <div className={styles.timelineYears}><span>1950</span><span>1975</span><span>2000</span><span>2025</span><span>2050</span></div>
      </div>
    </div>
  );
}
