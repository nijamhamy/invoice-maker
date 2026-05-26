import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

// Advanced Native Plugins
import { Dialog } from "@capacitor/dialog";
import { Toast } from "@capacitor/toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

// Global Store
import { useClientStore } from "../store/useClientStore";

export default function Clients() {
    const navigate = useNavigate();
    const location = useLocation();

    const { clients, addClient, updateClient, deleteClient: removeClientStore } =
        useClientStore();

    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDark, setIsDark] = useState(false);

    const [client, setClient] = useState({
        id: null,
        name: "",
        address: "",
        email: "",
        phone: "",
    });

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
        if (location.state?.openCreate) {
            openAddForm();
        }
    }, [location.state]);

    const handleChange = (e) => {
        setClient({ ...client, [e.target.name]: e.target.value });
    };

    const openAddForm = async () => {
        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch (e) { }
        setClient({ id: null, name: "", address: "", email: "", phone: "" });
        setShowForm(true);
        setSearchTerm("");
    };

    const openEditForm = async (targetClient) => {
        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch (e) { }
        setClient({ ...targetClient });
        setShowForm(true);
        setSearchTerm("");
    };

    const saveClient = async () => {
        try {
            await Haptics.impact({ style: ImpactStyle.Medium });
        } catch (e) { }

        if (!client.name.trim()) {
            await Toast.show({ text: "Client Name is required!" });
            return;
        }

        if (client.id) {
            updateClient(client);
        } else {
            addClient(client);
        }

        await Toast.show({ text: "Client saved successfully!" });

        if (location.state?.returnToInvoice) {
            navigate(-1);
        } else {
            setShowForm(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();

        try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (e) { }

        const { value } = await Dialog.confirm({
            title: "Delete Client",
            message: "Are you sure you want to delete this client? This cannot be undone.",
            okButtonTitle: "Delete",
            cancelButtonTitle: "Cancel",
        });

        if (value) {
            removeClientStore(id);
            await Toast.show({ text: "Client deleted" });
        }
    };

    const filteredClients = clients.filter(
        (c) =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.phone && c.phone.includes(searchTerm))
    );

    const getInitials = (name) => (name ? name.charAt(0).toUpperCase() : "?");

    const handleBack = () => {
        if (showForm) {
            if (location.state?.returnToInvoice) navigate(-1);
            else setShowForm(false);
        } else {
            navigate(-1);
        }
    };

    const colors = {
        pageBg: isDark ? "#121212" : "#f8f9fb",
        shellBg: isDark ? "#121212" : "#ffffff",
        headerBg: isDark ? "#1e1e1e" : "#ffffff",
        contentBg: isDark ? "#181818" : "#f8f9fa",
        formBg: isDark ? "#121212" : "#ffffff",
        cardBg: isDark ? "#1e1e1e" : "#ffffff",
        softBg: isDark ? "#2a2a2a" : "#f8f9fa",
        softBlueBg: isDark ? "#1c2b45" : "#f0f4ff",
        avatarBg: isDark ? "#2a2a2a" : "#f8f9fa",
        textMain: isDark ? "#ffffff" : "#212529",
        textDark: isDark ? "#ffffff" : "#212529",
        textMuted: isDark ? "#adb5bd" : "#6c757d",
        border: isDark ? "rgba(255,255,255,0.08)" : "#dee2e6",
        lightBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        inputBorder: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #dee2e6",
        formCardBg: isDark ? "#1e1e1e" : "#f8f9fa",
        formInputBg: isDark ? "#1e1e1e" : "transparent",
        formLabel: isDark ? "#adb5bd" : "#6c757d",
        btnLightBg: isDark ? "#2a2a2a" : "#f8f9fa",
        btnLightText: isDark ? "#ffffff" : "#212529",
        emptyIconBg: isDark ? "#1e1e1e" : "#ffffff",
        emptyIconStroke: isDark ? "#adb5bd" : "#6c757d",
        fabShadow: isDark
            ? "0 8px 24px rgba(13, 110, 253, 0.45)"
            : "0 8px 24px rgba(13, 110, 253, 0.35)",
    };

    return (
        <div
            className="d-flex flex-column w-100 h-100"
            data-theme={isDark ? "dark" : "light"}
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
                    backgroundColor: colors.shellBg,
                    boxShadow: isDark ? "none" : "0 0 24px rgba(0,0,0,0.04)",
                    overflow: "hidden",
                }}
            >
                {showForm ? (
                    <>
                        <header
                            className="border-bottom flex-shrink-0 z-3"
                            style={{
                                backgroundColor: colors.headerBg,
                                borderColor: colors.lightBorder,
                            }}
                        >
                            <div
                                style={{
                                    height: "env(safe-area-inset-top, 0px)",
                                    backgroundColor: colors.headerBg,
                                }}
                            ></div>

                            <div
                                className="p-3 d-flex align-items-center justify-content-between"
                                style={{ backgroundColor: colors.headerBg }}
                            >
                                <button
                                    onClick={handleBack}
                                    className="btn btn-link text-danger text-decoration-none fw-semibold p-0"
                                    style={{ fontSize: "0.95rem" }}
                                >
                                    Cancel
                                </button>

                                <h6
                                    className="m-0 fw-bold"
                                    style={{ letterSpacing: "-0.4px", color: colors.textDark }}
                                >
                                    {client.id ? "Edit Details" : "New Client"}
                                </h6>

                                <button
                                    onClick={saveClient}
                                    className="btn btn-primary fw-bold rounded-pill px-4 shadow-sm"
                                    style={{ fontSize: "0.9rem" }}
                                >
                                    Save
                                </button>
                            </div>
                        </header>

                        <main
                            className="d-flex flex-column w-100"
                            style={{
                                flex: "1 1 0",
                                overflowY: "auto",
                                overflowX: "hidden",
                                backgroundColor: colors.formBg,
                            }}
                        >
                            <div className="container py-4">
                                <div className="text-center mb-4">
                                    <div
                                        className="mx-auto rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold border shadow-sm"
                                        style={{
                                            width: "84px",
                                            height: "84px",
                                            fontSize: "2rem",
                                            backgroundColor: colors.avatarBg,
                                            borderColor: colors.lightBorder,
                                        }}
                                    >
                                        {getInitials(client.name)}
                                    </div>
                                    <p
                                        className="small mt-2 mb-0"
                                        style={{ color: colors.textMuted }}
                                    >
                                        Client Identity
                                    </p>
                                </div>

                                <div
                                    className="p-3 p-sm-4 rounded-4 shadow-sm mb-4 mx-auto"
                                    style={{
                                        maxWidth: "600px",
                                        backgroundColor: colors.formCardBg,
                                        border: `1px solid ${colors.lightBorder}`,
                                    }}
                                >
                                    <div className="form-floating mb-3">
                                        <input
                                            className="form-control border-0"
                                            id="cName"
                                            name="name"
                                            placeholder="Name"
                                            value={client.name}
                                            onChange={handleChange}
                                            autoFocus
                                            style={{
                                                borderBottom: colors.inputBorder,
                                                borderRadius: 0,
                                                backgroundColor: colors.formInputBg,
                                                color: colors.textMain,
                                            }}
                                        />
                                        <label htmlFor="cName" style={{ color: colors.formLabel }}>
                                            Client / Business Name
                                        </label>
                                    </div>

                                    <div className="row g-2 mb-3">
                                        <div className="col-12 col-sm-6">
                                            <div className="form-floating">
                                                <input
                                                    type="tel"
                                                    className="form-control border-0"
                                                    id="cPhone"
                                                    name="phone"
                                                    placeholder="Phone"
                                                    value={client.phone}
                                                    onChange={handleChange}
                                                    style={{
                                                        borderRadius: 0,
                                                        borderBottom: colors.inputBorder,
                                                        backgroundColor: colors.formInputBg,
                                                        color: colors.textMain,
                                                    }}
                                                />
                                                <label htmlFor="cPhone" style={{ color: colors.formLabel }}>
                                                    Phone Number
                                                </label>
                                            </div>
                                        </div>

                                        <div className="col-12 col-sm-6">
                                            <div className="form-floating">
                                                <input
                                                    type="email"
                                                    className="form-control border-0"
                                                    id="cEmail"
                                                    name="email"
                                                    placeholder="Email"
                                                    value={client.email}
                                                    onChange={handleChange}
                                                    style={{
                                                        borderRadius: 0,
                                                        borderBottom: colors.inputBorder,
                                                        backgroundColor: colors.formInputBg,
                                                        color: colors.textMain,
                                                    }}
                                                />
                                                <label htmlFor="cEmail" style={{ color: colors.formLabel }}>
                                                    Email Address
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-floating">
                                        <textarea
                                            className="form-control border-0"
                                            id="cAddress"
                                            name="address"
                                            placeholder="Address"
                                            style={{
                                                height: "100px",
                                                borderRadius: 0,
                                                backgroundColor: colors.formInputBg,
                                                color: colors.textMain,
                                            }}
                                            value={client.address}
                                            onChange={handleChange}
                                        />
                                        <label htmlFor="cAddress" style={{ color: colors.formLabel }}>
                                            Full Billing Address
                                        </label>
                                    </div>
                                </div>

                                <div className="text-center px-4">
                                    <p
                                        className="small mb-0"
                                        style={{ color: colors.textMuted }}
                                    >
                                        Add complete client details for faster and more professional invoice creation.
                                    </p>
                                </div>

                                <div style={{ height: "110px", flexShrink: 0 }}></div>
                            </div>
                        </main>
                    </>
                ) : (
                    <>
                        <header
                            className="shadow-sm flex-shrink-0 z-3"
                            style={{
                                paddingTop: "env(safe-area-inset-top)",
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
                                        width="20"
                                        height="20"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M15 18l-6-6 6-6" />
                                    </svg>
                                </button>

                                <div className="text-center">
                                    <h5
                                        className="m-0 fw-bold"
                                        style={{ letterSpacing: "-0.5px", color: colors.textDark }}
                                    >
                                        My Clients
                                    </h5>
                                    <div className="small" style={{ color: colors.textMuted }}>
                                        {clients.length} saved client{clients.length !== 1 ? "s" : ""}
                                    </div>
                                </div>

                                <div style={{ width: "42px" }}></div>
                            </div>

                            <div className="px-3 pb-3">
                                <div className="position-relative mx-auto" style={{ maxWidth: "600px" }}>
                                    <div
                                        className="position-absolute top-50 start-0 translate-middle-y ps-3 text-primary"
                                    >
                                        <svg
                                            width="18"
                                            height="18"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>

                                    <input
                                        type="text"
                                        className="form-control border-0 rounded-4 ps-5 shadow-sm"
                                        placeholder="Search by name or phone..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            height: "48px",
                                            fontSize: "0.95rem",
                                            backgroundColor: colors.softBg,
                                            color: colors.textMain,
                                        }}
                                    />
                                </div>
                            </div>
                        </header>

                        <main
                            className="d-flex flex-column w-100"
                            style={{
                                flex: "1 1 0",
                                overflowY: "auto",
                                overflowX: "hidden",
                                backgroundColor: colors.contentBg,
                            }}
                        >
                            <div className="container py-3">
                                {filteredClients.length === 0 ? (
                                    <div className="text-center py-5 mt-4">
                                        <div
                                            className="mb-4 d-inline-block p-4 rounded-circle shadow-sm border opacity-75"
                                            style={{
                                                backgroundColor: colors.emptyIconBg,
                                                borderColor: colors.lightBorder,
                                            }}
                                        >
                                            <svg
                                                width="64"
                                                height="64"
                                                fill="none"
                                                stroke={colors.emptyIconStroke}
                                                strokeWidth="1"
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>

                                        <h6 className="fw-bold mb-1" style={{ color: colors.textDark }}>
                                            {clients.length === 0 ? "Your Client List is Empty" : "No Matching Clients"}
                                        </h6>

                                        <p
                                            className="px-4 small mb-0"
                                            style={{ color: colors.textMuted }}
                                        >
                                            {clients.length === 0
                                                ? "Tap the plus button below to add your first client."
                                                : "Try another search term or add a new client."}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="row g-3 mx-auto w-100" style={{ maxWidth: "700px" }}>
                                        {filteredClients.map((c) => (
                                            <div key={c.id} className="col-12 col-md-6">
                                                <div
                                                    className="card border-0 shadow-sm rounded-4 overflow-hidden h-100"
                                                    onClick={() => openEditForm(c)}
                                                    style={{
                                                        cursor: "pointer",
                                                        transition: "transform 0.15s ease, box-shadow 0.15s ease",
                                                        backgroundColor: colors.cardBg,
                                                    }}
                                                >
                                                    <div className="card-body p-3">
                                                        <div className="d-flex align-items-start justify-content-between mb-3">
                                                            <div className="d-flex align-items-center gap-3 w-100 overflow-hidden">
                                                                <div
                                                                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold shadow-sm"
                                                                    style={{
                                                                        width: "52px",
                                                                        height: "52px",
                                                                        minWidth: "52px",
                                                                        fontSize: "1.2rem",
                                                                        border: isDark
                                                                            ? "3px solid rgba(255,255,255,0.12)"
                                                                            : "3px solid #fff",
                                                                    }}
                                                                >
                                                                    {getInitials(c.name)}
                                                                </div>

                                                                <div className="text-truncate w-100">
                                                                    <h6
                                                                        className="fw-bold mb-1 text-truncate"
                                                                        style={{
                                                                            fontSize: "1.05rem",
                                                                            color: colors.textDark,
                                                                        }}
                                                                    >
                                                                        {c.name}
                                                                    </h6>

                                                                    <div className="d-flex flex-column gap-1">
                                                                        <span
                                                                            className="small d-flex align-items-center gap-1 text-truncate"
                                                                            style={{ color: colors.textMuted }}
                                                                        >
                                                                            <svg
                                                                                width="12"
                                                                                height="12"
                                                                                fill="none"
                                                                                stroke="currentColor"
                                                                                viewBox="0 0 24 24"
                                                                                style={{ flexShrink: 0 }}
                                                                            >
                                                                                <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                            </svg>
                                                                            {c.phone || "No phone"}
                                                                        </span>

                                                                        <span
                                                                            className="small d-flex align-items-center gap-1 text-truncate"
                                                                            style={{ color: colors.textMuted }}
                                                                        >
                                                                            <svg
                                                                                width="12"
                                                                                height="12"
                                                                                fill="none"
                                                                                stroke="currentColor"
                                                                                viewBox="0 0 24 24"
                                                                                style={{ flexShrink: 0 }}
                                                                            >
                                                                                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                            </svg>
                                                                            {c.email || "No email"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={(e) => handleDelete(e, c.id)}
                                                                className="btn btn-sm text-danger opacity-50 border-0 p-2 ms-2"
                                                                style={{ zIndex: 2 }}
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

                                                        {c.address && (
                                                            <div
                                                                className="small mb-3 text-truncate"
                                                                style={{ color: colors.textMuted }}
                                                            >
                                                                {c.address}
                                                            </div>
                                                        )}

                                                        <div
                                                            className="d-flex gap-2 pt-2 border-top"
                                                            style={{ borderColor: colors.lightBorder }}
                                                        >
                                                            <a
                                                                href={c.phone ? `tel:${c.phone}` : "#"}
                                                                onClick={(e) => {
                                                                    if (!c.phone) e.preventDefault();
                                                                    e.stopPropagation();
                                                                }}
                                                                className="btn flex-grow-1 py-2 rounded-3 border-0 d-flex align-items-center justify-content-center gap-2 text-primary fw-bold"
                                                                style={{
                                                                    fontSize: "0.8rem",
                                                                    backgroundColor: colors.softBlueBg,
                                                                    opacity: c.phone ? 1 : 0.6,
                                                                }}
                                                            >
                                                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                </svg>
                                                                Call
                                                            </a>

                                                            <a
                                                                href={c.email ? `mailto:${c.email}` : "#"}
                                                                onClick={(e) => {
                                                                    if (!c.email) e.preventDefault();
                                                                    e.stopPropagation();
                                                                }}
                                                                className="btn flex-grow-1 py-2 rounded-3 border-0 d-flex align-items-center justify-content-center gap-2 text-primary fw-bold"
                                                                style={{
                                                                    fontSize: "0.8rem",
                                                                    backgroundColor: colors.softBlueBg,
                                                                    opacity: c.email ? 1 : 0.6,
                                                                }}
                                                            >
                                                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                </svg>
                                                                Email
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ height: "130px", flexShrink: 0 }}></div>
                            </div>
                        </main>

                        <button
                            className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center"
                            style={{
                                position: "absolute",
                                right: "20px",
                                bottom: "20px",
                                width: "60px",
                                height: "60px",
                                zIndex: 1050,
                                border: "none",
                                boxShadow: colors.fabShadow,
                            }}
                            onClick={openAddForm}
                            aria-label="Add client"
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
                    </>
                )}
            </div>
        </div>
    );
}