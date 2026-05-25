import { Capacitor } from "@capacitor/core";
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";

const RC_API_KEY = "goog_unxHFpdcmSnrFaFxBbnhQqpEvhI";
const ENTITLEMENT_ID = "remove_ads";

let isRevenueCatConfigured = false;
let configurePromise = null;

const hasActiveEntitlement = (customerInfo) => {
    return !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
};

const unwrapCustomerInfo = (result) => {
    return result?.customerInfo || result || null;
};

export async function initRevenueCat() {
    if (!Capacitor.isNativePlatform()) return false;
    if (isRevenueCatConfigured) return true;
    if (configurePromise) return configurePromise;

    configurePromise = (async () => {
        try {
            await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
            await Purchases.configure({ apiKey: RC_API_KEY });
            isRevenueCatConfigured = true;
            return true;
        } catch (error) {
            console.error("RevenueCat init failed:", error);
            configurePromise = null;
            return false;
        }
    })();

    return configurePromise;
}

export async function getSubscriptionOfferings() {
    if (!Capacitor.isNativePlatform()) return null;

    try {
        await initRevenueCat();
        const result = await Purchases.getOfferings();

        // The Capacitor plugin wraps as { offerings: { current, all } }
        // Unwrap one level if needed
        const offerings = result?.offerings ?? result;

        console.log("[RC] Raw offerings result:", JSON.stringify(result));
        console.log("[RC] Unwrapped offerings:", JSON.stringify(offerings));
        console.log("[RC] Current offering:", JSON.stringify(offerings?.current));
        console.log("[RC] Available packages:", JSON.stringify(offerings?.current?.availablePackages));

        return offerings;
    } catch (error) {
        console.error("Failed to fetch offerings:", error);
        return null;
    }
}

export async function getCustomerSubscriptionStatus() {
    if (!Capacitor.isNativePlatform()) return false;

    try {
        await initRevenueCat();
        const result = await Purchases.getCustomerInfo();
        const customerInfo = unwrapCustomerInfo(result);

        console.log("[RC] CustomerInfo:", JSON.stringify(customerInfo?.entitlements?.active));

        return hasActiveEntitlement(customerInfo);
    } catch (error) {
        console.error("Failed to get customer info:", error);
        return false;
    }
}

export async function purchaseSubscription(rcPackage) {
    if (!Capacitor.isNativePlatform()) return false;
    if (!rcPackage) return false;

    try {
        await initRevenueCat();

        const result = await Purchases.purchasePackage({ aPackage: rcPackage });
        const purchasedInfo = unwrapCustomerInfo(result);

        if (hasActiveEntitlement(purchasedInfo)) {
            window.dispatchEvent(new Event("subscription-updated"));
            return true;
        }

        const refreshedResult = await Purchases.getCustomerInfo();
        const refreshedInfo = unwrapCustomerInfo(refreshedResult);
        const isActive = hasActiveEntitlement(refreshedInfo);

        if (isActive) {
            window.dispatchEvent(new Event("subscription-updated"));
        }

        return isActive;
    } catch (error) {
        if (
            error?.message?.toLowerCase?.().includes("cancel") ||
            error?.userCancelled
        ) {
            return false;
        }

        console.error("Purchase failed:", error);
        return false;
    }
}

export async function restoreUserPurchases() {
    if (!Capacitor.isNativePlatform()) return false;

    try {
        await initRevenueCat();
        const result = await Purchases.restorePurchases();
        const customerInfo = unwrapCustomerInfo(result);
        const isActive = hasActiveEntitlement(customerInfo);

        if (isActive) {
            window.dispatchEvent(new Event("subscription-updated"));
        }

        return isActive;
    } catch (error) {
        console.error("Restore failed:", error);
        return false;
    }
}
