"use client";

import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Float, Trail } from "@react-three/drei";
import * as THREE from "three";

// -----------------------------------------------------------------------------
// Constants & Configuration
// -----------------------------------------------------------------------------
const PARTICLE_COUNT = 3000;
const CONNECTOR_COUNT = 150; // Fewer particles for connections to keep performance high
const CONNECTION_DISTANCE = 3.5;
const ORB_COUNT = 4;

const COLORS = {
    background: "#050505",
    particle: "#88ccff",
    connector: "#ff00aa",
    line: "#aa00ff",
    orb: ["#00ffff", "#ff00ff", "#8800ff", "#ff0088"],
};

// -----------------------------------------------------------------------------
// Component: Particle Field (Background Dust)
// -----------------------------------------------------------------------------
const ParticleField = () => {
    const mesh = useRef<THREE.Points>(null!);

    // Generate random positions for thousands of particles
    const particles = useMemo(() => {
        const temp = new Float32Array(PARTICLE_COUNT * 3);
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const x = (Math.random() - 0.5) * 50;
            const y = (Math.random() - 0.5) * 50;
            const z = (Math.random() - 0.5) * 50;
            temp[i * 3] = x;
            temp[i * 3 + 1] = y;
            temp[i * 3 + 2] = z;
        }
        return temp;
    }, []);

    useFrame((state, delta) => {
        if (mesh.current) {
            // Slowly rotate the entire field
            mesh.current.rotation.x -= delta * 0.02;
            mesh.current.rotation.y -= delta * 0.03;
        }
    });

    return (
        <points ref={mesh}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={particles.length / 3}
                    array={particles}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.05}
                color={COLORS.particle}
                transparent
                opacity={0.6}
                sizeAttenuation={true}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

// -----------------------------------------------------------------------------
// Component: Connected Particles (Foreground Network)
// -----------------------------------------------------------------------------
const ConnectedParticles = () => {
    const [positions] = useState(() => new Float32Array(CONNECTOR_COUNT * 3));
    const [velocities] = useState(() => {
        const v = new Float32Array(CONNECTOR_COUNT * 3);
        for (let i = 0; i < CONNECTOR_COUNT; i++) {
            v[i * 3] = (Math.random() - 0.5) * 0.02;     // vx
            v[i * 3 + 1] = (Math.random() - 0.5) * 0.02; // vy
            v[i * 3 + 2] = (Math.random() - 0.5) * 0.02; // vz
        }
        return v;
    });

    // Initialize positions
    useMemo(() => {
        for (let i = 0; i < CONNECTOR_COUNT; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
        }
    }, [positions]);

    const pointsRef = useRef<THREE.Points>(null!);
    const linesRef = useRef<THREE.LineSegments>(null!);

    useFrame(() => {
        // Update positions based on velocity
        for (let i = 0; i < CONNECTOR_COUNT; i++) {
            positions[i * 3] += velocities[i * 3];
            positions[i * 3 + 1] += velocities[i * 3 + 1];
            positions[i * 3 + 2] += velocities[i * 3 + 2];

            // Bounce off boundaries (simple box)
            const limit = 12;
            if (Math.abs(positions[i * 3]) > limit) velocities[i * 3] *= -1;
            if (Math.abs(positions[i * 3 + 1]) > limit) velocities[i * 3 + 1] *= -1;
            if (Math.abs(positions[i * 3 + 2]) > limit) velocities[i * 3 + 2] *= -1;
        }

        // Update points geometry
        pointsRef.current.geometry.attributes.position.needsUpdate = true;

        // Calculate connections
        // We rebuild the line geometry every frame. 
        // For 150 particles, this is 150*150/2 = ~11k checks, which is fine for JS.
        const linePositions: number[] = [];
        const lineColors: number[] = [];

        // Re-use temp objects to avoid GC
        const p1 = new THREE.Vector3();
        const p2 = new THREE.Vector3();
        const color = new THREE.Color(COLORS.line);

        for (let i = 0; i < CONNECTOR_COUNT; i++) {
            p1.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);

            for (let j = i + 1; j < CONNECTOR_COUNT; j++) {
                p2.set(positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
                const dist = p1.distanceTo(p2);

                if (dist < CONNECTION_DISTANCE) {
                    linePositions.push(p1.x, p1.y, p1.z);
                    linePositions.push(p2.x, p2.y, p2.z);

                    // Alpha based on distance (fade out)
                    // Since LineBasicMaterial doesn't support per-vertex alpha easily without custom shader,
                    // we'll just push the color. For a "glowing" look we use additive blending on material.
                    lineColors.push(color.r, color.g, color.b);
                    lineColors.push(color.r, color.g, color.b);
                }
            }
        }

        // Update lines geometry
        const lineGeo = linesRef.current.geometry;
        lineGeo.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(linePositions, 3)
        );
        // lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3)); // If using vertex colors
    });

    return (
        <group>
            {/* The Dots */}
            <points ref={pointsRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={CONNECTOR_COUNT}
                        array={positions}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={0.15}
                    color={COLORS.connector}
                    transparent
                    opacity={0.8}
                    blending={THREE.AdditiveBlending}
                />
            </points>

            {/* The Lines */}
            <lineSegments ref={linesRef}>
                <bufferGeometry />
                <lineBasicMaterial
                    color={COLORS.line}
                    transparent
                    opacity={0.15}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </lineSegments>
        </group>
    );
};

// -----------------------------------------------------------------------------
// Component: Floating Orbs with Trails
// -----------------------------------------------------------------------------
const FloatingOrbs = () => {
    return (
        <group>
            {COLORS.orb.map((color, i) => (
                <Float
                    key={i}
                    speed={1.5}
                    rotationIntensity={1}
                    floatIntensity={2}
                    position={[
                        (Math.random() - 0.5) * 15,
                        (Math.random() - 0.5) * 15,
                        (Math.random() - 0.5) * 10
                    ]}
                >
                    {/* Trail effect using drei's <Trail> */}
                    <Trail
                        width={2} // Width of the trail
                        length={6} // Length of the trail
                        color={new THREE.Color(color)} // Color of the trail
                        attenuation={(t) => t * t} // Tapering
                    >
                        <mesh>
                            <sphereGeometry args={[0.3, 32, 32]} />
                            <meshStandardMaterial
                                color={color}
                                emissive={color}
                                emissiveIntensity={2}
                                toneMapped={false}
                            />
                        </mesh>
                    </Trail>
                    {/* Glow halo (simple sprite or larger transparent sphere) */}
                    <mesh scale={[2, 2, 2]}>
                        <sphereGeometry args={[0.3, 16, 16]} />
                        <meshBasicMaterial
                            color={color}
                            transparent
                            opacity={0.1}
                            depthWrite={false}
                            blending={THREE.AdditiveBlending}
                        />
                    </mesh>
                </Float>
            ))}
        </group>
    );
};
// -----------------------------------------------------------------------------
// Component: Mouse Parallax Control
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// Component: Automatic Camera Movement (Fly-through effect)
// -----------------------------------------------------------------------------
const AutoCameraRig = () => {
    const { camera } = useThree();

    useFrame((state) => {
        const t = state.clock.getElapsedTime() * 0.2; // Slow movement speed

        // Figure-8 motion
        camera.position.x = Math.sin(t) * 10;
        camera.position.z = Math.cos(t * 0.8) * 10 + 5; // Vary depth
        camera.position.y = Math.sin(t * 0.5) * 5;

        // Look at center
        camera.lookAt(0, 0, 0);

        // Add subtle roll for "flight" feeling
        camera.rotation.z = Math.sin(t * 0.5) * 0.05;
    });

    return null;
};

// -----------------------------------------------------------------------------
// Main Component: ParticleBackground
// -----------------------------------------------------------------------------
export default function ParticleBackground() {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: -10,
                background: COLORS.background,
                pointerEvents: 'none', // Allow clicks to pass through to page content
            }}
        >
            <Canvas
                camera={{ position: [0, 0, 15], fov: 60 }}
                dpr={[1, 2]} // Handle high-DPI screens
                gl={{ antialias: true, alpha: false }}
            >
                <color attach="background" args={[COLORS.background]} />

                {/* Scene Lighting */}
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                {/* Components */}
                <ParticleField />
                <ConnectedParticles />
                <FloatingOrbs />

                {/* Effects */}
                <AutoCameraRig />

                {/* Post-processing could go here (Bloom), but keeping it simple for performance */}
            </Canvas>
        </div>
    );
}
