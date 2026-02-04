'use client';

import { Purchases, CustomerInfo, LogLevel } from '@revenuecat/purchases-js';

const API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY!;

if (!API_KEY) {
    console.warn("RevenueCat API Key not found. Subscription features will be disabled.");
}

// Singleton instance management
let isInitialized = false;

export const RevenueCat = {
    async init(userId: string) {
        if (isInitialized) return;

        if (!API_KEY) return;

        try {
            Purchases.setLogLevel(LogLevel.Warn);
            await Purchases.configure({ apiKey: API_KEY, appUserId: userId });
            isInitialized = true;
        } catch (error) {
            console.error("Failed to initialize RevenueCat:", error);
        }
    },

    async getOfferings() {
        try {
            return await Purchases.getSharedInstance().getOfferings();
        } catch (error) {
            console.error("Error fetching offerings:", error);
            return null;
        }
    },

    async getCustomerInfo(): Promise<CustomerInfo | null> {
        try {
            return await Purchases.getSharedInstance().getCustomerInfo();
        } catch (error) {
            console.error("Error getting customer info:", error);
            return null;
        }
    },

    async purchasePackage(pkg: any) {
        try {
            const { customerInfo } = await Purchases.getSharedInstance().purchasePackage(pkg);
            return customerInfo;
        } catch (error: any) {
            if (error.code === 1) {
                // User cancelled - silent return or handle
                return null;
            }
            console.error("Purchase failed:", error);
            throw error;
        }
    },

    /**
     * Checks if the user has a specific entitlement active.
     * @param entitlementId usually 'pro' or 'business'
     */
    isEntitled(customerInfo: CustomerInfo | null, entitlementId: string = 'Antlyst Pro'): boolean {
        if (!customerInfo || !customerInfo.entitlements.active[entitlementId]) {
            return false;
        }
        return true;
    }
};
