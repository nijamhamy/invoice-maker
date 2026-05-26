import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { getData, saveData } from "../utils/storage";
import { getSettings } from "../utils/settings";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { StatusBar, Style } from "@capacitor/status-bar";

export default function Home() {
    const navigate = useNavigate();

    const settings = getSettings();
    const currency = settings.currency || { code: "INR", symbol: "₹" };

    const [invoices, setInvoices] = useState([]);
    const [filter, setFilter] = useState("All");
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isDark, setIsDark] = useState(false);

    const pressTimerRef = useRef(null);

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
        const data = getData("invoices") || [];
        const sortedData = [...data].sort(
            (a, b) => new Date(b.issueDate) - new Date(a.issueDate)
        );
        setInvoices(sortedData);
    }, []);

    const filteredInvoices = useMemo(() => {
        if (filter === "All") return invoices;
        return invoices.filter((inv) => inv.paymentStatus === filter);
    }, [invoices, filter]);

    const handleTouchStart = (id) => {
        pressTimerRef.current = setTimeout(() => enterSelectionMode(id), 600);
    };

    const handleTouchEnd = () => {
        if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    };

    const enterSelectionMode = async (id) => {
        setIsSelectionMode(true);
        setSelectedIds([id]);
        try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (e) {
            if (navigator.vibrate) navigator.vibrate(50);
        }
    };

    const toggleSelection = async (id) => {
        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch (e) { }

        if (selectedIds.includes(id)) {
            const newIds = selectedIds.filter((itemId) => itemId !== id);
            setSelectedIds(newIds);
            if (newIds.length === 0) setIsSelectionMode(false);
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleItemClick = (id) => {
        if (isSelectionMode) toggleSelection(id);
        else navigate(`/invoice/edit/${id}`);
    };

    const selectAll = () => {
        if (selectedIds.length === filteredInvoices.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredInvoices.map((i) => i.id));
        }
    };

    const deleteSelected = () => {
        if (!window.confirm(`Delete ${selectedIds.length} invoices?`)) return;
        const newInvoices = invoices.filter((inv) => !selectedIds.includes(inv.id));
        setInvoices(newInvoices);
        saveData("invoices", newInvoices);
        setSelectedIds([]);
        setIsSelectionMode(false);
    };

    const exitSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedIds([]);
    };

    const formatAmount = (amount) => {
        return `${currency.symbol} ${Number(amount || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const colors = {
        pageBg: isDark ? "#121212" : "#f8f9fa",
        shellBg: isDark ? "#121212" : "transparent",
        headerBg: isDark ? "#1e1e1e" : "#ffffff",
        contentBg: isDark ? "#181818" : "#f8f9fa",
        textMain: isDark ? "#ffffff" : "#212529",
        textMuted: isDark ? "#adb5bd" : "#6c757d",
        textSoft: isDark ? "#ced4da" : "#6c757d",
        cardBg: isDark ? "#1e1e1e" : "#ffffff",
        softBg: isDark ? "#2a2a2a" : "#f8f9fa",
        innerSoftBg: isDark ? "#252525" : "#ffffff",
        border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        avatarBg: isDark ? "#2a2a2a" : "#f8f9fa",
        avatarBorder: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #fff",
        selectionUnselectedBg: isDark ? "#2a2a2a" : "#f8f9fa",
        badgePaidBg: isDark ? "rgba(5,150,105,0.18)" : "#e1f9ec",
        badgePaidText: isDark ? "#6ee7b7" : "#059669",
        badgeUnpaidBg: isDark ? "rgba(220,38,38,0.18)" : "#fee2e2",
        badgeUnpaidText: isDark ? "#fca5a5" : "#dc2626",
        badgeOtherBg: isDark ? "rgba(217,119,6,0.18)" : "#fef3c7",
        badgeOtherText: isDark ? "#fcd34d" : "#d97706",
        fabShadow: isDark
            ? "0 8px 24px rgba(13, 110, 253, 0.5)"
            : "0 8px 24px rgba(13, 110, 253, 0.4)",
        emptyIconBg: isDark ? "#1e1e1e" : "#ffffff",
        emptyIconStroke: isDark ? "#868e96" : "#adb5bd",
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
                style={{ maxWidth: "768px", backgroundColor: colors.shellBg }}
            >
                <header
                    className="shadow-sm flex-shrink-0 z-3"
                    style={{
                        paddingTop: "env(safe-area-inset-top)",
                        backgroundColor: colors.headerBg,
                    }}
                >
                    {isSelectionMode ? (
                        <div className="d-flex align-items-center justify-content-between p-3 bg-primary text-white shadow-sm">
                            <div className="d-flex align-items-center gap-2">
                                <button
                                    onClick={exitSelectionMode}
                                    className="btn btn-link text-white p-0 text-decoration-none"
                                >
                                    <svg
                                        width="26"
                                        height="26"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <span className="fw-bold fs-5 ms-2">
                                    {selectedIds.length} Selected
                                </span>
                            </div>

                            <div className="d-flex gap-3 align-items-center">
                                <button
                                    onClick={selectAll}
                                    className="btn btn-outline-light btn-sm rounded-pill px-3 fw-bold"
                                >
                                    {selectedIds.length === filteredInvoices.length ? "None" : "All"}
                                </button>
                                <button
                                    onClick={deleteSelected}
                                    className="btn btn-danger text-white rounded-circle p-2 shadow-sm d-flex border-0 bg-danger"
                                >
                                    <svg
                                        width="20"
                                        height="20"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 d-flex justify-content-between align-items-center">
                            <div>
                                <h4
                                    className="fw-bold m-0"
                                    style={{
                                        letterSpacing: "-1px",
                                        fontSize: "1.55rem",
                                        color: colors.textMain,
                                    }}
                                >
                                    My Invoices
                                </h4>
                            </div>
                            <div style={{ width: "40px" }}></div>
                        </div>
                    )}

                    <div
                        className="px-3 pb-3 pt-1"
                        style={{ backgroundColor: colors.headerBg }}
                    >
                        <div
                            className="p-1 rounded-4 d-flex shadow-sm gap-1"
                            style={{
                                backgroundColor: colors.softBg,
                                border: `1px solid ${colors.border}`,
                            }}
                        >
                            {["All", "Paid", "Unpaid"].map((status) => (
                                <button
                                    key={status}
                                    className="btn btn-sm flex-grow-1 rounded-4 border-0 fw-bold py-2"
                                    onClick={() => setFilter(status)}
                                    style={{
                                        fontSize: "0.85rem",
                                        minHeight: "40px",
                                        backgroundColor:
                                            filter === status ? colors.innerSoftBg : "transparent",
                                        color: filter === status ? "#0d6efd" : colors.textMuted,
                                        boxShadow:
                                            filter === status
                                                ? isDark
                                                    ? "0 2px 8px rgba(0,0,0,0.25)"
                                                    : "0 2px 8px rgba(0,0,0,0.08)"
                                                : "none",
                                    }}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <main
                    className="p-3 d-flex flex-column w-100"
                    style={{
                        flex: "1 1 0",
                        overflowY: "auto",
                        overflowX: "hidden",
                        backgroundColor: colors.contentBg,
                    }}
                >
                    {filteredInvoices.length === 0 ? (
                        <div className="text-center py-5 mt-4">
                            <div
                                className="mb-4 d-inline-block p-4 rounded-circle shadow-sm border opacity-75"
                                style={{
                                    backgroundColor: colors.emptyIconBg,
                                    borderColor: colors.border,
                                }}
                            >
                                <svg
                                    width="60"
                                    height="60"
                                    fill="none"
                                    stroke={colors.emptyIconStroke}
                                    strokeWidth="1"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h5 className="fw-bold mb-1" style={{ color: colors.textMain }}>
                                No Invoices Found
                            </h5>
                            <p className="px-4 small" style={{ color: colors.textMuted }}>
                                Tap the plus button below to create your first professional invoice.
                            </p>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {filteredInvoices.map((inv) => (
                                <div
                                    key={inv.id}
                                    className="card border-0 shadow-sm rounded-4 overflow-hidden"
                                    onClick={() => handleItemClick(inv.id)}
                                    onTouchStart={() => handleTouchStart(inv.id)}
                                    onTouchEnd={handleTouchEnd}
                                    style={{
                                        backgroundColor: colors.cardBg,
                                        border: selectedIds.includes(inv.id)
                                            ? "2px solid #0d6efd"
                                            : "2px solid transparent",
                                        transform: selectedIds.includes(inv.id)
                                            ? "scale(0.98)"
                                            : "scale(1)",
                                        transition: "all 0.18s ease",
                                        cursor: "pointer",
                                    }}
                                >
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between gap-3">
                                            <div className="d-flex align-items-center gap-3 flex-grow-1 overflow-hidden">
                                                {isSelectionMode ? (
                                                    <div
                                                        className={`rounded-circle border d-flex align-items-center justify-content-center shadow-sm ${selectedIds.includes(inv.id)
                                                                ? "bg-primary border-primary"
                                                                : ""
                                                            }`}
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            minWidth: 28,
                                                            backgroundColor: selectedIds.includes(inv.id)
                                                                ? "#0d6efd"
                                                                : colors.selectionUnselectedBg,
                                                            borderColor: selectedIds.includes(inv.id)
                                                                ? "#0d6efd"
                                                                : colors.border,
                                                        }}
                                                    >
                                                        {selectedIds.includes(inv.id) && (
                                                            <svg
                                                                width="16"
                                                                height="16"
                                                                fill="none"
                                                                stroke="white"
                                                                strokeWidth="3"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="rounded-circle text-primary d-flex align-items-center justify-content-center fw-bold shadow-sm"
                                                        style={{
                                                            width: 48,
                                                            height: 48,
                                                            minWidth: 48,
                                                            fontSize: "1.1rem",
                                                            backgroundColor: colors.avatarBg,
                                                            border: colors.avatarBorder,
                                                        }}
                                                    >
                                                        {inv.clientName?.charAt(0).toUpperCase() || "I"}
                                                    </div>
                                                )}

                                                <div className="overflow-hidden flex-grow-1">
                                                    <h6
                                                        className="fw-bold m-0 mb-1 text-truncate"
                                                        style={{ fontSize: "1rem", color: colors.textMain }}
                                                    >
                                                        {inv.clientName}
                                                    </h6>

                                                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                                        <span
                                                            className="px-2 rounded-2 fw-bold text-truncate"
                                                            style={{
                                                                fontSize: "0.7rem",
                                                                maxWidth: "120px",
                                                                backgroundColor: colors.softBg,
                                                                color: "#0d6efd",
                                                            }}
                                                        >
                                                            {inv.invoiceNo}
                                                        </span>
                                                        <span
                                                            className="opacity-75 text-truncate"
                                                            style={{
                                                                fontSize: "0.75rem",
                                                                color: colors.textMuted,
                                                            }}
                                                        >
                                                            {inv.issueDate}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className="text-end flex-shrink-0"
                                                style={{ minWidth: "115px" }}
                                            >
                                                <h6
                                                    className="fw-bold m-0 mb-1 text-nowrap"
                                                    style={{
                                                        fontSize: "0.96rem",
                                                        whiteSpace: "nowrap",
                                                        color: colors.textMain,
                                                    }}
                                                >
                                                    {formatAmount(inv.total)}
                                                </h6>

                                                <span
                                                    className="badge px-2 py-1 rounded-pill fw-bold text-nowrap"
                                                    style={{
                                                        fontSize: "0.65rem",
                                                        backgroundColor:
                                                            inv.paymentStatus === "Paid"
                                                                ? colors.badgePaidBg
                                                                : inv.paymentStatus === "Unpaid"
                                                                    ? colors.badgeUnpaidBg
                                                                    : colors.badgeOtherBg,
                                                        color:
                                                            inv.paymentStatus === "Paid"
                                                                ? colors.badgePaidText
                                                                : inv.paymentStatus === "Unpaid"
                                                                    ? colors.badgeUnpaidText
                                                                    : colors.badgeOtherText,
                                                    }}
                                                >
                                                    {inv.paymentStatus?.toUpperCase() || "UNPAID"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ height: "120px", flexShrink: 0 }}></div>
                </main>

                {!isSelectionMode && (
                    <button
                        className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center"
                        style={{
                            position: "absolute",
                            bottom: "20px",
                            right: "20px",
                            width: "60px",
                            height: "60px",
                            zIndex: 1050,
                            border: "none",
                            boxShadow: colors.fabShadow,
                        }}
                        onClick={() => navigate("/invoice/new")}
                    >
                        <svg
                            width="30"
                            height="30"
                            fill="none"
                            stroke="white"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                        >
                            <path d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}