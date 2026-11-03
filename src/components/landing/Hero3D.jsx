import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const Hero3D = () => {
  const mountRef = useRef(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setHasWebGL(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    // Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch (e) {
      setHasWebGL(false);
      return;
    }

    let animationFrameId;
    const width = container.clientWidth || 480;
    const height = container.clientHeight || 480;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 7;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x2563eb, 1.5);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x0d9488, 1.2);
    dirLight2.position.set(-5, -3, 3);
    scene.add(dirLight2);

    // 5. Central Capsule (Medicine Tablet/Capsule)
    const capsuleGroup = new THREE.Group();

    // Top half of capsule (Teal)
    const topGeo = new THREE.CylinderGeometry(0.85, 0.85, 1.2, 32);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x0d9488,
      roughness: 0.25,
      metalness: 0.1,
    });
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.position.y = 0.6;
    capsuleGroup.add(topMesh);

    const sphereTopGeo = new THREE.SphereGeometry(0.85, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const sphereTop = new THREE.Mesh(sphereTopGeo, topMat);
    sphereTop.position.y = 1.2;
    capsuleGroup.add(sphereTop);

    // Bottom half of capsule (Blue)
    const botMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.2,
      metalness: 0.15,
    });
    const botMesh = new THREE.Mesh(topGeo, botMat);
    botMesh.position.y = -0.6;
    capsuleGroup.add(botMesh);

    const sphereBotGeo = new THREE.SphereGeometry(0.85, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const sphereBot = new THREE.Mesh(sphereBotGeo, botMat);
    sphereBot.position.y = -1.2;
    capsuleGroup.add(sphereBot);

    // Center divider ring
    const dividerGeo = new THREE.TorusGeometry(0.86, 0.04, 16, 64);
    const dividerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const divider = new THREE.Mesh(dividerGeo, dividerMat);
    divider.rotation.x = Math.PI / 2;
    capsuleGroup.add(divider);

    capsuleGroup.rotation.z = Math.PI / 6;
    capsuleGroup.rotation.x = Math.PI / 8;
    scene.add(capsuleGroup);

    // 6. AI Scanning Rings
    const ringGeo1 = new THREE.TorusGeometry(2.2, 0.02, 16, 100);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2.5;
    scene.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(2.7, 0.015, 16, 100);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.4 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.y = Math.PI / 6;
    scene.add(ring2);

    // 7. Subtle Particles
    const particlesCount = 45;
    const particlesGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 8;
      posArray[i + 1] = (Math.random() - 0.5) * 8;
      posArray[i + 2] = (Math.random() - 0.5) * 5;
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.06,
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.75,
    });
    const particlesMesh = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particlesMesh);

    // 8. Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Gentle floating and rotation
      capsuleGroup.position.y = Math.sin(elapsedTime * 1.2) * 0.15;
      capsuleGroup.rotation.y = elapsedTime * 0.35;

      // Rotating AI scan rings
      ring1.rotation.z = elapsedTime * 0.25;
      ring2.rotation.z = -elapsedTime * 0.2;

      // Slow particle drift
      particlesMesh.rotation.y = elapsedTime * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div className="relative w-full h-[400px] sm:h-[480px] flex items-center justify-center">
      {hasWebGL ? (
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      ) : (
        /* Fallback Visual if WebGL or reduced motion */
        <div className="w-64 h-64 rounded-full bg-gradient-to-tr from-primary/20 via-ai/20 to-blue-200/30 flex items-center justify-center shadow-glow-primary border border-primary/20">
          <div className="w-40 h-40 rounded-2xl bg-white shadow-xl flex flex-col items-center justify-center p-4 text-center border border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-ai text-white flex items-center justify-center font-bold text-xl mb-2">
              🛡️
            </div>
            <span className="text-xs font-bold text-slate-800">MedGuard AI</span>
            <span className="text-[10px] text-slate-400 mt-1">Smart Inventory Core</span>
          </div>
        </div>
      )}

      {/* Floating Badges around 3D visual */}
      <div className="absolute top-8 left-4 sm:left-6 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-xl px-3.5 py-2 shadow-card flex items-center gap-2.5 animate-float-slow">
        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
          ✓
        </div>
        <div>
          <div className="text-[11px] font-bold text-slate-800">FEFO Engine</div>
          <div className="text-[9px] text-slate-500">Exp: June 2027 (Safe)</div>
        </div>
      </div>

      <div className="absolute bottom-10 right-4 sm:right-6 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-xl px-3.5 py-2 shadow-card flex items-center gap-2.5 animate-float-slow [animation-delay:2s]">
        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
          AI
        </div>
        <div>
          <div className="text-[11px] font-bold text-slate-800">Gemma 4 Vision</div>
          <div className="text-[9px] text-slate-500">Real-time Packaging OCR</div>
        </div>
      </div>
    </div>
  );
};
