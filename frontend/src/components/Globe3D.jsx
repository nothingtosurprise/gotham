import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';

const GLOBE_RADIUS = 2;

export default function Globe3D({ flights = [], satellites = [], earthquakes = [], threats = [], activeLayer = 'flights', onPointClick }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const globeRef = useRef(null);
  const frameRef = useRef(null);
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0.3, y: 0 });
  const dotsGroupRef = useRef(null);

  function latLonToVec3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  useEffect(() => {
    const mount = mountRef.current;
    const W = mount.clientWidth, H = mount.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 6);
    cameraRef.current = camera;

    // Ambient + directional light
    scene.add(new THREE.AmbientLight(0x1a2940, 2));
    const dirLight = new THREE.DirectionalLight(0x63b3ed, 1.2);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);
    const rimLight = new THREE.DirectionalLight(0x3182ce, 0.4);
    rimLight.position.set(-5, -3, -5);
    scene.add(rimLight);

    // Globe sphere
    const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const globeMat = new THREE.MeshPhongMaterial({
      color: 0x0a1628,
      emissive: 0x061020,
      specular: 0x63b3ed,
      shininess: 15,
      transparent: true,
      opacity: 0.95,
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);
    globeRef.current = globe;

    // Wireframe overlay (latitude/longitude grid)
    const wireGeo = new THREE.SphereGeometry(GLOBE_RADIUS + 0.002, 32, 32);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x1a3a5c,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    scene.add(new THREE.Mesh(wireGeo, wireMat));

    // Atmosphere glow
    const atmGeo = new THREE.SphereGeometry(GLOBE_RADIUS + 0.12, 64, 64);
    const atmMat = new THREE.MeshPhongMaterial({
      color: 0x1a4a7a,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    // Outer glow ring
    const ringGeo = new THREE.SphereGeometry(GLOBE_RADIUS + 0.25, 64, 64);
    const ringMat = new THREE.MeshPhongMaterial({
      color: 0x63b3ed,
      transparent: true,
      opacity: 0.03,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(ringGeo, ringMat));

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starVerts = [];
    for (let i = 0; i < 3000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 30 + Math.random() * 30;
      starVerts.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x8ab4d4, size: 0.04, transparent: true, opacity: 0.7 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Data dots group
    const dotsGroup = new THREE.Group();
    scene.add(dotsGroup);
    dotsGroupRef.current = dotsGroup;

    // Animate
    let t = 0;
    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.001;

      // Slow auto-rotate when not dragging
      if (!isDragging.current) rotation.current.y += 0.0015;

      globe.rotation.x = rotation.current.x;
      globe.rotation.y = rotation.current.y;
      dotsGroup.rotation.x = rotation.current.x;
      dotsGroup.rotation.y = rotation.current.y;

      renderer.render(scene, camera);
    }
    animate();

    // Resize
    const onResize = () => {
      const W = mount.clientWidth, H = mount.clientHeight;
      renderer.setSize(W, H);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // Mouse drag
    const onMouseDown = (e) => { isDragging.current = true; prevMouse.current = { x: e.clientX, y: e.clientY }; };
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - prevMouse.current.x;
      const dy = e.clientY - prevMouse.current.y;
      rotation.current.y += dx * 0.005;
      rotation.current.x += dy * 0.005;
      rotation.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.current.x));
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDragging.current = false; };
    mount.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Update dots when data changes
  useEffect(() => {
    const group = dotsGroupRef.current;
    if (!group) return;
    // Clear old dots
    while (group.children.length) group.remove(group.children[0]);

    const addDot = (lat, lon, color, size = 0.025) => {
      if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return;
      const pos = latLonToVec3(lat, lon, GLOBE_RADIUS + 0.03);
      const geo = new THREE.SphereGeometry(size, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      group.add(mesh);

      // Ping ring
      const ringGeo = new THREE.RingGeometry(size * 1.5, size * 2.5, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(0, 0, 0);
      group.add(ring);
    };

    if (activeLayer === 'flights' || activeLayer === 'all') {
      flights.slice(0, 200).forEach(f => addDot(f.latitude, f.longitude, 0x63b3ed, 0.018));
    }
    if (activeLayer === 'earthquakes' || activeLayer === 'all') {
      earthquakes.forEach(e => {
        const size = Math.max(0.02, Math.min(0.08, (e.magnitude - 2) * 0.015));
        const color = e.magnitude >= 6 ? 0xfc8181 : e.magnitude >= 4.5 ? 0xf6ad55 : 0xf6e05e;
        addDot(e.latitude, e.longitude, color, size);
      });
    }
    if (activeLayer === 'threats' || activeLayer === 'all') {
      threats.forEach(t => {
        const color = t.type === 'CRITICAL' ? 0xfc8181 : t.type === 'HIGH' ? 0xf6ad55 : 0x63b3ed;
        addDot(t.latitude, t.longitude, color, 0.022);
      });
    }
    if (activeLayer === 'satellites' || activeLayer === 'all') {
      satellites.slice(0, 80).forEach(s => addDot(s.latitude, s.longitude, 0x68d391, 0.02));
    }
  }, [flights, satellites, earthquakes, threats, activeLayer]);

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
  );
}
