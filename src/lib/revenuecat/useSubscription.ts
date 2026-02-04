'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { RevenueCat } from './client';
import { CustomerInfo } from '@revenuecat/purchases-js';

export function useSubscription() {
    const { user, isLoaded } = useUser();
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [offerings, setOfferings] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isLoaded || !user) {
            if (isLoaded && !user) setIsLoading(false);
            return;
        }

        const initRC = async () => {
            try {
                await RevenueCat.init(user.id);

                const [info, offers] = await Promise.all([
                    RevenueCat.getCustomerInfo(),
                    RevenueCat.getOfferings()
                ]);

                setCustomerInfo(info);
                setOfferings(offers);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        initRC();
    }, [user, isLoaded]);

    const purchase = async (pkg: any) => {
        try {
            const updatedInfo = await RevenueCat.purchasePackage(pkg);
            if (updatedInfo) {
                setCustomerInfo(updatedInfo);
                // Optionally sync to Backend DB here via API call
            }
            return updatedInfo;
        } catch (err) {
            throw err;
        }
    };

    const isPro = RevenueCat.isEntitled(customerInfo, 'Antlyst Pro'); // Replace with your exact entitlement ID

    return {
        customerInfo,
        offerings,
        purchase,
        isPro,
        isLoading
    };
}
