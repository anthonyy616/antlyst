'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const NeonOrbs = dynamic(() => import("@/components/ui/neon-orbs").then(mod => mod.NeonOrbs));

export default function NeonOrbsWrapper() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    return <NeonOrbs />;
}
