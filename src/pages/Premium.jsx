import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import {
    getSubscriptionOfferings,
    getCustomerSubscriptionStatus,
    purchaseSubscription,
    restoreUserPurchases,
} from "../services/revenuecat";

export default function Premium() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [packages, setPackages] = useState([]);
    const [selectedPackageId, setSelectedPackageId] = useState(null);
    const [error, setError] = useState("");
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const applyTheme = async () => {
            const dark =
                document.documentElement.getAttribute("data-theme") === "dark" ||
                document.documentElement.getAttribute("data-bs-theme") === "dark" ||
                document.body.classList.contains("dark-mode");

            setIsDark(dark);

            document.documentElement.style.colorScheme = dark ? "dark" : "light";
            document.body.style.colorScheme = dark ? "dark" : "light";

            if (Capacitor.isNativePlatform()) {
                try {
                    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
                    await StatusBar.setBackgroundColor({
                        color: dark ? "#121212" : "#ffffff",
                    });
                } catch (e) {
                    console.warn("StatusBar plugin not available or running in web", e);
                }
            }
        };

        applyTheme();
        window.addEventListener("storage", applyTheme);
        window.addEventListener("theme-change", applyTheme);

        return () => {
            window.removeEventListener("storage", applyTheme);
            window.removeEventListener("theme-change", applyTheme);
        };
    }, []);

    useEffect(() => {
        const loadPremiumData = async () => {
            try {
                setIsLoading(true);
                setError("");

                const [offeringsResult, subscribed] = await Promise.all([
                    getSubscriptionOfferings(),
                    getCustomerSubscriptionStatus(),
                ]);

                setIsSubscribed(subscribed);

                const availablePackages = offeringsResult?.current?.availablePackages || [];

                console.log("[Premium] packages count:", availablePackages.length);
                console.log(
                    "[Premium] packages:",
                    JSON.stringify(
                        availablePackages.map((p) => ({
                            id: p.identifier,
                            type: p.packageType,
                            price: p.product?.priceString,
                            productId: p.product?.productIdentifier,
                        }))
                    )
                );

                const sortedPackages = [...availablePackages].sort((a, b) => {
                    const order = { MONTHLY: 1, ANNUAL: 2, YEARLY: 2 };
                    const aType = String(a?.packageType || "").toUpperCase();
                    const bType = String(b?.packageType || "").toUpperCase();
                    return (order[aType] || 99) - (order[bType] || 99);
                });

                setPackages(sortedPackages);
                setSelectedPackageId(sortedPackages?.[0]?.identifier || null);

                if (!sortedPackages.length) {
                    setError("Premium plans are not available right now. Please try again later.");
                }
            } catch (e) {
                console.error("Failed to load premium data:", e);
                setError("Unable to load premium plans. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        loadPremiumData();
    }, []);

    const selectedPackage = useMemo(() => {
        return packages.find((pkg) => pkg.identifier === selectedPackageId) || null;
    }, [packages, selectedPackageId]);

    const getPackageMeta = (pkg) => {
        const type = String(pkg?.packageType || "").toUpperCase();
        const productId = String(
            pkg?.product?.productIdentifier || pkg?.identifier || ""
        ).toLowerCase();

        const isYearly =
            type === "ANNUAL" ||
            type === "YEARLY" ||
            productId.includes("year") ||
            productId.includes("annual");

        const isMonthly =
            type === "MONTHLY" ||
            productId.includes("month");

        const title = isYearly
            ? "Yearly Plan"
            : isMonthly
                ? "Monthly Plan"
                : pkg?.product?.title || "Premium Plan";

        const subtitle = isYearly
            ? "Best value for regular users"
            : isMonthly
                ? "Flexible monthly billing"
                : "Unlock premium features";

        const badge = isYearly
            ? "Recommended"
            : isMonthly
                ? "Popular"
                : "Premium";

        return { title, subtitle, badge };
    };

    const handlePurchase = async () => {
        if (!selectedPackage || isPurchasing) return;

        try {
            setIsPurchasing(true);
            setError("");

            const success = await purchaseSubscription(selectedPackage);
            if (success) {
                setIsSubscribed(true);
            } else {
                setError("Purchase not completed. Please try again.");
            }
        } catch (e) {
            console.error("Purchase flow failed:", e);
            setError("Purchase failed. Please try again.");
        } finally {
            setIsPurchasing(false);
        }
    };

    const handleRestore = async () => {
        if (isRestoring) return;

        try {
            setIsRestoring(true);
            setError("");

            const restored = await restoreUserPurchases();
            if (restored) {
                setIsSubscribed(true);
            } else {
                setError("No active premium purchase was found to restore.");
            }
        } catch (e) {
            console.error("Restore flow failed:", e);
            setError("Restore failed. Please try again.");
        } finally {
            setIsRestoring(false);
        }
    };

    const colors = {
        pageBg: isDark ? "#121212" : "#f8f9fb",
        shellBg: isDark ? "#121212" : "#f8f9fb",
        headerBg: isDark ? "#1e1e1e" : "#ffffff",
        cardBg: isDark ? "#1e1e1e" : "#ffffff",
        textMain: isDark ? "#ffffff" : "#111827",
        textMuted: isDark ? "#adb5bd" : "#6c757d",
        border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
        btnLightBg: isDark ? "#2a2a2a" : "#f8f9fa",
        btnLightText: isDark ? "#ffffff" : "#212529",
        heroBg: isDark
            ? "linear-gradient(135deg, #3a2d08 0%, #1e1e1e 55%, #473709 100%)"
            : "linear-gradient(135deg, #fff9e8 0%, #ffffff 55%, #fff4cc 100%)",
        selectedBorder: isDark ? "2px solid #f59f00" : "2px solid #f59f00",
        selectedShadow: isDark
            ? "0 0 0 4px rgba(245,159,0,0.12), 0 8px 24px rgba(0,0,0,0.22)"
            : "0 0 0 4px rgba(245,159,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
        radioBorder: isDark ? "#6c757d" : "#ced4da",
        radioBg: isDark ? "#2a2a2a" : "#fff",
        radioSelectedBg: isDark ? "#4a3a10" : "#fff3cd",
        alertBg: isDark ? "rgba(201,42,42,0.16)" : "#fff5f5",
        alertText: isDark ? "#ff8787" : "#c92a2a",
        activeBadgeBg: isDark ? "rgba(25,135,84,0.18)" : "rgba(25,135,84,0.12)",
        activeBadgeText: isDark ? "#8ce99a" : "#198754",
        badgeDefaultBg: isDark ? "rgba(13,110,253,0.18)" : "rgba(13,110,253,0.08)",
        badgeDefaultText: isDark ? "#8fb8ff" : "#0d6efd",
        badgeSelectedBg: isDark ? "rgba(245,159,0,0.18)" : "rgba(245,159,0,0.14)",
        badgeSelectedText: isDark ? "#ffd666" : "#b77900",
    };

    return (
        <div
            className="d-flex flex-column w-100 h-100"
            data-theme={isDark ? "dark" : "light"}
            data-bs-theme={isDark ? "dark" : "light"}
            style={{ overflow: "hidden", backgroundColor: colors.pageBg }}
        >
            <div
                className="d-flex flex-column mx-auto w-100 h-100 position-relative"
                style={{
                    maxWidth: "768px",
                    backgroundColor: colors.shellBg,
                    overflow: "hidden",
                }}
            >
                <header
                    className="shadow-sm flex-shrink-0 z-3"
                    style={{
                        paddingTop: "env(safe-area-inset-top)",
                        borderBottom: colors.border,
                        backgroundColor: colors.headerBg,
                    }}
                >
                    <div className="px-3 py-3 d-flex align-items-center justify-content-between">
                        <button
                            onClick={() => navigate(-1)}
                            className="btn rounded-circle border-0 d-flex align-items-center justify-content-center shadow-sm"
                            style={{
                                width: "42px",
                                height: "42px",
                                backgroundColor: colors.btnLightBg,
                                color: colors.btnLightText,
                            }}
                        >
                            <svg
                                width="22"
                                height="22"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.3"
                                viewBox="0 0 24 24"
                            >
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>

                        <div className="text-center">
                            <h5
                                className="m-0 fw-bold"
                                style={{ letterSpacing: "-0.5px", color: colors.textMain }}
                            >
                                Premium
                            </h5>
                            <div className="small" style={{ color: colors.textMuted }}>
                                Remove ads and unlock a cleaner experience
                            </div>
                        </div>

                        <div style={{ width: 42 }}></div>
                    </div>
                </header>

                <main
                    className="d-flex flex-column w-100"
                    style={{
                        flex: "1 1 0",
                        overflowY: "auto",
                        overflowX: "hidden",
                        backgroundColor: colors.pageBg,
                    }}
                >
                    <div className="container py-4">
                        <div
                            className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4"
                            style={{
                                background: colors.heroBg,
                            }}
                        >
                            <div className="p-4 p-sm-4">
                                <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                                    <div
                                        className="d-flex align-items-center justify-content-center rounded-4 text-white shadow-sm"
                                        style={{
                                            width: "58px",
                                            height: "58px",
                                            minWidth: "58px",
                                            background: "linear-gradient(135deg, #f59f00 0%, #ffcd39 100%)",
                                        }}
                                    >
                                        <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="M12 17l-5.878 3.09 1.123-6.545L2.49 8.91l6.573-.955L12 2l2.938 5.955 6.573.955-4.755 4.635 1.123 6.545z" />
                                        </svg>
                                    </div>

                                    {isSubscribed && (
                                        <span
                                            className="badge rounded-pill px-3 py-2"
                                            style={{
                                                backgroundColor: colors.activeBadgeBg,
                                                color: colors.activeBadgeText,
                                                fontWeight: 700,
                                                fontSize: "0.74rem",
                                            }}
                                        >
                                            Premium Active
                                        </span>
                                    )}
                                </div>

                                <h3
                                    className="fw-bold mb-2"
                                    style={{ letterSpacing: "-0.6px", color: colors.textMain }}
                                >
                                    Enjoy Eazy Bill without ads
                                </h3>
                                <p
                                    className="mb-0"
                                    style={{
                                        fontSize: "0.95rem",
                                        lineHeight: 1.6,
                                        color: colors.textMuted,
                                    }}
                                >
                                    Upgrade to premium and remove banner ads and interstitial ads for a faster, cleaner billing experience across your app.
                                </p>
                            </div>
                        </div>

                        <div className="row g-3 mb-4">
                            <div className="col-12 col-md-4">
                                <div
                                    className="card border-0 shadow-sm rounded-4 h-100"
                                    style={{ backgroundColor: colors.cardBg }}
                                >
                                    <div className="p-3">
                                        <div
                                            className="fw-bold mb-1"
                                            style={{ fontSize: "0.92rem", color: colors.textMain }}
                                        >
                                            Ad-free experience
                                        </div>
                                        <div className="small" style={{ color: colors.textMuted }}>
                                            Remove banner ads and interstitial ads and work with fewer distractions.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-md-4">
                                <div
                                    className="card border-0 shadow-sm rounded-4 h-100"
                                    style={{ backgroundColor: colors.cardBg }}
                                >
                                    <div className="p-3">
                                        <div
                                            className="fw-bold mb-1"
                                            style={{ fontSize: "0.92rem", color: colors.textMain }}
                                        >
                                            Clean screens
                                        </div>
                                        <div className="small" style={{ color: colors.textMuted }}>
                                            Get more space for invoices, reports, and business work.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-md-4">
                                <div
                                    className="card border-0 shadow-sm rounded-4 h-100"
                                    style={{ backgroundColor: colors.cardBg }}
                                >
                                    <div className="p-3">
                                        <div
                                            className="fw-bold mb-1"
                                            style={{ fontSize: "0.92rem", color: colors.textMain }}
                                        >
                                            Easy restore
                                        </div>
                                        <div className="small" style={{ color: colors.textMuted }}>
                                            Restore your premium access anytime after reinstalling.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-2 d-flex align-items-center justify-content-between">
                            <h6
                                className="small fw-bold text-uppercase ms-2 mb-0"
                                style={{ letterSpacing: "0.6px", color: colors.textMuted }}
                            >
                                Choose your plan
                            </h6>
                        </div>

                        {isLoading ? (
                            <div
                                className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4"
                                style={{ backgroundColor: colors.cardBg }}
                            >
                                <div className="p-4 text-center">
                                    <div className="spinner-border text-warning mb-3" role="status" />
                                    <div className="fw-bold" style={{ color: colors.textMain }}>
                                        Loading premium plans...
                                    </div>
                                    <div className="small mt-1" style={{ color: colors.textMuted }}>
                                        Please wait a moment
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3 mb-4">
                                {packages.map((pkg) => {
                                    const meta = getPackageMeta(pkg);
                                    const isSelected = selectedPackageId === pkg.identifier;
                                    const priceText =
                                        pkg?.product?.priceString ||
                                        pkg?.product?.formattedPrice ||
                                        "Price unavailable";

                                    return (
                                        <button
                                            key={pkg.identifier}
                                            type="button"
                                            onClick={() => setSelectedPackageId(pkg.identifier)}
                                            className="card border-0 shadow-sm rounded-4 overflow-hidden text-start"
                                            style={{
                                                outline: "none",
                                                backgroundColor: colors.cardBg,
                                                border: isSelected ? colors.selectedBorder : "2px solid transparent",
                                                boxShadow: isSelected ? colors.selectedShadow : undefined,
                                                transition: "all 0.2s ease",
                                            }}
                                        >
                                            <div className="p-3 p-sm-4 d-flex align-items-center gap-3">
                                                <div
                                                    className="rounded-circle d-flex align-items-center justify-content-center"
                                                    style={{
                                                        width: "24px",
                                                        height: "24px",
                                                        minWidth: "24px",
                                                        border: isSelected
                                                            ? "7px solid #f59f00"
                                                            : `2px solid ${colors.radioBorder}`,
                                                        backgroundColor: isSelected
                                                            ? colors.radioSelectedBg
                                                            : colors.radioBg,
                                                    }}
                                                />

                                                <div className="flex-grow-1">
                                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                                        <div
                                                            className="fw-bold"
                                                            style={{ fontSize: "1rem", color: colors.textMain }}
                                                        >
                                                            {meta.title}
                                                        </div>
                                                        <span
                                                            className="badge rounded-pill"
                                                            style={{
                                                                backgroundColor: isSelected
                                                                    ? colors.badgeSelectedBg
                                                                    : colors.badgeDefaultBg,
                                                                color: isSelected
                                                                    ? colors.badgeSelectedText
                                                                    : colors.badgeDefaultText,
                                                                fontSize: "0.68rem",
                                                                fontWeight: 700,
                                                                padding: "6px 10px",
                                                            }}
                                                        >
                                                            {meta.badge}
                                                        </span>
                                                    </div>

                                                    <div
                                                        className="small mb-2"
                                                        style={{ color: colors.textMuted }}
                                                    >
                                                        {meta.subtitle}
                                                    </div>

                                                    <div
                                                        className="fw-bold"
                                                        style={{ fontSize: "1.1rem", color: colors.textMain }}
                                                    >
                                                        {priceText}
                                                    </div>
                                                </div>

                                                <svg
                                                    width="22"
                                                    height="22"
                                                    fill="none"
                                                    stroke={isSelected ? "#f59f00" : isDark ? "#868e96" : "#adb5bd"}
                                                    strokeWidth="2.2"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {error && (
                            <div
                                className="alert border-0 rounded-4 shadow-sm mb-4"
                                style={{
                                    backgroundColor: colors.alertBg,
                                    color: colors.alertText,
                                }}
                            >
                                <div className="fw-bold mb-1">Something went wrong</div>
                                <div className="small mb-0">{error}</div>
                            </div>
                        )}

                        <div
                            className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4"
                            style={{ backgroundColor: colors.cardBg }}
                        >
                            <div className="p-3 p-sm-4">
                                <button
                                    type="button"
                                    onClick={handlePurchase}
                                    disabled={!selectedPackage || isPurchasing || isLoading || isSubscribed}
                                    className="btn w-100 rounded-4 fw-bold border-0"
                                    style={{
                                        minHeight: "54px",
                                        background: isSubscribed
                                            ? "#198754"
                                            : "linear-gradient(135deg, #f59f00 0%, #ffcd39 100%)",
                                        color: isSubscribed ? "#ffffff" : "#212529",
                                        fontSize: "1rem",
                                        boxShadow: isSubscribed
                                            ? "none"
                                            : "0 10px 24px rgba(245,159,0,0.22)",
                                    }}
                                >
                                    {isSubscribed
                                        ? "Premium Already Active"
                                        : isPurchasing
                                            ? "Processing Purchase..."
                                            : selectedPackage
                                                ? `Continue with ${getPackageMeta(selectedPackage).title}`
                                                : "Select a Plan"}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleRestore}
                                    disabled={isRestoring || isLoading}
                                    className="btn w-100 rounded-4 fw-semibold mt-3 border"
                                    style={{
                                        minHeight: "50px",
                                        backgroundColor: colors.btnLightBg,
                                        color: colors.btnLightText,
                                        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)",
                                    }}
                                >
                                    {isRestoring ? "Restoring Purchases..." : "Restore Purchases"}
                                </button>

                                <div
                                    className="text-center small mt-3"
                                    style={{ lineHeight: 1.6, color: colors.textMuted }}
                                >
                                    Your purchase will be handled securely through Google Play.
                                    Premium removes banner ads and interstitial ads from your Eazy Bill app experience.
                                </div>
                            </div>
                        </div>

                        <div
                            className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4"
                            style={{ backgroundColor: colors.cardBg }}
                        >
                            <div className="p-3 p-sm-4">
                                <div
                                    className="fw-bold mb-3"
                                    style={{ fontSize: "0.96rem", color: colors.textMain }}
                                >
                                    Why go premium?
                                </div>
                                <div className="d-flex flex-column gap-3">
                                    <div className="d-flex align-items-start gap-3">
                                        <div
                                            className="rounded-3 d-flex align-items-center justify-content-center text-white"
                                            style={{ width: 34, height: 34, minWidth: 34, backgroundColor: "#198754" }}
                                        >
                                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="fw-semibold" style={{ color: colors.textMain }}>
                                                Better working space
                                            </div>
                                            <div className="small" style={{ color: colors.textMuted }}>
                                                No banner ads or interstitial ads while viewing business data and invoices.
                                            </div>
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-start gap-3">
                                        <div
                                            className="rounded-3 d-flex align-items-center justify-content-center text-white"
                                            style={{ width: 34, height: 34, minWidth: 34, backgroundColor: "#0d6efd" }}
                                        >
                                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                                <path d="M12 8v4l3 3" />
                                                <circle cx="12" cy="12" r="9" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="fw-semibold" style={{ color: colors.textMain }}>
                                                Faster workflow
                                            </div>
                                            <div className="small" style={{ color: colors.textMuted }}>
                                                Work smoothly without ad interruptions during billing and navigation.
                                            </div>
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-start gap-3">
                                        <div
                                            className="rounded-3 d-flex align-items-center justify-content-center text-white"
                                            style={{ width: 34, height: 34, minWidth: 34, backgroundColor: "#6f42c1" }}
                                        >
                                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                                <path d="M4 12h16" />
                                                <path d="M12 4v16" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="fw-semibold" style={{ color: colors.textMain }}>
                                                Simple restore support
                                            </div>
                                            <div className="small" style={{ color: colors.textMuted }}>
                                                Restore premium anytime if you change device or reinstall.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ height: "110px", flexShrink: 0 }}></div>
                    </div>
                </main>
            </div>
        </div>
    );
}