import { Capacitor } from "@capacitor/core";
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";

const RC_API_KEY = "goog_unxHFpdcmSnrFaFxBbnhQqpEvhI";
const ENTITLEMENT_ID = "remove_ads";

let isRevenueCatConfigured = false;

const hasActiveEntitlement = (customerInfo) => {
    return !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
};

const unwrapCustomerInfo = (result) => {
    return result?.customerInfo || result || null;
};

export async function initRevenueCat() {
    if (!Capacitor.isNativePlatform()) return false;
    if (isRevenueCatConfigured) return true;

    try {
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        await Purchases.configure({
            apiKey: RC_API_KEY,
        });
        isRevenueCatConfigured = true;
        return true;
    } catch (error) {
        console.error("RevenueCat init failed:", error);
        return false;
    }
}

export async function getSubscriptionOfferings() {
    if (!Capacitor.isNativePlatform()) return null;

    try {
        await initRevenueCat();
        const offerings = await Purchases.getOfferings();
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
