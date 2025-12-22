"use client";

import React, { useRef, useEffect, useMemo, useCallback } from "react";
import { useTheme } from "next-themes";

// CONFIGURATIONS

const CONFIG = {
    // Node Configuration
    BACKGROUND_NODE_COUNT: 40,      // Sparse background layer
    FOREGROUND_NODE_COUNT: 25,      // Even sparser foreground layer
    NODE_MIN_SIZE: 1.5,             // Minimum node radius (px)
    NODE_MAX_SIZE: 3.5,             // Maximum node radius (px)

    // Movement Configuration
    BASE_SPEED: 0.15,               // Base drift speed (pixels per frame)
    SPEED_VARIATION: 0.8,           // Speed randomness multiplier
    PARALLAX_FACTOR: 0.6,           // Parallax intensity (0-1)

    // Connection Configuration
    CONNECTION_DISTANCE: 180,        // Max distance for line connections (px)
    CONNECTION_FADE_START: 0.5,     // Start fading at this fraction of max distance
    MAX_CONNECTIONS_PER_NODE: 4,    // Limit connections to prevent density
    LINE_WIDTH: 0.8,                // Connection line thickness

    // Visual Configuration - Dark Mode
    DARK_COLORS: {
        background: "#0a0a0f",           // Deep dark blue-black
        backgroundNodes: "#8b5cf6",      // Purple
        foregroundNodes: "#ec4899",      // Magenta/pink
        connections: "#a855f7",          // Purple for connections
        nodeGlow: "rgba(139, 92, 246, 0.4)",    // Purple glow
        connectionGlow: "rgba(168, 85, 247, 0.15)", // Subtle purple glow for lines
    },

    // Visual Configuration - Light Mode
    LIGHT_COLORS: {
        background: "#fafafa",           // Very light gray
        backgroundNodes: "#7c3aed",      // Darker purple for visibility
        foregroundNodes: "#db2777",      // Darker magenta
        connections: "#9333ea",          // Darker purple
        nodeGlow: "rgba(124, 58, 237, 0.2)",
        connectionGlow: "rgba(147, 51, 234, 0.08)",
    },

    // Visual Configuration - Neon Night
    NEON_NIGHT_COLORS: {
        background: "#0c0512",           // Very dark purple/black
        backgroundNodes: "#d946ef",      // Fuchsia
        foregroundNodes: "#06b6d4",      // Cyan
        connections: "#c026d3",          // Fuchsia
        nodeGlow: "rgba(217, 70, 239, 0.5)",
        connectionGlow: "rgba(6, 182, 212, 0.25)",
    },

    // Visual Configuration - Corporate Blue
    CORPORATE_BLUE_COLORS: {
        background: "#f0f4f8",           // Alice Blue-ish
        backgroundNodes: "#2563eb",      // Royal Blue
        foregroundNodes: "#1e40af",      // Dark Blue
        connections: "#3b82f6",          // Blue
        nodeGlow: "rgba(37, 99, 235, 0.3)",
        connectionGlow: "rgba(59, 130, 246, 0.15)",
    },

    // Performance
    TARGET_FPS: 60,
    REDUCED_MOTION_SPEED: 0.02,     // Minimal drift when prefers-reduced-motion is enabled
};

// Type Definitions

interface Node {
    x: number;          // Current x position
    y: number;          // Current y position
    vx: number;         // Velocity x
    vy: number;         // Velocity y
    size: number;       // Radius
    layer: number;      // 0 = background, 1 = foreground (for parallax)
}

interface Connection {
    nodeA: Node;
    nodeB: Node;
    alpha: number;      // Opacity (0-1)
}

type ColorScheme = typeof CONFIG.DARK_COLORS;

// Utility Functions

/**
 * Calculate distance between two nodes
 */
function getDistance(nodeA: Node, nodeB: Node): number {
    const dx = nodeA.x - nodeB.x;
    const dy = nodeA.y - nodeB.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Generate random value between min and max
 */
function random(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

/**
 * Detect if user prefers reduced motion
 */
function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Main Component

export default function NetworkBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();
    const nodesRef = useRef<Node[]>([]);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Wait for hydration to avoid theme mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    // Get current color scheme
    const colors: ColorScheme = useMemo(() => {
        if (resolvedTheme === "neon-night") return CONFIG.NEON_NIGHT_COLORS;
        if (resolvedTheme === "corporate-blue") return CONFIG.CORPORATE_BLUE_COLORS;
        return resolvedTheme === "light" ? CONFIG.LIGHT_COLORS : CONFIG.DARK_COLORS;
    }, [resolvedTheme]);

    /**
     * Initialize nodes with random positions and velocities
     */
    const initializeNodes = useCallback((width: number, height: number): Node[] => {
        const nodes: Node[] = [];
        const reducedMotion = prefersReducedMotion();
        const speedMultiplier = reducedMotion ? CONFIG.REDUCED_MOTION_SPEED : CONFIG.BASE_SPEED;

        // Background layer nodes
        for (let i = 0; i < CONFIG.BACKGROUND_NODE_COUNT; i++) {
            const speed = speedMultiplier * random(0.3, 1.0);
            const angle = random(0, Math.PI * 2);

            nodes.push({
                x: random(0, width),
                y: random(0, height),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: random(CONFIG.NODE_MIN_SIZE, CONFIG.NODE_MAX_SIZE),
                layer: 0, // Background
            });
        }

        // Foreground layer nodes
        for (let i = 0; i < CONFIG.FOREGROUND_NODE_COUNT; i++) {
            const speed = speedMultiplier * random(0.5, 1.0) * (1 + CONFIG.PARALLAX_FACTOR);
            const angle = random(0, Math.PI * 2);

            nodes.push({
                x: random(0, width),
                y: random(0, height),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: random(CONFIG.NODE_MAX_SIZE, CONFIG.NODE_MAX_SIZE * 1.3),
                layer: 1, // Foreground
            });
        }

        return nodes;
    }, []);

    /**
     * Update node positions with edge wrapping
     */
    const updateNodes = useCallback((nodes: Node[], width: number, height: number) => {
        for (const node of nodes) {
            // Update position
            node.x += node.vx;
            node.y += node.vy;

            // Wrap around edges (toroidal topology for seamless motion)
            if (node.x < -20) node.x = width + 20;
            if (node.x > width + 20) node.x = -20;
            if (node.y < -20) node.y = height + 20;
            if (node.y > height + 20) node.y = -20;
        }
    }, []);

    /**
     * Find connections between nearby nodes
     * Optimized: Only connects nodes within CONNECTION_DISTANCE
     * Limits connections per node to avoid visual clutter
     */
    const findConnections = useCallback((nodes: Node[]): Connection[] => {
        const connections: Connection[] = [];
        const connectionCounts = new Map<Node, number>();

        for (let i = 0; i < nodes.length; i++) {
            const nodeA = nodes[i];
            const countA = connectionCounts.get(nodeA) || 0;

            // Skip if this node already has max connections
            if (countA >= CONFIG.MAX_CONNECTIONS_PER_NODE) continue;

            for (let j = i + 1; j < nodes.length; j++) {
                const nodeB = nodes[j];
                const countB = connectionCounts.get(nodeB) || 0;

                // Skip if either node has max connections
                if (countB >= CONFIG.MAX_CONNECTIONS_PER_NODE) continue;

                const distance = getDistance(nodeA, nodeB);

                if (distance < CONFIG.CONNECTION_DISTANCE) {
                    // Calculate alpha based on distance (fade out near max distance)
                    const fadeStart = CONFIG.CONNECTION_DISTANCE * CONFIG.CONNECTION_FADE_START;
                    let alpha = 1.0;

                    if (distance > fadeStart) {
                        alpha = 1.0 - (distance - fadeStart) / (CONFIG.CONNECTION_DISTANCE - fadeStart);
                    }

                    connections.push({ nodeA, nodeB, alpha });

                    // Update connection counts
                    connectionCounts.set(nodeA, countA + 1);
                    connectionCounts.set(nodeB, countB + 1);
                }
            }
        }

        return connections;
    }, []);

    /**
     * Render the scene
     */
    const render = useCallback((
        ctx: CanvasRenderingContext2D,
        nodes: Node[],
        width: number,
        height: number,
        colors: ColorScheme
    ) => {
        // Clear canvas
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, width, height);

        // Find connections
        const connections = findConnections(nodes);

        // Draw connections (lines)
        ctx.lineWidth = CONFIG.LINE_WIDTH;
        ctx.lineCap = 'round';

        for (const { nodeA, nodeB, alpha } of connections) {
            // Draw glow first (if desired)
            ctx.strokeStyle = colors.connectionGlow.replace(/[\d.]+\)$/g, `${alpha * 0.5})`);
            ctx.lineWidth = CONFIG.LINE_WIDTH * 3;
            ctx.beginPath();
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(nodeB.x, nodeB.y);
            ctx.stroke();

            // Draw main line
            // Convert hex to rgba with alpha
            ctx.strokeStyle = hexToRgba(colors.connections, alpha * 0.4);
            ctx.lineWidth = CONFIG.LINE_WIDTH;
            ctx.beginPath();
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(nodeB.x, nodeB.y);
            ctx.stroke();
        }

        // Draw nodes
        for (const node of nodes) {
            const color = node.layer === 0 ? colors.backgroundNodes : colors.foregroundNodes;

            // Draw glow
            const glowGradient = ctx.createRadialGradient(
                node.x, node.y, 0,
                node.x, node.y, node.size * 4
            );
            glowGradient.addColorStop(0, colors.nodeGlow);
            glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.size * 4, 0, Math.PI * 2);
            ctx.fill();

            // Draw node
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }, [findConnections]);

    /**
     * Animation loop
     */
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // Update node positions
        updateNodes(nodesRef.current, width, height);

        // Render scene
        render(ctx, nodesRef.current, width, height, colors);

        // Schedule next frame
        animationFrameRef.current = requestAnimationFrame(animate);
    }, [updateNodes, render, colors]);

    /**
     * Handle canvas resize
     */
    const handleResize = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        // Set display size
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';

        // Set actual canvas size (accounting for device pixel ratio)
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        // Scale context
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
            ctx.scale(dpr, dpr);
        }

        // Reinitialize nodes with new dimensions
        nodesRef.current = initializeNodes(rect.width, rect.height);
    }, [initializeNodes]);

    /**
     * Initialize scene and start animation
     */
    useEffect(() => {
        if (!mounted) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Initial setup
        handleResize();

        // Start animation
        animate();

        // Debounced resize handler
        let resizeTimeout: NodeJS.Timeout;
        const debouncedResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(handleResize, 150);
        };

        window.addEventListener('resize', debouncedResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', debouncedResize);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [mounted, handleResize, animate]);

    if (!mounted) {
        return null; // Prevent SSR/hydration mismatch
    }

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: -10,
                pointerEvents: 'none', // Purely decorative - allow clicks to pass through
                transition: 'opacity 0.5s ease-in-out',
            }}
            aria-hidden="true" // Accessibility: mark as decorative
        />
    );
}

// Helper Functions

/**
 * Convert hex color to rgba with alpha channel
 */
function hexToRgba(hex: string, alpha: number): string {
    // Handle both #RGB and #RRGGBB formats
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
