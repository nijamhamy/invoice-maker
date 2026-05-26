import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import BusinessProfileModal from "../settings/BusinessProfileModal.jsx";
import CurrencyModal from "../settings/CurrencyModal.jsx";
import PdfTemplateModal from "../settings/PdfTemplateModal.jsx";
import DarkModeModal from "../settings/DarkModeModal.jsx";
import BackupModal from "../settings/BackupModal.jsx";
import { getSettings, saveSettings } from "../utils/settings";
import { StatusBar, Style } from "@capacitor/status-bar";

const APP_LINK = "https://play.google.com/store/apps/details?id=com.eazybill.app";

export default function Settings() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(null);
    const [showPreferences, setShowPreferences] = useState(false);

    const initialSettings = getSettings();

    const [settingsData, setSettingsData] = useState(initialSettings);
    const [defaultDiscount, setDefaultDiscount] = useState(
        initialSettings?.discountRate ??
        initialSettings?.defaultDiscountRate ??
        0
    );
    const [defaultTax, setDefaultTax] = useState(
        initialSettings?.taxRate ?? 0
    );
    const [defaultNote, setDefaultNote] = useState(
        initialSettings?.defaultNote ||
        initialSettings?.defaultInvoiceNote ||
        initialSettings?.invoiceNote ||
        ""
    );

    const isDark = !!settingsData?.darkMode;

    const colors = {
        pageBg: isDark ? "#121212" : "#f8f9fb",
        surfaceBg: isDark ? "#1e1e1e" : "#ffffff",
        surfaceSoft: isDark ? "#2a2a2a" : "#f8f9fa",
        textMain: isDark ? "#ffffff" : "#111827",
        textMuted: isDark ? "#a0a0a0" : "#6c757d",
        border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        pressedBg: isDark ? "#2a2a2a" : "#f1f3f5",
        shadow: isDark
            ? "0 6px 20px rgba(0, 0, 0, 0.28)"
            : "0 4px 14px rgba(0, 0, 0, 0.06)",
    };

    useEffect(() => {
        const initStatusBar = async () => {
            if (!Capacitor.isNativePlatform()) return;

            try {
                await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
                await StatusBar.setBackgroundColor({
                    color: isDark ? "#121212" : "#ffffff",
                });
            } catch (e) {
                console.warn("StatusBar plugin not available or running in web", e);
            }
        };

        initStatusBar();
    }, [isDark]);

    useEffect(() => {
        const fresh = getSettings();
        setSettingsData(fresh);
        setDefaultDiscount(
            fresh?.discountRate ??
            fresh?.defaultDiscountRate ??
            0
        );
        setDefaultTax(fresh?.taxRate ?? 0);
        setDefaultNote(
            fresh?.defaultNote ||
            fresh?.defaultInvoiceNote ||
            fresh?.invoiceNote ||
            ""
        );
    }, [open]);

    const handleSavePreferences = (field, value) => {
        const latest = getSettings() || {};
        const updated = {
            ...latest,
            [field]: value,
        };

        if (field === "discountRate") {
            updated.defaultDiscountRate = value;
        }

        if (field === "taxRate") {
            updated.taxRate = value;
        }

        if (field === "defaultNote") {
            updated.defaultInvoiceNote = value;
            updated.invoiceNote = value;
        }

        const merged = saveSettings(updated);
        setSettingsData(merged);

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("theme-change"));
    };

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: "Eazy Bill App",
                    text: "Try this Eazy Bill App",
                    url: APP_LINK,
                });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(APP_LINK);
                alert("App link copied to clipboard");
            }
        } catch (e) {
            console.log("Share cancelled or failed", e);
        }
    };

    const SettingsItem = ({
        icon,
        color,
        title,
        subtitle,
        onClick,
        isLast,
        rightContent,
    }) => (
        <button
            type="button"
            onClick={onClick}
            className="w-100 border-0 d-flex align-items-center p-3 text-start"
            style={{
                backgroundColor: colors.surfaceBg,
                color: colors.textMain,
                transition: "background-color 0.2s ease, transform 0.12s ease",
                borderBottom: !isLast ? `1px solid ${colors.border}` : "none",
            }}
            onTouchStart={(e) => {
                e.currentTarget.style.backgroundColor = colors.pressedBg;
                e.currentTarget.style.transform = "scale(0.995)";
            }}
            onTouchEnd={(e) => {
                e.currentTarget.style.backgroundColor = colors.surfaceBg;
                e.currentTarget.style.transform = "scale(1)";
            }}
            onMouseDown={(e) => {
                e.currentTarget.style.backgroundColor = colors.pressedBg;
                e.currentTarget.style.transform = "scale(0.995)";
            }}
            onMouseUp={(e) => {
                e.currentTarget.style.backgroundColor = colors.surfaceBg;
                e.currentTarget.style.transform = "scale(1)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.surfaceBg;
                e.currentTarget.style.transform = "scale(1)";
            }}
        >
            <div
                className="d-flex align-items-center justify-content-center rounded-3 text-white me-3 shadow-sm"
                style={{
                    width: "40px",
                    height: "40px",
                    minWidth: "40px",
                    backgroundColor: color,
                }}
            >
                {icon}
            </div>

            <div className="flex-grow-1 overflow-hidden">
                <div
                    className="fw-bold text-truncate"
                    style={{
                        fontSize: "0.96rem",
                        letterSpacing: "-0.2px",
                        color: colors.textMain,
                    }}
                >
                    {title}
                </div>
                {subtitle && (
                    <div
                        className="small text-truncate"
                        style={{
                            fontSize: "0.76rem",
                            color: colors.textMuted,
                        }}
                    >
                        {subtitle}
                    </div>
                )}
            </div>

            <div
                className="opacity-75 ms-2 d-flex align-items-center"
                style={{ color: colors.textMuted }}
            >
                {rightContent || (
                    <svg
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        viewBox="0 0 24 24"
                    >
                        <path d="M9 5l7 7-7 7" />
                    </svg>
                )}
            </div>
        </button>
    );

    const SectionTitle = ({ children }) => (
        <h6
            className="small fw-bold text-uppercase ms-2 mb-2"
            style={{
                letterSpacing: "0.6px",
                color: colors.textMuted,
            }}
        >
            {children}
        </h6>
    );

    const cardStyle = {
        backgroundColor: colors.surfaceBg,
        boxShadow: colors.shadow,
        border: `1px solid ${colors.border}`,
    };

    return (
        <div
            className="d-flex flex-column w-100 h-100"
            data-bs-theme={isDark ? "dark" : "light"}
            style={{
                overflow: "hidden",
                backgroundColor: colors.pageBg,
            }}
        >
            <div
                className="d-flex flex-column mx-auto w-100 h-100 position-relative"
                style={{
                    maxWidth: "768px",
                    backgroundColor: colors.pageBg,
                    overflow: "hidden",
                }}
            >
                <header
                    className="flex-shrink-0 z-3"
                    style={{
                        paddingTop: "env(safe-area-inset-top)",
                        borderBottom: `1px solid ${colors.border}`,
                        backgroundColor: colors.surfaceBg,
                        boxShadow: isDark
                            ? "0 2px 10px rgba(0,0,0,0.24)"
                            : "0 2px 10px rgba(0,0,0,0.04)",
                    }}
                >
                    <div className="px-3 py-3 d-flex align-items-center justify-content-between">
                        <button
                            onClick={() => navigate(-1)}
                            className="btn rounded-circle border-0 d-flex align-items-center justify-content-center shadow-sm"
                            style={{
                                width: "42px",
                                height: "42px",
                                backgroundColor: colors.surfaceSoft,
                                color: colors.textMain,
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
                                style={{
                                    letterSpacing: "-0.5px",
                                    color: colors.textMain,
                                }}
                            >
                                Settings
                            </h5>
                            <div
                                className="small"
                                style={{ color: colors.textMuted }}
                            >
                                Manage app preferences
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
                        <SectionTitle>Business</SectionTitle>
                        <div className="card border-0 rounded-4 overflow-hidden mb-4" style={cardStyle}>
                            <SettingsItem
                                title="Business Profile"
                                subtitle="Logo, Name, Address, Contact"
                                color="#0d6efd"
                                onClick={() => setOpen("profile")}
                                icon={
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                }
                            />
                            <SettingsItem
                                title="Currency & Locale"
                                subtitle="Select your preferred currency"
                                color="#198754"
                                onClick={() => setOpen("currency")}
                                icon={
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                }
                            />
                            <SettingsItem
                                title="Invoice Template"
                                subtitle="Customize PDF appearance"
                                color="#fd7e14"
                                onClick={() => setOpen("template")}
                                isLast={true}
                                icon={
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                }
                            />
                        </div>

                        <SectionTitle>Data Management</SectionTitle>
                        <div className="card border-0 rounded-4 overflow-hidden mb-4" style={cardStyle}>
                            <SettingsItem
                                title="Backup & Restore"
                                subtitle="Save data to Drive or Device"
                                color="#6f42c1"
                                onClick={() => setOpen("backup")}
                                isLast={true}
                                icon={
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                }
                            />
                        </div>

                        <SectionTitle>Premium</SectionTitle>
                        <div className="card border-0 rounded-4 overflow-hidden mb-4" style={cardStyle}>
                            <SettingsItem
                                title="Remove Ads"
                                subtitle="Upgrade to premium for an ad-free experience"
                                color="#f59f00"
                                onClick={() => navigate("/premium")}
                                isLast={true}
                                icon={
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M12 17l-5.878 3.09 1.123-6.545L2.49 8.91l6.573-.955L12 2l2.938 5.955 6.573.955-4.755 4.635 1.123 6.545z" />
                                    </svg>
                                }
                            />
                        </div>

                        <SectionTitle>App Preferences</SectionTitle>
                        <div className="card border-0 rounded-4 overflow-hidden mb-4" style={cardStyle}>
                            <SettingsItem
                                title="Preferences"
                                subtitle="Default discount, tax and invoice note"
                                color="#6610f2"
                                onClick={() => setShowPreferences(!showPreferences)}
                                isLast={!showPreferences}
                                rightContent={
                                    <svg
                                        width="20"
                                        height="20"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.2"
                                        viewBox="0 0 24 24"
                                        style={{
                                            transform: showPreferences ? "rotate(90deg)" : "rotate(0deg)",
                                            transition: "transform 0.2s ease",
                                        }}
                                    >
                                        <path d="M9 5l7 7-7 7" />
                                    </svg>
                                }
                                icon={
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M12 6V3m0 18v-3m6.364-10.364l2.121-2.121M3.515 20.485l2.121-2.121M21 12h-3M6 12H3m15.364 6.364l2.121 2.121M3.515 3.515l2.121 2.121" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                }
                            />

                            {showPreferences && (
                                <div
                                    className="border-top p-3 p-sm-4"
                                    style={{
                                        backgroundColor: colors.surfaceBg,
                                        borderColor: colors.border,
                                    }}
                                >
                                    <div className="row g-3">
                                        <div className="col-12 col-sm-6">
                                            <label
                                                className="form-label fw-bold small mb-2"
                                                style={{ color: colors.textMain }}
                                            >
                                                Default Discount (%)
                                            </label>
                                            <input
                                                type="number"
                                                className="form-control border-0 fw-bold"
                                                value={defaultDiscount}
                                                min="0"
                                                onChange={(e) => {
                                                    const value = Math.max(0, Number(e.target.value) || 0);
                                                    setDefaultDiscount(value);
                                                    handleSavePreferences("discountRate", value);
                                                }}
                                                style={{
                                                    minHeight: "48px",
                                                    backgroundColor: colors.surfaceSoft,
                                                    color: colors.textMain,
                                                }}
                                            />
                                            <div className="small mt-2" style={{ color: colors.textMuted }}>
                                                Auto applied on new invoices.
                                            </div>
                                        </div>

                                        <div className="col-12 col-sm-6">
                                            <label
                                                className="form-label fw-bold small mb-2"
                                                style={{ color: colors.textMain }}
                                            >
                                                Default Tax (%)
                                            </label>
                                            <input
                                                type="number"
                                                className="form-control border-0 fw-bold"
                                                value={defaultTax}
                                                min="0"
                                                onChange={(e) => {
                                                    const value = Math.max(0, Number(e.target.value) || 0);
                                                    setDefaultTax(value);
                                                    handleSavePreferences("taxRate", value);
                                                }}
                                                style={{
                                                    minHeight: "48px",
                                                    backgroundColor: colors.surfaceSoft,
                                                    color: colors.textMain,
                                                }}
                                            />
                                            <div className="small mt-2" style={{ color: colors.textMuted }}>
                                                Used as the starting tax rate.
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <label
                                                className="form-label fw-bold small mb-2"
                                                style={{ color: colors.textMain }}
                                            >
                                                Default Invoice Text / Note
                                            </label>
                                            <textarea
                                                className="form-control border-0"
                                                rows="4"
                                                placeholder="Enter default invoice note..."
                                                value={defaultNote}
                                                onChange={(e) => {
                                                    setDefaultNote(e.target.value);
                                                    handleSavePreferences("defaultNote", e.target.value);
                                                }}
                                                style={{
                                                    resize: "none",
                                                    minHeight: "110px",
                                                    backgroundColor: colors.surfaceSoft,
                                                    color: colors.textMain,
                                                }}
                                            />
                                            <div className="small mt-2" style={{ color: colors.textMuted }}>
                                                This note will automatically appear in invoice pages.
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <div
                                                className="rounded-4 p-3"
                                                style={{
                                                    backgroundColor: colors.surfaceSoft,
                                                    border: `1px solid ${colors.border}`,
                                                }}
                                            >
                                                <div
                                                    className="fw-bold small mb-2"
                                                    style={{ color: colors.textMain }}
                                                >
                                                    Current Saved Defaults
                                                </div>
                                                <div className="small" style={{ color: colors.textMuted }}>
                                                    Discount:{" "}
                                                    <span className="fw-semibold" style={{ color: colors.textMain }}>
                                                        {settingsData?.discountRate ?? 0}%
                                                    </span>
                                                </div>
                                                <div className="small" style={{ color: colors.textMuted }}>
                                                    Tax:{" "}
                                                    <span className="fw-semibold" style={{ color: colors.textMain }}>
                                                        {settingsData?.taxRate ?? 0}%
                                                    </span>
                                                </div>
                                                <div className="small text-truncate" style={{ color: colors.textMuted }}>
                                                    Note:{" "}
                                                    <span className="fw-semibold" style={{ color: colors.textMain }}>
                                                        {settingsData?.defaultNote ||
                                                            settingsData?.defaultInvoiceNote ||
                                                            settingsData?.invoiceNote ||
                                                            "No default note"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <SectionTitle>Appearance</SectionTitle>
                        <div className="card border-0 rounded-4 overflow-hidden mb-4" style={cardStyle}>
                            <SettingsItem
                                title="Dark Mode"
                                subtitle="Theme and display settings"
                                color="#212529"
                                onClick={() => setOpen("dark")}
                                isLast={true}
                                icon={
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                }
                            />
                        </div>

                        <SectionTitle>About & Support</SectionTitle>
                        <div className="card border-0 rounded-4 overflow-hidden mb-4" style={cardStyle}>
                            <SettingsItem
                                title="Share with Friends"
                                subtitle="Spread the word"
                                color="#d63384"
                                onClick={handleShare}
                                icon={
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                }
                            />
                            <SettingsItem
                                title="Privacy Policy"
                                subtitle="Terms & Conditions"
                                color="#6c757d"
                                onClick={() =>
                                    window.open(
                                        "https://doc-hosting.flycricket.io/eazy-bill-easy-invoice-maker-privacy-policy/0ed3dce2-efaf-4316-b5e4-ab5526b2b3fe/privacy",
                                        "_blank"
                                    )
                                }
                                isLast={true}
                                icon={
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                }
                            />
                        </div>

                        <div className="card border-0 rounded-4 overflow-hidden mb-4" style={cardStyle}>
                            <div className="p-3 text-center">
                                <div
                                    className="fw-bold"
                                    style={{
                                        fontSize: "0.95rem",
                                        color: colors.textMain,
                                    }}
                                >
                                    Eazy Bill
                                </div>
                                <div className="small" style={{ color: colors.textMuted }}>
                                    Version 1.0.0
                                </div>
                            </div>
                        </div>

                        <div style={{ height: "110px", flexShrink: 0 }}></div>
                    </div>
                </main>

                {open === "profile" && <BusinessProfileModal onClose={() => setOpen(null)} />}
                {open === "currency" && <CurrencyModal onClose={() => setOpen(null)} />}
                {open === "template" && <PdfTemplateModal onClose={() => setOpen(null)} />}
                {open === "dark" && <DarkModeModal onClose={() => setOpen(null)} />}
                {open === "backup" && <BackupModal onClose={() => setOpen(null)} />}
            </div>
        </div>
    );
}