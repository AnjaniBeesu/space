"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  distance: string;
};

const PLANETS: PlanetDefinition[] = [
  { name: "Mercury", body: Astronomy.Body.Mercury, type: "TERRESTRIAL", radius: 0.9, color: 0x9b9b9b, orbitColor: 0x555555, period: "88 days", distance: "0.39 AU" },
  { name: "Venus", body: Astronomy.Body.Venus, type: "TERRESTRIAL", radius: 1.35, color: 0xd6a86a, orbitColor: 0x66605a, period: "224.7 days", distance: "0.72 AU" },
  { name: "Earth", body: Astronomy.Body.Earth, type: "TERRESTRIAL", radius: 1.5, color: 0x4e83c2, orbitColor: 0x737b87, period: "365.25 days", distance: "1.00 AU" },
  { name: "Mars", body: Astronomy.Body.Mars, type: "TERRESTRIAL", radius: 1.15, color: 0xb95843, orbitColor: 0x66534e, period: "687 days", distance: "1.52 AU" },
  { name: "Jupiter", body: Astronomy.Body.Jupiter, type: "GAS GIANT", radius: 4.5, color: 0xc18d68, orbitColor: 0x6e6259, period: "11.86 years", distance: "5.20 AU" },
  { name: "Saturn", body: Astronomy.Body.Saturn, type: "GAS GIANT", radius: 3.8, color: 0xd5bc82, orbitColor: 0x706856, period: "29.45 years", distance: "9.58 AU" },
  { name: "Uranus", body: Astronomy.Body.Uranus, type: "ICE GIANT", radius: 2.7, color: 0x7cc7d1, orbitColor: 0x596b6d, period: "84 years", distance: "19.2 AU" },
  { name: "Neptune", body: Astronomy.Body.Neptune, type: "ICE GIANT", radius: 2.6, color: 0x4774d6, orbitColor: 0x4d5a75, period: "164.8 years", distance: "30.05 AU" },
  { name: "Pluto", body: Astronomy.Body.Pluto, type: "DWARF PLANET", radius: 0.72, color: 0xb7a38f, orbitColor: 0x4d4a47, period: "248 years", distance: "39.5 AU" },
];

const MIN_DATE = new Date("1950-01-01T00:00:00Z").getTime();
const MAX_DATE = new Date("2050-12-31T23:59:59Z").getTime();
const DEFAULT_SPEED = 0.35;

function visualDistance(au: number) {
  return 15 + Math.pow(Math.max(au, 0.05), 0.58) * 14;
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
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.42 });
  return new THREE.LineLoop(geometry, material);
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
  const [simDate, setSimDate] = useState(new Date());
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState("Earth");
  const [search, setSearch] = useState("");
  const [sceneReady, setSceneReady] = useState(false);

  const selectedPlanet = useMemo(() => PLANETS.find((planet) => planet.name === selected) ?? PLANETS[2], [selected]);
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
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.minDistance = 9;
    controls.maxDistance = 480;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0x7c879c, 0.24));
    scene.add(new THREE.PointLight(0xfff2cf, 4.2, 0, 0.2));

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

    const sun = new THREE.Mesh(new THREE.SphereGeometry(5.2, 48, 48), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
    scene.add(sun);
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(7.2, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffb84d, transparent: true, opacity: 0.075, depthWrite: false })));
    const sunLabel = makeLabel("SUN");
    sunLabel.position.set(0, 7.2, 0);
    sunLabel.scale.set(8, 2, 1);
    scene.add(sunLabel);

    PLANETS.forEach((planet) => {
      const distance = visualDistance(Number(planet.distance.split(" ")[0]));
      scene.add(makeOrbit(distance, planet.orbitColor));

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(planet.radius, 32, 32),
        new THREE.MeshStandardMaterial({ color: planet.color, roughness: 0.82, metalness: 0.02 })
      );
      mesh.userData.planet = planet.name;
      scene.add(mesh);
      objectsRef.current.set(planet.name, mesh);

      const text = makeLabel(planet.name);
      text.position.y = planet.radius + 2.2;
      text.scale.set(8, 2, 1);
      mesh.add(text);

      if (planet.name === "Saturn") {
        const ring = new THREE.Mesh(new THREE.RingGeometry(5.0, 7.0, 96), new THREE.MeshBasicMaterial({ color: 0xc8b58e, side: THREE.DoubleSide, transparent: true, opacity: 0.72 }));
        ring.rotation.x = Math.PI / 2.25;
        mesh.add(ring);
      }
      if (planet.name === "Uranus") {
        const ring = new THREE.Mesh(new THREE.RingGeometry(3.3, 4.0, 96), new THREE.MeshBasicMaterial({ color: 0x99c5c9, side: THREE.DoubleSide, transparent: true, opacity: 0.35 }));
        ring.rotation.x = Math.PI / 2.1;
        mesh.add(ring);
      }
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(Array.from(objectsRef.current.values()), false);
      if (hits.length) setSelected(String(hits[0].object.userData.planet));
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
    const animate = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!pausedRef.current) {
        const next = new Date(simDateRef.current.getTime() + delta * speedRef.current * 86400000);
        if (next.getTime() > MAX_DATE) next.setTime(MIN_DATE);
        simDateRef.current = next;
        if (Math.floor(now / 100) % 2 === 0) setSimDate(new Date(next));
      }

      PLANETS.forEach((planet) => {
        const vector = Astronomy.HelioVector(planet.body, simDateRef.current);
        const length = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
        const distance = visualDistance(length);
        const position = new THREE.Vector3((vector.x / length) * distance, (vector.z / length) * distance, (-vector.y / length) * distance);
        const mesh = objectsRef.current.get(planet.name);
        if (mesh) mesh.position.copy(position);
        positionsRef.current.set(planet.name, position.clone());
      });

      objectsRef.current.forEach((mesh, name) => {
        const material = mesh.material as THREE.MeshStandardMaterial;
        const isSelected = name === selectedRef.current;
        material.emissive = new THREE.Color(isSelected ? 0x303030 : 0x000000);
        material.emissiveIntensity = isSelected ? 0.7 : 0;
        mesh.rotation.y += delta * 0.05;
      });

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

  const focusSelected = () => {
    const meshPosition = positionsRef.current.get(selected);
    const controls = controlsRef.current;
    if (!meshPosition || !controls) return;
    controls.target.copy(meshPosition);
    controls.object.position.copy(meshPosition.clone().add(new THREE.Vector3(0, 10, 18)));
    controls.update();
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
            <button key={planet.name} className={`${styles.planetButton} ${selected === planet.name ? styles.active : ""}`} onClick={() => setSelected(planet.name)}>
              <i style={{ background: `#${planet.color.toString(16).padStart(6, "0")}` }} />
              <span>{planet.name.toUpperCase()}</span>
              <small>{planet.type}</small>
            </button>
          ))}
        </div>
      </aside>

      <aside className={styles.infoPanel}>
        <div className={styles.infoNumber}>PLANET / {String(PLANETS.findIndex((planet) => planet.name === selected) + 1).padStart(2, "0")}</div>
        <h2>{selectedPlanet.name}</h2>
        <p>{selectedPlanet.type}</p>
        <div className={styles.infoGrid}>
          <span>ORBIT</span><strong>{selectedPlanet.period}</strong>
          <span>MEAN DISTANCE</span><strong>{selectedPlanet.distance}</strong>
        </div>
        <button className={styles.focusButton} onClick={focusSelected}>FOCUS ON {selectedPlanet.name.toUpperCase()} ↗</button>
      </aside>

      <div className={styles.sceneTools}>
        <button onClick={resetView}>HOME</button>
        <button onClick={() => setSelected("Earth")}>EARTH</button>
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
        <input className={styles.dateSlider} type="range" min={MIN_DATE} max={MAX_DATE} step={86400000} value={Math.min(MAX_DATE, Math.max(MIN_DATE, simDate.getTime()))} onChange={(event) => { const next = new Date(Number(event.target.value)); simDateRef.current = next; setSimDate(next); }} aria-label="Solar system date" />
        <div className={styles.timelineYears}><span>1950</span><span>1975</span><span>2000</span><span>2025</span><span>2050</span></div>
      </div>
    </div>
  );
}
