import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

// Capacitor Native Plugins
import { App as CapacitorApp } from "@capacitor/app";
import { Dialog } from "@capacitor/dialog";
import { Toast } from "@capacitor/toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Network } from "@capacitor/network";
import { getCustomerSubscriptionStatus } from "../services/revenuecat";

// AdMob
import { AdMob, InterstitialAdPluginEvents } from "@capacitor-community/admob";

// Store & Utils
import { getSettings } from "../utils/settings";
import { useClientStore } from "../store/useClientStore";
import { useItemStore } from "../store/useItemStore";
import { getData, saveData } from "../utils/storage";
import {
    formatMoney,
    calculateInvoiceTotals,
    addInvoiceItem,
    updateInvoiceItemQty,
    removeInvoiceItem,
    buildInvoicePayload,
    getSelectedClientData,
} from "../services/invoiceService";

const ADMOB_INTERSTITIAL_ID = "ca-app-pub-8553625771070050/4324576783";

export default function InvoiceCreate() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const { clients } = useClientStore();
    const { items: itemsList } = useItemStore();

    const [settingsData, setSettingsData] = useState(getSettings());
    const profile = settingsData.businessProfile || {};
    const currency = settingsData.currency || { code: "INR", symbol: "₹" };

    const [isSaving, setIsSaving] = useState(false);
    const [showItemPopup, setShowItemPopup] = useState(false);
    const [showClientPopup, setShowClientPopup] = useState(false);
    const [itemSearch, setItemSearch] = useState("");
    const [clientSearch, setClientSearch] = useState("");

    const [invoiceNo, setInvoiceNo] = useState("");
    const [issueDate, setIssueDate] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [clientId, setClientId] = useState("");
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState("Cash");
    const [paymentStatus, setPaymentStatus] = useState("Unpaid");
    const [comment, setComment] = useState("");
    const [taxRate, setTaxRate] = useState(0);
    const [discountRate, setDiscountRate] = useState(0);
    const [isSubscribed, setIsSubscribed] = useState(false);

    // AdMob state refs
    const adLoadedRef = useRef(false);
    const pendingNavigateRef = useRef(null);
    const adListenersRef = useRef([]);

    const money = (value) => formatMoney(value, currency.symbol);

    const selectedClient = useMemo(() => {
        return getSelectedClientData(clients, clientId);
    }, [clientId, clients]);

    // ─── AdMob: Initialize & Preload on mount ────────────────────────────────
    useEffect(() => {
        const initAdMob = async () => {
            try {
                const subscribed = await getCustomerSubscriptionStatus();
                setIsSubscribed(subscribed);

                if (subscribed) {
                    adLoadedRef.current = false;
                    return;
                }

                await AdMob.initialize({
                    requestTrackingAuthorization: false,
                    initializeForTesting: false,
                });

                await prepareInterstitial();
            } catch (e) {
                console.warn("AdMob init failed:", e);
            }
        };

        initAdMob();

        const refreshSubscription = async () => {
            try {
                const subscribed = await getCustomerSubscriptionStatus();
                setIsSubscribed(subscribed);
                if (subscribed) {
                    adLoadedRef.current = false;
                }
            } catch (e) {
                console.warn("Subscription refresh failed:", e);
            }
        };

        window.addEventListener("subscription-updated", refreshSubscription);

        return () => {
            adListenersRef.current.forEach((l) => {
                try { l.remove(); } catch (_) { }
            });
            adListenersRef.current = [];
            window.removeEventListener("subscription-updated", refreshSubscription);
        };
    }, []);

    const prepareInterstitial = async () => {
        try {
            adLoadedRef.current = false;

            // Remove old listeners before adding new ones
            adListenersRef.current.forEach((l) => {
                try { l.remove(); } catch (_) { }
            });
            adListenersRef.current = [];

            // Loaded listener
            const loadedListener = await AdMob.addListener(
                InterstitialAdPluginEvents.Loaded,
                () => {
                    adLoadedRef.current = true;
                }
            );
            adListenersRef.current.push(loadedListener);

            // Dismissed listener — navigate after ad closes
            const dismissedListener = await AdMob.addListener(
                InterstitialAdPluginEvents.Dismissed,
                () => {
                    adLoadedRef.current = false;
                    if (pendingNavigateRef.current) {
                        const path = pendingNavigateRef.current;
                        pendingNavigateRef.current = null;
                        navigate(path, { replace: true });
                    }
                    // Preload next ad
                    prepareInterstitial();
                }
            );
            adListenersRef.current.push(dismissedListener);

            // Failed to load listener
            const failedListener = await AdMob.addListener(
                InterstitialAdPluginEvents.FailedToLoad,
                () => {
                    adLoadedRef.current = false;
                }
            );
            adListenersRef.current.push(failedListener);

            // Failed to show listener — fallback navigate
            const failedShowListener = await AdMob.addListener(
                InterstitialAdPluginEvents.FailedToShow,
                () => {
                    adLoadedRef.current = false;
                    if (pendingNavigateRef.current) {
                        const path = pendingNavigateRef.current;
                        pendingNavigateRef.current = null;
                        navigate(path, { replace: true });
                    }
                }
            );
            adListenersRef.current.push(failedShowListener);

            await AdMob.prepareInterstitial({
                adId: ADMOB_INTERSTITIAL_ID,
                isTesting: false,
            });
        } catch (e) {
            console.warn("AdMob prepareInterstitial failed:", e);
            adLoadedRef.current = false;
        }
    };

    // ─── Show interstitial or navigate directly ───────────────────────────────
    const showAdOrNavigate = async (navigatePath) => {
        try {
            const subscribed = await getCustomerSubscriptionStatus();

            if (subscribed || isSubscribed) {
                navigate(navigatePath, { replace: true });
                return;
            }

            const status = await Network.getStatus();
            const isConnected = status && status.connected;

            if (isConnected && adLoadedRef.current) {
                pendingNavigateRef.current = navigatePath;
                await AdMob.showInterstitial();
            } else {
                navigate(navigatePath, { replace: true });
            }
        } catch (e) {
            console.warn("Ad show error, navigating directly:", e);
            navigate(navigatePath, { replace: true });
        }
    };

    useEffect(() => {
        const initStatusBar = async () => {
            try {
                await StatusBar.setStyle({ style: Style.Light });
                await StatusBar.setBackgroundColor({ color: "#ffffff" });
            } catch (e) {
                console.warn("StatusBar plugin not available or running in web", e);
            }
        };
        initStatusBar();
    }, []);

    useEffect(() => {
        const refreshSettings = () => {
            setSettingsData(getSettings());
        };

        refreshSettings();
        window.addEventListener("storage", refreshSettings);
        window.addEventListener("theme-change", refreshSettings);

        return () => {
            window.removeEventListener("storage", refreshSettings);
            window.removeEventListener("theme-change", refreshSettings);
        };
    }, []);

    useEffect(() => {
        const backButtonHandler = CapacitorApp.addListener("backButton", () => {
            if (showItemPopup) {
                setShowItemPopup(false);
            } else if (showClientPopup) {
                setShowClientPopup(false);
            } else {
                navigate(-1);
            }
        });

        return () => {
            backButtonHandler.then((h) => h.remove());
        };
    }, [showItemPopup, showClientPopup, navigate]);

    useEffect(() => {
        const invoices = getData("invoices") || [];
        const latestSettings = getSettings();

        const savedDiscount =
            latestSettings?.discountRate ??
            latestSettings?.defaultDiscountRate ??
            0;

        const savedNote =
            latestSettings?.defaultNote ||
            latestSettings?.defaultInvoiceNote ||
            latestSettings?.invoiceNote ||
            "";

        const savedTax = Number(latestSettings?.taxRate || 0);

        if (isEditMode) {
            const existing = invoices.find((inv) => inv.id === id);

            if (existing) {
                setInvoiceNo(existing.invoiceNo);
                setIssueDate(existing.issueDate);
                setDueDate(existing.dueDate || "");
                setClientId(existing.clientId);
                setInvoiceItems((existing.items || []).filter((i) => i && i.name));
                setPaymentMethod(existing.paymentMethod || "Cash");
                setPaymentStatus(existing.paymentStatus || existing.status || "Unpaid");
                setComment(existing.comment ?? savedNote);
                setTaxRate(existing.taxRate ?? savedTax);
                setDiscountRate(existing.discountRate ?? savedDiscount);
            } else {
                navigate("/");
            }
        } else {
            const lastInvoice = invoices[invoices.length - 1];
            let nextNum = 1;

            if (lastInvoice && lastInvoice.invoiceNo) {
                const parts = lastInvoice.invoiceNo.split("-");
                if (parts.length === 2 && !isNaN(parts[1])) {
                    nextNum = parseInt(parts[1]) + 1;
                }
            }

            const todayStr = new Date().toISOString().split("T")[0];
            setInvoiceNo(`INV-${String(nextNum).padStart(5, "0")}`);
            setIssueDate(todayStr);
            setDueDate(todayStr);
            setTaxRate(savedTax);
            setDiscountRate(savedDiscount);
            setComment(savedNote);
        }
    }, [id, isEditMode, navigate]);

    const { subtotal, discountAmount, taxAmount, grandTotal } = useMemo(
        () =>
            calculateInvoiceTotals({
                items: invoiceItems,
                discountRate,
                taxRate,
            }),
        [invoiceItems, discountRate, taxRate]
    );

    const addItem = async (item) => {
        await Haptics.impact({ style: ImpactStyle.Light });
        setInvoiceItems((prev) => addInvoiceItem(prev, item));
        setShowItemPopup(false);
        setItemSearch("");
        await Toast.show({ text: `${item.name} added to invoice` });
    };

    const selectClient = async (client) => {
        await Haptics.impact({ style: ImpactStyle.Light });
        setClientId(client.id);
        setShowClientPopup(false);
        setClientSearch("");
        await Toast.show({ text: `${client.name} selected` });
    };

    const selectGuestClient = async () => {
        await Haptics.impact({ style: ImpactStyle.Light });
        setClientId("guest");
        setShowClientPopup(false);
        setClientSearch("");
        await Toast.show({ text: "Walk-in Customer selected" });
    };

    const removeItem = async (uniqueId) => {
        await Haptics.impact({ style: ImpactStyle.Medium });
        setInvoiceItems((prev) => removeInvoiceItem(prev, uniqueId));
    };

    const updateQty = (uniqueId, qty) => {
        setInvoiceItems((prev) => updateInvoiceItemQty(prev, uniqueId, qty));
    };

    const saveInvoice = async () => {
        await Haptics.impact({ style: ImpactStyle.Heavy });

        if (!clientId || invoiceItems.length === 0) {
            await Dialog.alert({
                title: "Missing Info",
                message: "Please select a client and add at least one item.",
            });
            return;
        }

        setIsSaving(true);

        // Object Bracket { } சேர்த்து பழையபடியே அனுப்பவும்!
        const payloadData = buildInvoicePayload({
            id,
            isEditMode,
            clientId,
            clients,
            invoiceNo,
            issueDate,
            dueDate,
            items: invoiceItems, // <--- இது முக்கியம்
            paymentMethod,
            paymentStatus,
            comment,
            discountRate,
            taxRate
        });

        // Add notes for PDF compatibility
        const invoiceData = {
            ...payloadData,
            notes: comment
        };

        invoiceData.subtotal = subtotal;
        invoiceData.discountAmount = discountAmount;
        invoiceData.taxAmount = taxAmount;
        invoiceData.grandTotal = grandTotal;
        invoiceData.total = grandTotal;
        invoiceData.paymentMethod = paymentMethod;
        invoiceData.paymentStatus = paymentStatus;

        if (paymentStatus === "Paid") {
            invoiceData.status = "Paid";
            invoiceData.paid = grandTotal;
            invoiceData.amountPaid = grandTotal;
            invoiceData.balance = 0;
        } else if (paymentStatus === "Pending") {
            invoiceData.status = "Pending";
            invoiceData.paid = 0;
            invoiceData.amountPaid = 0;
            invoiceData.balance = grandTotal;
        } else {
            invoiceData.status = "Unpaid";
            invoiceData.paid = 0;
            invoiceData.amountPaid = 0;
            invoiceData.balance = grandTotal;
        }

        const invoices = getData("invoices") || [];
        if (isEditMode) {
            saveData(
                "invoices",
                invoices.map((inv) => (inv.id === id ? invoiceData : inv))
            );
        } else {
            saveData("invoices", [...invoices, invoiceData]);
        }

        setIsSaving(false);

        // Show interstitial ad if internet is on, then navigate; else navigate directly
        await showAdOrNavigate(`/invoice/preview/${invoiceData.id}`);
    };

    const filteredInventory = itemsList.filter(
        (i) =>
            i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
            (i.serialNo && String(i.serialNo).includes(itemSearch))
    );

    const filteredClients = clients.filter(
        (c) =>
            c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
            (c.phone && String(c.phone).includes(clientSearch)) ||
            (c.email && c.email.toLowerCase().includes(clientSearch.toLowerCase()))
    );

    return (
        <div className="d-flex flex-column w-100 h-100"
            style={{ overflow: 'hidden' }}>
            <div className="d-flex flex-column mx-auto w-100 h-100 position-relative"
                style={{ maxWidth: '768px', backgroundColor: '#ffffff' }}>
                <header
                    className="bg-white shadow-sm flex-shrink-0 z-3"
                    style={{ paddingTop: "env(safe-area-inset-top)" }}
                >
                    <div className="p-3 d-flex align-items-center justify-content-between">
                        <button
                            onClick={() => navigate(-1)}
                            className="btn btn-light rounded-circle border-0 d-flex align-items-center justify-content-center"
                            style={{ width: "40px", height: "40px" }}
                        >
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>

                        <h6 className="m-0 fw-bold text-dark">
                            {isEditMode ? "Edit Invoice" : "Create Invoice"}
                        </h6>

                        <div style={{ width: 40 }}></div>
                    </div>
                </header>

                <main
                    className="p-3 p-md-4 d-flex flex-column"
                    style={{
                        flex: "1 1 0",
                        overflowY: "auto",
                        overflowX: "hidden",
                        paddingBottom: "180px",
                    }}
                >
                    <div className="mb-4 d-flex align-items-center justify-content-center gap-3 bg-white p-3 rounded-4 shadow-sm border border-light flex-shrink-0">
                        {profile.logo ? (
                            <img
                                src={profile.logo}
                                alt="Logo"
                                className="rounded-3 border p-1 bg-white"
                                style={{ width: "60px", height: "60px", objectFit: "contain" }}
                            />
                        ) : (
                            <div
                                className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center fw-bold shadow-sm"
                                style={{ width: "60px", height: "60px", fontSize: "1.5rem" }}
                            >
                                {profile.businessName?.charAt(0) || "B"}
                            </div>
                        )}
                        <div className="text-start">
                            <h6 className="fw-bold m-0 text-dark">
                                {profile.businessName || "Your Business"}
                            </h6>
                            <p className="text-muted small m-0 opacity-75">
                                {profile.phone || "Add details in settings"}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white p-3 rounded-4 shadow-sm mb-3 border border-light flex-shrink-0">
                        <div
                            className="bg-primary px-3 py-1 rounded-pill d-inline-block text-white small fw-bold text-uppercase mb-3"
                            style={{ fontSize: "0.65rem" }}
                        >
                            General Info
                        </div>

                        <div className="form-floating mb-3">
                            <input
                                type="text"
                                className="form-control bg-light border-0 fw-bold"
                                value={invoiceNo}
                                onChange={(e) => setInvoiceNo(e.target.value)}
                            />
                            <label>Invoice ID</label>
                        </div>

                        <div className="row g-2">
                            <div className="col-6 form-floating">
                                <input
                                    type="date"
                                    className="form-control bg-light border-0 fw-medium"
                                    value={issueDate}
                                    onChange={(e) => setIssueDate(e.target.value)}
                                />
                                <label>Issue Date</label>
                            </div>

                            <div className="col-6 form-floating">
                                <input
                                    type="date"
                                    className="form-control bg-light border-0 fw-medium"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                                <label>Due Date</label>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-3 rounded-4 shadow-sm mb-3 border border-light flex-shrink-0">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <div
                                className="bg-dark px-3 py-1 rounded-pill text-white small fw-bold text-uppercase"
                                style={{ fontSize: "0.65rem" }}
                            >
                                Client Details
                            </div>

                            <button
                                onClick={() =>
                                    navigate("/clients", {
                                        state: { openCreate: true, returnToInvoice: true },
                                    })
                                }
                                className="btn btn-link p-0 text-primary text-decoration-none fw-bold small"
                            >
                                + New Client
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowClientPopup(true)}
                            className="btn w-100 text-start bg-light border-0 rounded-4 p-3 mt-2 shadow-sm"
                        >
                            {selectedClient ? (
                                <div className="d-flex align-items-center justify-content-between gap-3">
                                    <div className="overflow-hidden">
                                        <div className="fw-bold text-dark text-truncate">
                                            {selectedClient.name}
                                        </div>
                                        <div className="text-muted small text-truncate">
                                            {selectedClient.phone ||
                                                selectedClient.email ||
                                                "Client selected"}
                                        </div>
                                    </div>
                                    <div className="text-primary flex-shrink-0">
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path d="M9 18l6-6-6-6" />
                                        </svg>
                                    </div>
                                </div>
                            ) : (
                                <div className="d-flex align-items-center justify-content-between">
                                    <span className="fw-bold text-muted">Choose a client...</span>
                                    <div className="text-primary">
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path d="M9 18l6-6-6-6" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </button>
                    </div>

                    <div className="bg-white p-3 rounded-4 shadow-sm mb-3 border border-light flex-shrink-0">
                        <div
                            className="bg-secondary px-3 py-1 rounded-pill d-inline-block text-white small fw-bold text-uppercase mb-3"
                            style={{ fontSize: "0.65rem" }}
                        >
                            Items to Bill
                        </div>

                        {invoiceItems.length === 0 ? (
                            <div
                                className="text-center py-4 rounded-4 border-dashed bg-light border"
                                onClick={() => setShowItemPopup(true)}
                            >
                                <span className="small fw-bold text-primary">
                                    + Tap to select items
                                </span>
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-2 mb-3">
                                {invoiceItems.map((item) => (
                                    <div
                                        key={item.uniqueId}
                                        className="p-3 rounded-4 bg-light border shadow-sm d-flex align-items-center justify-content-between gap-3"
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="fw-bold text-dark">{item.name}</div>

                                            <div className="text-muted small mt-1">
                                                {item.serialNo ? `Serial: ${item.serialNo}` : "No serial"}
                                            </div>

                                            <div className="text-muted small d-flex align-items-center gap-1 mt-1 flex-wrap">
                                                <span>{money(item.price)}</span>
                                                <span>×</span>
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm text-center fw-bold p-0 mx-1 border-0 shadow-sm"
                                                    style={{ width: "46px", height: "26px" }}
                                                    value={item.qty}
                                                    onChange={(e) => updateQty(item.uniqueId, e.target.value)}
                                                />
                                                {item.unit ? (
                                                    <span className="text-nowrap">/ {item.unit}</span>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="text-end flex-shrink-0">
                                            <div className="fw-bold text-primary mb-1">
                                                {money((item.price || 0) * (item.qty || 1))}
                                            </div>

                                            <button
                                                onClick={() => removeItem(item.uniqueId)}
                                                className="btn btn-link text-danger p-0 text-decoration-none small fw-bold"
                                                style={{ fontSize: "0.75rem" }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => setShowItemPopup(true)}
                                    className="btn btn-outline-primary btn-sm rounded-pill fw-bold py-2 mt-2 shadow-sm"
                                >
                                    + Add More Items
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-3 rounded-4 shadow-sm mb-3 border border-light flex-shrink-0">
                        <div
                            className="bg-info px-3 py-1 rounded-pill d-inline-block text-white small fw-bold text-uppercase mb-3"
                            style={{ fontSize: "0.65rem" }}
                        >
                            Financial Summary
                        </div>

                        <div className="d-flex justify-content-between mb-2 text-muted fw-bold">
                            <span>Subtotal</span>
                            <span>{money(subtotal)}</span>
                        </div>

                        <div className="d-flex justify-content-between mb-2 text-success fw-bold">
                            <span>Discount ({discountRate}%)</span>
                            <span>- {money(discountAmount)}</span>
                        </div>

                        <div className="d-flex justify-content-between mb-3 text-danger fw-bold">
                            <span>Tax ({taxRate}%)</span>
                            <span>+ {money(taxAmount)}</span>
                        </div>

                        <div className="row g-2 mb-3 pb-3 border-bottom">
                            <div className="col-6 form-floating">
                                <input
                                    type="number"
                                    className="form-control bg-light border-0 fw-bold text-success"
                                    value={discountRate}
                                    onChange={(e) => setDiscountRate(Number(e.target.value))}
                                />
                                <label>Discount %</label>
                            </div>

                            <div className="col-6 form-floating">
                                <input
                                    type="number"
                                    className="form-control bg-light border-0 fw-bold text-danger"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(Number(e.target.value))}
                                />
                                <label>Tax Rate %</label>
                            </div>
                        </div>

                        <div className="bg-primary bg-opacity-10 p-3 rounded-4 d-flex justify-content-between align-items-center">
                            <span className="text-primary fw-bold text-uppercase small">
                                Payable Amount
                            </span>
                            <h3 className="fw-bold text-primary m-0">
                                {money(grandTotal)}
                            </h3>
                        </div>
                    </div>

                    <div className="bg-white p-3 rounded-4 shadow-sm mb-4 border border-light flex-shrink-0">
                        <div className="row g-2 mb-3">
                            <div className="col-6 form-floating">
                                <select
                                    className="form-select bg-light border-0 fw-bold text-dark"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    style={{
                                        color: "#212529",
                                        backgroundColor: "#f8f9fa",
                                        WebkitTextFillColor: "#212529",
                                    }}
                                >
                                    <option value="Cash" style={{ color: "#212529", backgroundColor: "#ffffff" }}>Cash</option>
                                    <option value="Card" style={{ color: "#212529", backgroundColor: "#ffffff" }}>Card</option>
                                    <option value="Bank" style={{ color: "#212529", backgroundColor: "#ffffff" }}>Bank</option>
                                    <option value="UPI" style={{ color: "#212529", backgroundColor: "#ffffff" }}>UPI</option>
                                </select>
                                <label style={{ color: "#495057" }}>Method</label>
                            </div>

                            <div className="col-6 form-floating">
                                <select
                                    className="form-select bg-light border-0 fw-bold text-dark"
                                    value={paymentStatus}
                                    onChange={(e) => setPaymentStatus(e.target.value)}
                                    style={{
                                        color: "#212529",
                                        backgroundColor: "#f8f9fa",
                                        WebkitTextFillColor: "#212529",
                                    }}
                                >
                                    <option value="Unpaid" style={{ color: "#212529", backgroundColor: "#ffffff" }}>Unpaid</option>
                                    <option value="Paid" style={{ color: "#212529", backgroundColor: "#ffffff" }}>Paid</option>
                                    <option value="Pending" style={{ color: "#212529", backgroundColor: "#ffffff" }}>Pending</option>
                                </select>
                                <label style={{ color: "#495057" }}>Status</label>
                            </div>
                        </div>

                        <div className="form-floating">
                            <textarea
                                className="form-control bg-light border-0"
                                style={{ height: "80px" }}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Notes"
                            ></textarea>
                            <label>Internal Notes (Optional)</label>
                        </div>
                    </div>

                    <div
                        className="mt-auto pt-3 flex-shrink-0"
                        style={{
                            paddingBottom: "12px",
                            marginBottom: "calc(45px + env(safe-area-inset-bottom, 0px))",
                        }}
                    >
                        <button
                            className="btn btn-primary w-100 rounded-pill fw-bold shadow-sm d-flex align-items-center justify-content-center"
                            style={{
                                height: "54px",
                                fontSize: "1.1rem",
                                minHeight: "54px",
                            }}
                            onClick={saveInvoice}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <span className="spinner-border spinner-border-sm me-2"></span>
                            ) : null}
                            {isSaving
                                ? "Saving securely..."
                                : isEditMode
                                    ? "Update Invoice"
                                    : "Generate Invoice"}
                        </button>
                    </div>
                </main>

                <div
                    className={`offcanvas offcanvas-bottom ${showClientPopup ? "show" : ""}`}
                    style={{
                        visibility: showClientPopup ? "visible" : "hidden",
                        borderTopLeftRadius: "24px",
                        borderTopRightRadius: "24px",
                        height: "82vh",
                        maxWidth: "768px",
                        margin: "0 auto",
                        zIndex: 10000,
                    }}
                >
                    <header className="p-3 border-bottom d-flex align-items-center justify-content-between bg-white">
                        <button
                            onClick={() => setShowClientPopup(false)}
                            className="btn btn-light btn-sm rounded-pill px-3 fw-bold border text-dark"
                            aria-label="Close client popup"
                        >
                            Close
                        </button>

                        <h6 className="m-0 fw-bold text-dark text-center flex-grow-1">
                            Select Client
                        </h6>

                        <button
                            onClick={() => setShowClientPopup(false)}
                            className="btn btn-primary btn-sm rounded-pill px-4 fw-bold ms-2"
                        >
                            Done
                        </button>
                    </header>

                    <div className="p-3 bg-light border-bottom">
                        <input
                            type="text"
                            className="form-control rounded-pill border-0 shadow-sm ps-4"
                            placeholder="Search clients..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            style={{ height: "48px" }}
                        />
                    </div>

                    <div
                        className="offcanvas-body bg-light p-3 pt-3"
                        style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom, 20px))" }}
                    >
                        <div className="d-flex flex-column gap-3">
                            <div
                                className="bg-white rounded-4 p-3 shadow-sm d-flex justify-content-between align-items-center border"
                                onClick={selectGuestClient}
                            >
                                <div className="overflow-hidden">
                                    <h6 className="fw-bold m-0">Walk-in Customer</h6>
                                    <div className="small text-muted mt-1">
                                        Quick billing without saved client details
                                    </div>
                                </div>

                                <button
                                    className="btn btn-light rounded-circle shadow-sm border-0 text-primary"
                                    style={{ width: "36px", height: "36px" }}
                                >
                                    +
                                </button>
                            </div>

                            {filteredClients.length === 0 ? (
                                <div className="text-center py-5 opacity-50 small fw-bold">
                                    No clients found. Add a client first.
                                </div>
                            ) : (
                                filteredClients.map((c) => (
                                    <div
                                        key={c.id}
                                        className="bg-white rounded-4 p-3 shadow-sm d-flex justify-content-between align-items-center border"
                                        onClick={() => selectClient(c)}
                                    >
                                        <div className="overflow-hidden">
                                            <h6 className="fw-bold m-0 text-truncate">{c.name}</h6>
                                            <div className="small text-muted mt-1 text-truncate">
                                                {c.phone || c.email || c.address || "Saved client"}
                                            </div>
                                        </div>

                                        <button
                                            className="btn btn-light rounded-circle shadow-sm border-0 text-primary"
                                            style={{ width: "36px", height: "36px" }}
                                        >
                                            +
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div
                    className={`offcanvas offcanvas-bottom ${showItemPopup ? "show" : ""}`}
                    style={{
                        visibility: showItemPopup ? "visible" : "hidden",
                        borderTopLeftRadius: "24px",
                        borderTopRightRadius: "24px",
                        height: "85vh",
                        maxWidth: "768px",
                        margin: "0 auto",
                        zIndex: 9999,
                    }}
                >
                    <header className="p-3 border-bottom d-flex align-items-center justify-content-between bg-white">
                        <button
                            onClick={() => setShowItemPopup(false)}
                            className="btn btn-light btn-sm rounded-pill px-3 fw-bold border text-dark"
                            aria-label="Close item popup"
                        >
                            Close
                        </button>

                        <h6 className="m-0 fw-bold text-dark text-center flex-grow-1">
                            Select Billing Items
                        </h6>

                        <button
                            onClick={() => setShowItemPopup(false)}
                            className="btn btn-primary btn-sm rounded-pill px-4 fw-bold ms-2"
                        >
                            Done
                        </button>
                    </header>

                    <div className="p-3 bg-light border-bottom">
                        <input
                            type="text"
                            className="form-control rounded-pill border-0 shadow-sm ps-4"
                            placeholder="Search items..."
                            value={itemSearch}
                            onChange={(e) => setItemSearch(e.target.value)}
                            style={{ height: "48px" }}
                        />
                    </div>

                    <div
                        className="offcanvas-body bg-light p-3 pt-3"
                        style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom, 20px))" }}
                    >
                        {filteredInventory.length === 0 ? (
                            <div className="text-center py-5 opacity-50 small fw-bold">
                                No items found. Add items in inventory first.
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {filteredInventory.map((i) => (
                                    <div
                                        key={i.id}
                                        className="bg-white rounded-4 p-3 shadow-sm d-flex justify-content-between align-items-center border"
                                        onClick={() => addItem(i)}
                                    >
                                        <div className="overflow-hidden">
                                            <h6 className="fw-bold m-0 text-truncate">{i.name}</h6>
                                            <div className="small text-muted mt-1 text-truncate">
                                                Serial: {i.serialNo || "N/A"}
                                            </div>
                                            <span className="text-primary fw-bold small">
                                                {money(i.price)}
                                            </span>
                                        </div>

                                        <button
                                            className="btn btn-light rounded-circle shadow-sm border-0 text-primary"
                                            style={{ width: "36px", height: "36px" }}
                                        >
                                            +
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {(showItemPopup || showClientPopup) && (
                    <div
                        className="offcanvas-backdrop fade show"
                        onClick={() => {
                            setShowItemPopup(false);
                            setShowClientPopup(false);
                        }}
                        style={{ zIndex: 9998, maxWidth: "768px", margin: "0 auto" }}
                    ></div>
                )}
            </div>
        </div>
    );
}