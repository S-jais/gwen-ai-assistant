'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  Zap,
  Activity,
  Cpu,
  Radio,
  Play,
  Eye,
  Maximize2,
  User,
  Loader2,
} from 'lucide-react';

interface GwenVirtualFaceProps {
  onPromptSelect?: (prompt: string) => void;
}

// Generate soft radial glow point sprite for holographic particle cloud
function createGlowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.2, 'rgba(255, 42, 95, 0.95)');
    gradient.addColorStop(0.55, 'rgba(255, 26, 64, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 26, 64, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function GwenVirtualFace({ onPromptSelect }: GwenVirtualFaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentMode, setCurrentMode] = useState<'manager' | 'rag' | 'research' | 'planner' | 'coder'>('manager');
  const [greetingText, setGreetingText] = useState('Hello sir, I am GWEN');
  const [subGreeting, setSubGreeting] = useState(
    'Autonomous Multi-Agent Intelligence Core online and accelerated by your local RTX 4060 GPU. Awaiting your directive.'
  );
  const [viewMode, setViewMode] = useState<'face' | 'full'>('face');
  const [modelLoading, setModelLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  // References for Three.js state
  const isSpeakingRef = useRef(false);
  isSpeakingRef.current = isSpeaking;

  const viewModeRef = useRef<'face' | 'full'>('face');
  viewModeRef.current = viewMode;

  // Audio speech synthesis
  const speakGreeting = useCallback((customText?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const textToSpeak =
      customText ||
      'Hello sir, I am GWEN. Your local first multi agent assistant is ready. How can I help your workflow today?';

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.05;
    utterance.pitch = 1.1;

    // Pick articulate female voice if available
    const voices = window.speechSynthesis.getVoices();
    const gwenVoice =
      voices.find(
        (v) =>
          v.name.includes('Zira') ||
          v.name.includes('Samantha') ||
          v.name.includes('Google UK English Female') ||
          v.name.includes('Female')
      ) || voices[0];
    if (gwenVoice) utterance.voice = gwenVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const handleModeChange = (mode: 'manager' | 'rag' | 'research' | 'planner' | 'coder') => {
    setCurrentMode(mode);
    let msg = '';
    let sub = '';
    let voiceText = '';

    switch (mode) {
      case 'manager':
        msg = 'Hello sir, I am GWEN — Manager Core';
        sub = 'Orchestrating autonomous delegation across 5 specialized local neural agents.';
        voiceText = 'Manager Core active. Standing by for multi-agent delegation.';
        break;
      case 'rag':
        msg = 'GWEN — Document Intelligence';
        sub = 'Vector index synced with ChromaDB. Ready to extract citations and synthesize lecture notes.';
        voiceText = 'Document agent ready. Upload notes or query the local knowledge vault.';
        break;
      case 'research':
        msg = 'GWEN — Deep Web Scout';
        sub = 'Real-time multi-query web search & scraping pipeline initialized.';
        voiceText = 'Research scout active. Ready to explore live web sources.';
        break;
      case 'planner':
        msg = 'GWEN — Strategic Task Planner';
        sub = 'Algorithmic timeline formulation, milestone tracking, and 10-day exam schedules ready.';
        voiceText = 'Strategic planner ready. Tell me your deadline to generate a structured timeline.';
        break;
      case 'coder':
        msg = 'GWEN — Code & Logic Engine';
        sub = 'Static syntax validation, algorithm generation, and local code synthesis ready.';
        voiceText = 'Coding agent ready. Send requirements or algorithms to implement.';
        break;
    }

    setGreetingText(msg);
    setSubGreeting(sub);
    if (soundEnabled) {
      speakGreeting(voiceText);
    }
  };

  // Three.js 3D WebGL Hologram Scene for gwen.obj
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    const scene = new THREE.Scene();

    // Camera setup with refined framing coordinates
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

    // Precise Face & Full Body Anchors derived from gwen.obj geometry
    const HEAD_TARGET = new THREE.Vector3(-0.72, 3.45, 0.3);
    const HEAD_CAM_POS = new THREE.Vector3(-0.72, 3.35, 4.4);

    const FULL_TARGET = new THREE.Vector3(0.2, 0.0, 0.0);
    const FULL_CAM_POS = new THREE.Vector3(0.2, 0.0, 16.2);

    camera.position.copy(HEAD_CAM_POS);
    camera.lookAt(HEAD_TARGET);

    const currentCamTarget = HEAD_TARGET.clone();
    const currentCamPos = HEAD_CAM_POS.clone();

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const resize = () => {
      if (!canvas) return;
      const width = canvas.parentElement?.clientWidth || 340;
      const height = canvas.parentElement?.clientHeight || 340;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    window.addEventListener('resize', resize);

    // Root Hologram Pivot Group for interactive rotation
    const avatarGroup = new THREE.Group();
    scene.add(avatarGroup);

    // Glow sprite texture
    const glowTexture = createGlowTexture();

    // 1. Hologram Fresnel Shader Material (Volumetric Cyber Core)
    const fresnelShaderMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: new THREE.Color('#ff1a40') },
        uTime: { value: 0 },
        uScanY: { value: 0 },
        uSpeechAmp: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        uniform float uScanY;
        uniform float uSpeechAmp;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), 2.5);

          // Moving vertical scanline beam
          float scanDist = abs(vWorldPosition.y - uScanY);
          float scanGlow = smoothstep(0.9, 0.0, scanDist) * 0.85;

          // Hologram horizontal raster grid
          float grid = sin(vWorldPosition.y * 32.0 + uTime * 3.5) * 0.06 + 0.06;

          // Audio speech pulsation
          float pulse = uSpeechAmp * 0.5;

          vec3 baseCol = uColor;
          vec3 highlight = vec3(1.0, 0.85, 0.9) * (scanGlow * 0.8 + pulse * 0.65);
          vec3 col = baseCol + highlight;

          float alpha = clamp(fresnel * 0.42 + scanGlow * 0.45 + grid + pulse * 0.25, 0.0, 0.8);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    // 2. Cyber Wireframe Material (Lattice structure in #ff1a40)
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ff1a40'),
      wireframe: true,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
    });

    // 3. Glowing Particle Point Cloud Material
    const pointsMaterial = new THREE.PointsMaterial({
      color: new THREE.Color('#ff2a5f'),
      size: 0.048,
      map: glowTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // 4. Cybernetic Glowing Ocular Points (Eyes on Gwen's face)
    const eyesGroup = new THREE.Group();
    avatarGroup.add(eyesGroup);

    const eyeGeo = new THREE.BufferGeometry();
    // Normalized eye positions on Gwen's face:
    // Left eye ~ (-0.95, 3.65, 0.53), Right eye ~ (-0.48, 3.63, 0.51)
    const eyeVertices = new Float32Array([
      -0.95, 3.65, 0.53,
      -0.48, 3.63, 0.51,
    ]);
    eyeGeo.setAttribute('position', new THREE.BufferAttribute(eyeVertices, 3));
    const eyesMat = new THREE.PointsMaterial({
      color: new THREE.Color('#ffffff'),
      size: 0.18,
      map: glowTexture,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const eyesMesh = new THREE.Points(eyeGeo, eyesMat);
    eyesGroup.add(eyesMesh);

    // 5. Orbital Gyroscopic Gimbal Rings (Adaptive positioning)
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    // Primary Gimbal Ring (Inclined)
    const ringGeo1 = new THREE.RingGeometry(5.8, 5.86, 72);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ff1a40'),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.rotation.x = Math.PI * 0.38;
    ringMesh1.rotation.y = Math.PI * 0.15;
    ringGroup.add(ringMesh1);

    // Secondary Gimbal Ring (Opposite incline)
    const ringGeo2 = new THREE.RingGeometry(6.6, 6.65, 72);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ff2a5f'),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = -Math.PI * 0.32;
    ringMesh2.rotation.z = Math.PI * 0.22;
    ringGroup.add(ringMesh2);

    // Orbiting Spark Nodes on Rings
    const orbitNodesGeo = new THREE.BufferGeometry();
    const orbitNodePos = new Float32Array(12 * 3);
    orbitNodesGeo.setAttribute('position', new THREE.BufferAttribute(orbitNodePos, 3));
    const orbitNodesMat = new THREE.PointsMaterial({
      color: new THREE.Color('#ffffff'),
      size: 0.16,
      map: glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    const orbitNodes = new THREE.Points(orbitNodesGeo, orbitNodesMat);
    ringGroup.add(orbitNodes);

    // 6. Floating Neural Energy Dust Particles
    const sparkCount = 80;
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocities: { x: number; y: number; z: number; speed: number; phase: number }[] = [];

    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3 + 0] = (Math.random() - 0.5) * 14;
      sparkPositions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      sparkPositions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      sparkVelocities.push({
        x: (Math.random() - 0.5) * 0.015,
        y: Math.random() * 0.025 + 0.01,
        z: (Math.random() - 0.5) * 0.015,
        speed: Math.random() * 2 + 1,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const sparksGeo = new THREE.BufferGeometry();
    sparksGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparksMat = new THREE.PointsMaterial({
      color: new THREE.Color('#ff4d6d'),
      size: 0.11,
      map: glowTexture,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparksField = new THREE.Points(sparksGeo, sparksMat);
    scene.add(sparksField);

    // Setup Model from Binary Cache or OBJLoader Fallback
    const initGeometry = (geometry: THREE.BufferGeometry) => {
      geometry.computeVertexNormals();

      // Create Hologram Core Mesh
      const hologramMesh = new THREE.Mesh(geometry, fresnelShaderMaterial);
      avatarGroup.add(hologramMesh);

      // Create Cyber Wireframe Lattice
      const wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);
      avatarGroup.add(wireframeMesh);

      // Create Glowing Point Cloud
      const pointCloud = new THREE.Points(geometry, pointsMaterial);
      avatarGroup.add(pointCloud);

      setModelLoading(false);
    };

    // Load geometry (try fast binary first, fallback to OBJLoader)
    const loadModel = async () => {
      try {
        setLoadProgress(30);
        const res = await fetch('/models/gwen.bin');
        if (res.ok) {
          setLoadProgress(65);
          const buffer = await res.arrayBuffer();
          const header = new Uint32Array(buffer, 0, 4);
          const vertexCount = header[0];
          const faceCount = header[1];
          const vertices = new Float32Array(buffer, 16, vertexCount * 3);
          const indices = new Uint32Array(buffer, 16 + vertexCount * 3 * 4, faceCount * 3);

          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
          geometry.setIndex(new THREE.BufferAttribute(indices, 1));
          setLoadProgress(100);
          initGeometry(geometry);
          return;
        }
      } catch (err) {
        console.warn('Binary model load failed, falling back to raw gwen.obj', err);
      }

      // Fallback: OBJLoader
      const loader = new OBJLoader();
      loader.load(
        '/models/gwen.obj',
        (obj) => {
          let extractedGeom: THREE.BufferGeometry | null = null;
          obj.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && !extractedGeom) {
              extractedGeom = (child as THREE.Mesh).geometry;
            }
          });

          const geom = extractedGeom as THREE.BufferGeometry | null;
          if (geom) {
            geom.computeBoundingBox();
            const box = geom.boundingBox!;
            const center = new THREE.Vector3();
            box.getCenter(center);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const scaleFactor = 10.0 / maxDim;

            geom.translate(-center.x, -center.y, -center.z);
            geom.scale(scaleFactor, scaleFactor, scaleFactor);

            setLoadProgress(100);
            initGeometry(geom);
          }
        },
        (xhr) => {
          if (xhr.lengthComputable) {
            setLoadProgress(Math.round((xhr.loaded / xhr.total) * 100));
          }
        },
        (error) => {
          console.error('Error loading gwen.obj:', error);
          setModelLoading(false);
        }
      );
    };

    loadModel();

    // Interactive pointer & drag physics
    let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let dragRotation = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const onPointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.targetX = Math.max(-1, Math.min(1, nx));
      mouse.targetY = Math.max(-1, Math.min(1, ny));

      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        dragRotation.targetY += dx * 0.012;
        dragRotation.targetX += dy * 0.012;
        dragStart = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      dragStart = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousedown', onMouseDown);

    // Animation Loop
    let clock = new THREE.Clock();
    let scanY = -5;
    let scanDirection = 1;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth pointer interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      dragRotation.x += (dragRotation.targetX - dragRotation.x) * 0.1;
      dragRotation.y += (dragRotation.targetY - dragRotation.y) * 0.1;

      // Vertical Laser Scanline Sweep
      scanY += scanDirection * 0.07;
      if (scanY > 5.5) {
        scanY = 5.5;
        scanDirection = -1;
      } else if (scanY < -5.5) {
        scanY = -5.5;
        scanDirection = 1;
      }

      // Audio Speech Pulse & Wave
      const speechPulse = isSpeakingRef.current
        ? (Math.sin(elapsedTime * 18) * 0.5 + 0.5) * 0.95
        : Math.sin(elapsedTime * 2.5) * 0.08;

      fresnelShaderMaterial.uniforms.uTime.value = elapsedTime;
      fresnelShaderMaterial.uniforms.uScanY.value = scanY;
      fresnelShaderMaterial.uniforms.uSpeechAmp.value = speechPulse;

      // Interactive Head / Model Rotation with Idle Breathing
      const idleFloat = Math.sin(elapsedTime * 1.5) * 0.1;
      const idleTilt = Math.sin(elapsedTime * 0.8) * 0.03;

      avatarGroup.position.y = idleFloat;
      avatarGroup.rotation.y = mouse.x * 0.38 + dragRotation.y;
      avatarGroup.rotation.x = -mouse.y * 0.25 + idleTilt + dragRotation.x;
      avatarGroup.rotation.z = mouse.x * 0.06;

      // Orbiting Gimbal Rings Dynamic Position & Scale
      const isFaceMode = viewModeRef.current === 'face';
      const targetRingPos = isFaceMode ? HEAD_TARGET : FULL_TARGET;
      const targetRingScale = isFaceMode ? 0.42 : 1.0;

      ringGroup.position.lerp(targetRingPos, 0.08);
      ringGroup.scale.lerp(new THREE.Vector3(targetRingScale, targetRingScale, targetRingScale), 0.08);

      ringMesh1.rotation.z = elapsedTime * 0.25;
      ringMesh2.rotation.y = -elapsedTime * 0.18;

      // Update traveling nodes on orbital rings
      const nodePositions = orbitNodesGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + elapsedTime * 0.5;
        const rad = i % 2 === 0 ? 5.83 : 6.62;
        const tilt = i % 2 === 0 ? 0.38 : -0.32;
        nodePositions[i * 3 + 0] = Math.cos(angle) * rad;
        nodePositions[i * 3 + 1] = Math.sin(angle) * rad * Math.sin(tilt);
        nodePositions[i * 3 + 2] = Math.sin(angle) * rad * Math.cos(tilt);
      }
      orbitNodesGeo.attributes.position.needsUpdate = true;

      // Update Ascending Neural Sparks
      const sparkPosArray = sparksGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < sparkCount; i++) {
        const vel = sparkVelocities[i];
        sparkPosArray[i * 3 + 1] += vel.y * (isSpeakingRef.current ? 1.8 : 1.0);
        sparkPosArray[i * 3 + 0] += Math.sin(elapsedTime * vel.speed + vel.phase) * 0.01;

        if (sparkPosArray[i * 3 + 1] > 7.0) {
          sparkPosArray[i * 3 + 1] = -7.0;
          sparkPosArray[i * 3 + 0] = (Math.random() - 0.5) * 14;
          sparkPosArray[i * 3 + 2] = (Math.random() - 0.5) * 8;
        }
      }
      sparksGeo.attributes.position.needsUpdate = true;

      // Camera Smooth Transition (Face Focus vs Full Body)
      const targetPos = isFaceMode ? HEAD_CAM_POS : FULL_CAM_POS;
      const targetLook = isFaceMode ? HEAD_TARGET : FULL_TARGET;

      currentCamPos.lerp(targetPos, 0.08);
      currentCamTarget.lerp(targetLook, 0.08);

      camera.position.copy(currentCamPos);
      camera.lookAt(currentCamTarget);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      renderer.dispose();
      glowTexture.dispose();
      fresnelShaderMaterial.dispose();
      wireframeMaterial.dispose();
      pointsMaterial.dispose();
    };
  }, []);

  // 2D Audio Waveform Visualizer Canvas
  useEffect(() => {
    const waveCanvas = waveformCanvasRef.current;
    if (!waveCanvas) return;
    const ctx = waveCanvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resizeWave = () => {
      if (!waveCanvas) return;
      waveCanvas.width = waveCanvas.offsetWidth * dpr;
      waveCanvas.height = waveCanvas.offsetHeight * dpr;
    };
    resizeWave();
    window.addEventListener('resize', resizeWave);

    let waveTime = 0;

    const renderWave = () => {
      waveTime += 0.035;
      const w = waveCanvas.width;
      const h = waveCanvas.height;
      ctx.clearRect(0, 0, w, h);

      const midY = h * 0.5;
      const amp = isSpeaking ? 16 * dpr : 3.5 * dpr;

      ctx.beginPath();
      for (let x = 0; x <= w; x += 3 * dpr) {
        const normX = (x / w) * 2 - 1;
        const envelope = Math.exp(-normX * normX * 3.5); // Gaussian bell curve
        const freq1 = Math.sin(waveTime * (isSpeaking ? 12 : 3) + normX * 8);
        const freq2 = Math.cos(waveTime * (isSpeaking ? 8 : 2) + normX * 14);
        const y = midY + (freq1 * 0.65 + freq2 * 0.35) * amp * envelope;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = isSpeaking ? '#ffffff' : '#ff1a40';
      ctx.shadowColor = '#ff1a40';
      ctx.shadowBlur = isSpeaking ? 16 * dpr : 8 * dpr;
      ctx.lineWidth = (isSpeaking ? 2.5 : 1.4) * dpr;
      ctx.stroke();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(renderWave);
    };

    renderWave();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeWave);
    };
  }, [isSpeaking]);

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d1017]/95 via-[#07090e]/95 to-[#11141e]/95 border border-[#ff1a40]/30 shadow-[0_10px_45px_rgba(0,0,0,0.7)] backdrop-blur-2xl p-6 sm:p-8"
    >
      {/* Background Radial Core Red Glow */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-gradient-to-br from-[#ff1a40]/15 via-[#cc002b]/10 to-transparent blur-3xl pointer-events-none" />

      {/* Cyber HUD Grid & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#ff1a40]/20 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-[#ff1a40] shadow-[0_0_12px_#ff1a40] animate-ping absolute" />
            <span className="w-3 h-3 rounded-full bg-[#ff1a40] shadow-[0_0_10px_#ff1a40] relative" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">GWEN AI AVATAR CORE</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#ff1a40]/20 text-[#ff1a40] border border-[#ff1a40]/40 shadow-[0_0_8px_rgba(255,26,64,0.3)]">
                RTX 4060 GPU ACCELERATED
              </span>
            </div>
            <span className="text-[11px] font-['Space_Grotesk'] text-[#94a3b8]">
              High-Fidelity 3D OBJ Matrix • Interactive Gaze Tracking • Neural Speech Synthesis
            </span>
          </div>
        </div>

        {/* Audio / Voice Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (isSpeaking) window.speechSynthesis.cancel();
            }}
            className={`p-2 rounded-xl border transition-all ${
              soundEnabled
                ? 'bg-[#ff1a40]/20 border-[#ff1a40]/50 text-[#ff1a40] shadow-[0_0_12px_rgba(255,26,64,0.25)]'
                : 'bg-[#161925] border-[#2a3045] text-[#64748b]'
            }`}
            title={soundEnabled ? 'Mute AI Voice' : 'Enable AI Voice'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => speakGreeting()}
            className="px-3.5 py-1.5 rounded-xl btn-ghost-primary text-xs font-mono font-semibold flex items-center gap-2 transition-all shadow-[0_0_12px_rgba(255,26,64,0.2)]"
          >
            <Play className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-spin text-white' : 'text-[#ff1a40]'}`} />
            <span>{isSpeaking ? 'Speaking...' : 'Play Voice Greeting'}</span>
          </button>
        </div>
      </div>

      {/* Main Avatar Showcase Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-6 relative z-10">
        {/* Left Column: Interactive 3D WebGL Avatar Viewport */}
        <div
          className="lg:col-span-5 flex flex-col items-center justify-center relative cursor-crosshair group"
          title="Click GWEN's face to hear her speak! Drag to rotate in 3D."
        >
          {/* Canvas Viewport Box */}
          <div className="relative w-[300px] sm:w-[340px] h-[340px] rounded-3xl bg-[#030407]/90 border border-[#ff1a40]/40 p-2 shadow-[0_0_35px_rgba(255,26,64,0.22)] group-hover:border-[#ff1a40] transition-all overflow-hidden flex items-center justify-center select-none">
            {/* Holographic Scanline Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(255,26,64,0.06)_51%)] bg-[length:100%_4px] pointer-events-none opacity-60 z-10" />

            {/* Three.js 3D WebGL Canvas */}
            <canvas
              ref={canvasRef}
              onClick={() => speakGreeting()}
              className="w-full h-full block relative z-0 cursor-grab active:cursor-grabbing"
              style={{ width: '100%', height: '100%' }}
            />

            {/* Loading Indicator */}
            {modelLoading && (
              <div className="absolute inset-0 z-30 bg-[#030407]/85 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#ff1a40] animate-spin" />
                <div className="text-center space-y-1">
                  <span className="text-xs font-mono text-white tracking-widest block font-bold">
                    SYNTHESIZING 3D GWEN MATRIX
                  </span>
                  <span className="text-[10px] font-mono text-[#ff1a40]">
                    Loading 245K Neural Vertices ({loadProgress}%)
                  </span>
                </div>
              </div>
            )}

            {/* Floating Top Tag: Eye Tracking Active */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0d1017]/90 border border-[#ff1a40]/30 text-[10px] font-mono text-[#ff1a40] pointer-events-none shadow-md">
              <Eye className="w-3 h-3 text-[#ff1a40]" />
              <span>EYE TRACKING ACTIVE</span>
            </div>

            {/* Floating Top Right: Framing View Switcher */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-[#0d1017]/90 border border-[#ff1a40]/30 rounded-lg p-0.5 shadow-md">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode('face');
                }}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'face'
                    ? 'bg-[#ff1a40] text-white font-bold shadow-[0_0_8px_#ff1a40]'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
                title="Focus on Gwen's Face"
              >
                <User className="w-3 h-3" />
                <span>Face</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode('full');
                }}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'full'
                    ? 'bg-[#ff1a40] text-white font-bold shadow-[0_0_8px_#ff1a40]'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
                title="Full Character Pose View"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Full</span>
              </button>
            </div>

            {/* Audio Voice Waveform Visualizer Overlay at bottom of 3D Canvas */}
            <div className="absolute bottom-9 left-6 right-6 h-8 z-10 pointer-events-none flex items-center justify-center">
              <canvas ref={waveformCanvasRef} className="w-full h-full block opacity-90" />
            </div>

            {/* Click to Speak Tooltip */}
            <div
              onClick={() => speakGreeting()}
              className="absolute bottom-2.5 z-20 px-3 py-1 rounded-full bg-[#0d1017]/90 border border-[#ff1a40]/40 text-[10px] font-mono text-[#94a3b8] hover:text-white hover:border-[#ff1a40] transition-all flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-[#ff1a40]" />
              <span>{isSpeaking ? 'Speaking neural voice...' : 'Click face to talk'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Dialogue & Multi-Agent Mode Selector */}
        <div className="lg:col-span-7 space-y-5">
          {/* Primary Speech Bubble / Header */}
          <div className="space-y-3 p-5 rounded-2xl bg-[#030407]/80 border border-[#ff1a40]/25 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff1a40] shadow-[0_0_8px_#ff1a40]" />
              <span className="text-xs font-mono text-[#ff1a40] uppercase tracking-wider font-semibold">
                NEURAL SYNTHESIS TRANSMISSION
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-['Outfit'] font-black text-white tracking-tight leading-tight">
              &ldquo;<span className="glow-text-duo">{greetingText}</span>&rdquo;
            </h1>

            <p className="text-sm sm:text-base font-['Space_Grotesk'] text-[#cbd5e1] font-light leading-relaxed">
              {subGreeting}
            </p>
          </div>

          {/* Agent Mode HUD Switcher */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-[#94a3b8] uppercase tracking-wider block">
              Switch Neural Core Directive:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'manager', label: 'Manager Core', icon: Zap },
                { id: 'rag', label: 'Document RAG', icon: Bot },
                { id: 'research', label: 'Web Scout', icon: Radio },
                { id: 'planner', label: 'Chrono Planner', icon: Activity },
                { id: 'coder', label: 'Syntax Coder', icon: Cpu },
              ].map((m) => {
                const Icon = m.icon;
                const isActive = currentMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleModeChange(m.id as any)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-['Space_Grotesk'] font-semibold transition-all border ${
                      isActive
                        ? 'bg-[#ff1a40]/20 border-[#ff1a40] text-white shadow-[0_0_16px_rgba(255,26,64,0.3)]'
                        : 'bg-[#0d1017]/80 border-[#1e2333] text-[#94a3b8] hover:text-white hover:border-[#ff1a40]/40'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#ff1a40]' : 'text-[#64748b]'}`} />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Directives */}
          <div className="space-y-2 pt-2 border-t border-[#ff1a40]/15">
            <span className="text-xs font-mono text-[#94a3b8] uppercase tracking-wider block">
              Suggested Directives:
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => {
                  if (onPromptSelect) {
                    onPromptSelect('Analyze my DBMS notes and generate a 10-day exam preparation plan.');
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-[#0d1017] hover:bg-[#161925] border border-[#ff1a40]/25 hover:border-[#ff1a40] text-[#94a3b8] hover:text-[#ff1a40] transition-all"
              >
                10-Day Exam Study Schedule
              </button>
              <button
                onClick={() => {
                  if (onPromptSelect) {
                    onPromptSelect('Research state of the art in local multi-agent LLM systems in 2026.');
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-[#0d1017] hover:bg-[#161925] border border-[#ff1a40]/25 hover:border-[#ff1a40] text-[#94a3b8] hover:text-[#ff1a40] transition-all"
              >
                Deep Multi-Agent Research
              </button>
              <button
                onClick={() => {
                  if (onPromptSelect) {
                    onPromptSelect('Generate a high performance FastAPI vector search service with rate limiting.');
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-[#0d1017] hover:bg-[#161925] border border-[#ff1a40]/25 hover:border-[#ff1a40] text-[#94a3b8] hover:text-[#ff1a40] transition-all"
              >
                FastAPI Vector Retrieval Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
