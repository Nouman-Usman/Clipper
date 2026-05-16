"use client";

import { useEffect, useRef } from "react";
import type * as Three from "three";

const reelLabels = [
  ["Hook", "9.1"],
  ["Clip", "8.7"],
  ["Post", "Live"],
] as const;

export default function ThreeHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let disposed = false;
    let frameId = 0;
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const boot = async () => {
      const THREE = await import("three");

      if (disposed) {
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(0.15, 0.1, 8.4);

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));

      const rig = new THREE.Group();
      rig.position.set(1.65, -0.03, 0);
      scene.add(rig);

      const ambient = new THREE.AmbientLight(0xfff4df, 1.6);
      scene.add(ambient);

      const keyLight = new THREE.PointLight(0xff8c5a, 11, 18);
      keyLight.position.set(3.4, 2.8, 4.2);
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(0x72bbc5, 7, 14);
      rimLight.position.set(-3, -1.2, 3);
      scene.add(rimLight);

      const sourceMaterial = new THREE.MeshStandardMaterial({
        color: 0x242017,
        roughness: 0.4,
        metalness: 0.28,
        map: createSourceTexture(THREE),
      });
      const sourcePanel = new THREE.Mesh(
        new THREE.BoxGeometry(2.85, 1.62, 0.08, 8, 4, 1),
        sourceMaterial,
      );
      sourcePanel.position.set(-1.8, 0.05, -0.22);
      sourcePanel.rotation.set(-0.05, 0.42, -0.03);
      rig.add(sourcePanel);

      const cardGeometry = new THREE.BoxGeometry(0.86, 1.55, 0.055, 4, 4, 1);
      const cardMaterials = reelLabels.map(([label, detail], index) =>
        new THREE.MeshStandardMaterial({
          color: [0xcc4b2d, 0x2f5c7d, 0x286d4d][index],
          roughness: 0.42,
          metalness: 0.2,
          map: createLabelTexture(THREE, label, detail),
        }),
      );

      const cards = cardMaterials.map((material, index) => {
        const mesh = new THREE.Mesh(cardGeometry, material);
        mesh.position.set(0.85 + index * 0.72, 0.42 - index * 0.36, 0.32 + index * 0.24);
        mesh.rotation.set(0.08, -0.5, 0.08 - index * 0.07);
        rig.add(mesh);
        return mesh;
      });

      const ribbonMaterial = new THREE.MeshStandardMaterial({
        color: 0xff8c5a,
        emissive: 0xcc4b2d,
        emissiveIntensity: 0.18,
        roughness: 0.5,
        metalness: 0.15,
      });
      const ribbons = Array.from({ length: 4 }, (_, index) => {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.8 - index * 0.16, 0.018, 0.018),
          ribbonMaterial,
        );
        mesh.position.set(-0.42 + index * 0.28, 0.46 - index * 0.31, 0.18 + index * 0.08);
        mesh.rotation.set(0.02, -0.24, -0.18 - index * 0.05);
        rig.add(mesh);
        return mesh;
      });

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.25, 0.01, 12, 128),
        new THREE.MeshStandardMaterial({
          color: 0xe8d8bc,
          roughness: 0.6,
          metalness: 0.24,
        }),
      );
      ring.position.set(0.4, 0, -0.4);
      ring.rotation.x = Math.PI / 2.4;
      rig.add(ring);

      const dotGeometry = new THREE.SphereGeometry(0.028, 12, 12);
      const dotMaterial = new THREE.MeshStandardMaterial({
        color: 0xfffaf2,
        emissive: 0x72bbc5,
        emissiveIntensity: 0.36,
      });
      const dots = Array.from({ length: 54 }, (_, index) => {
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        const angle = index * 0.62;
        const radius = 2.3 + Math.sin(index) * 0.28;
        dot.position.set(
          0.35 + Math.cos(angle) * radius,
          Math.sin(index * 1.7) * 0.86,
          -0.28 + Math.sin(angle) * radius,
        );
        rig.add(dot);
        return dot;
      });

      const pointer = { x: 0, y: 0 };
      const onPointerMove = (event: PointerEvent) => {
        const bounds = canvas.getBoundingClientRect();
        pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        pointer.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      };

      const resize = () => {
        const { width, height } = canvas.getBoundingClientRect();
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
      };

      window.addEventListener("resize", resize);
      canvas.addEventListener("pointermove", onPointerMove);
      resize();

      const clock = new THREE.Clock();

      const animate = () => {
        const elapsed = clock.getElapsedTime();
        const moving = !mediaQuery.matches;

        if (moving) {
          rig.rotation.y = -0.08 + pointer.x * 0.07 + Math.sin(elapsed * 0.34) * 0.025;
          rig.rotation.x = -0.02 + pointer.y * 0.045;
          ring.rotation.z = elapsed * 0.1;

          cards.forEach((card, index) => {
            card.position.y += Math.sin(elapsed * 1.2 + index) * 0.0013;
            card.rotation.z = 0.08 - index * 0.07 + Math.sin(elapsed * 0.8 + index) * 0.025;
          });

          ribbons.forEach((ribbon, index) => {
            ribbon.scale.x = 0.9 + Math.sin(elapsed * 1.7 + index) * 0.08;
          });

          dots.forEach((dot, index) => {
            dot.scale.setScalar(0.8 + Math.sin(elapsed * 1.8 + index) * 0.22);
          });
        }

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(animate);
      };

      animate();

      return () => {
        window.removeEventListener("resize", resize);
        canvas.removeEventListener("pointermove", onPointerMove);
        window.cancelAnimationFrame(frameId);
        cardGeometry.dispose();
        sourcePanel.geometry.dispose();
        sourceMaterial.map?.dispose();
        sourceMaterial.dispose();
        cardMaterials.forEach((material) => {
          material.map?.dispose();
          material.dispose();
        });
        ribbons.forEach((ribbon) => ribbon.geometry.dispose());
        ribbonMaterial.dispose();
        ring.geometry.dispose();
        (ring.material as Three.Material).dispose();
        dotGeometry.dispose();
        dotMaterial.dispose();
        renderer.dispose();
      };
    };

    let cleanup: (() => void) | undefined;
    boot().then((nextCleanup) => {
      cleanup = nextCleanup;
    });

    return () => {
      disposed = true;
      cleanup?.();
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div className="three-hero" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}

function createSourceTexture(THREE: typeof import("three")) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 576;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#fffaf2");
  gradient.addColorStop(0.48, "#d9c8ad");
  gradient.addColorStop(1, "#262217");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(38, 34, 23, 0.8)";
  context.fillRect(58, 52, 360, 196);

  context.fillStyle = "#cc4b2d";
  context.beginPath();
  context.moveTo(192, 112);
  context.lineTo(192, 190);
  context.lineTo(258, 151);
  context.closePath();
  context.fill();

  context.fillStyle = "rgba(38, 34, 23, 0.16)";
  for (let x = 58; x < 930; x += 74) {
    context.fillRect(x, 404, 52, 44);
  }

  context.fillStyle = "#262217";
  context.font = "800 54px Arial";
  context.fillText("Episode 42", 468, 120);
  context.font = "700 30px Arial";
  context.fillText("Transcript, hooks, and moments mapped", 468, 174);

  context.fillStyle = "#286d4d";
  context.fillRect(468, 220, 320, 18);
  context.fillStyle = "#cc4b2d";
  context.fillRect(468, 260, 238, 18);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createLabelTexture(
  THREE: typeof import("three"),
  title: string,
  detail: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 896;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#fffaf2");
  gradient.addColorStop(0.58, "#eadcc8");
  gradient.addColorStop(1, "#262217");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(38, 34, 23, 0.1)";
  for (let y = 74; y < canvas.height - 120; y += 74) {
    context.fillRect(52, y, canvas.width - 104, 2);
  }

  context.fillStyle = "#262217";
  context.font = "800 64px Arial";
  context.fillText(title, 52, 160);

  context.font = "800 92px Arial";
  context.fillText(detail, 52, 290);

  context.fillStyle = "rgba(255, 250, 242, 0.9)";
  context.font = "700 38px Arial";
  context.fillText("Clipper", 52, 790);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
