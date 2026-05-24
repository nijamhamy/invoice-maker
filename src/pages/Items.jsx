import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";


// Advanced Native Plugins
import { Dialog } from "@capacitor/dialog";
import { Toast } from "@capacitor/toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";


// Utils & Store
import { getSettings } from "../utils/settings";
import { useItemStore } from "../store/useItemStore";


export default function Items() {
    const navigate = useNavigate();
    const location = useLocation();


    const settings = getSettings();
    const currency = settings.currency || { code: "INR", symbol: "₹" };


    const { items, addItem, updateItem, deleteItem: removeItemStore } = useItemStore();


    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");


    const [item, setItem] = useState({
        id: null,
        serialNo: "",
        name: "",
        description: "",
        price: "",
        unit: "",
    });


    const formatAmount = (value) => {
        const amount = Number(value || 0);
        const formatted = new Intl.NumberFormat("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);


        return `${currency.symbol} ${formatted}`;
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
        const backButtonHandler = CapacitorApp.addListener("backButton", () => {
            if (showForm) {
                setShowForm(false);
            } else {
                navigate(-1);
            }
        });


        return () => {
            backButtonHandler.then((h) => h.remove());
        };
    }, [showForm, navigate]);


    useEffect(() => {
        if (location.state?.openCreate) openAddForm();
    }, [location.state]);


    const handleItemClick = async (targetItem) => {
        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch (e) { }
        openEditForm(targetItem);
    };


    const openAddForm = async () => {
        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch (e) { }


        setItem({
            id: null,
            serialNo: "",
            name: "",
            description: "",
            price: "",
            unit: "",
        });
        setShowForm(true);
        setSearchTerm("");
    };


    const openEditForm = (targetItem) => {
        setItem({ ...targetItem });
        setShowForm(true);
        setSearchTerm("");
    };


    const saveItem = async () => {
        try {
            await Haptics.impact({ style: ImpactStyle.Medium });
        } catch (e) { }


        if (!item.name.trim() || !item.price.toString().trim()) {
            await Toast.show({ text: "Name and Price are required!" });
            return;
        }


        const formattedItem = { ...item, price: Number(item.price) };


        if (item.id) {
            updateItem(formattedItem);
        } else {
            addItem(formattedItem);
        }


        await Toast.show({ text: "Product saved successfully!" });


        if (location.state?.returnToInvoice) {
            navigate(-1);
        } else {
            setShowForm(false);
        }
    };


    const deleteSingleItem = async (e, id) => {
        e.stopPropagation();


        try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (e) { }


        const { value } = await Dialog.confirm({
            title: "Delete Product",
            message: "Are you sure you want to remove this product from inventory?",
            okButtonTitle: "Delete",
            cancelButtonTitle: "Cancel",
        });


        if (value) {
            removeItemStore(id);
            await Toast.show({ text: "Product deleted" });
        }
    };


    const filteredItems = items.filter(
        (i) =>
            i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.serialNo &&
                String(i.serialNo).toLowerCase().includes(searchTerm.toLowerCase()))
    );


    const handleBack = () => {
        if (showForm) {
            if (location.state?.returnToInvoice) navigate(-1);
            else setShowForm(false);
        } else {
            navigate(-1);
        }
    };


    return (
        <div
            className="d-flex flex-column w-100 h-100 bg-light"
            style={{ overflow: "hidden" }}
        >
            <div
                className="d-flex flex-column mx-auto w-100 h-100 position-relative bg-white shadow-sm"
                style={{ maxWidth: "768px" }}
            >
                {showForm ? (
                    <>
                        {/* FORM HEADER */}
                        <header className="bg-white border-bottom flex-shrink-0 z-3">
                            <div
                                style={{
                                    height: "env(safe-area-inset-top, 0px)",
                                    backgroundColor: "#ffffff",
                                }}
                            ></div>


                            <div className="p-3 d-flex align-items-center justify-content-between bg-white">
                                <button
                                    onClick={handleBack}
                                    className="btn btn-link text-danger text-decoration-none fw-medium p-0"
                                    style={{ fontSize: "0.95rem" }}
                                >
                                    Cancel
                                </button>


                                <h6 className="m-0 fw-bold" style={{ letterSpacing: "-0.5px" }}>
                                    {item.id ? "Edit Product" : "New Product"}
                                </h6>


                                <button
                                    onClick={saveItem}
                                    className="btn btn-primary fw-bold rounded-pill px-4 shadow-sm py-1"
                                    style={{ fontSize: "0.9rem" }}
                                >
                                    Save
                                </button>
                            </div>
                        </header>


                        <main
                            className="p-4 d-flex flex-column w-100"
                            style={{
                                flex: "1 1 0",
                                overflowY: "auto",
                                overflowX: "hidden",
                                backgroundColor: "#fdfdfd",
                            }}
                        >
                            <div
                                className="bg-light p-3 rounded-4 border border-light shadow-sm mb-4 mx-auto w-100"
                                style={{ maxWidth: "600px" }}
                            >
                                <div className="form-floating mb-3">
                                    <input
                                        className="form-control border-0 bg-transparent fw-bold text-secondary"
                                        name="serialNo"
                                        value={item.serialNo}
                                        onChange={(e) =>
                                            setItem({ ...item, serialNo: e.target.value })
                                        }
                                        placeholder="Serial"
                                        style={{
                                            borderBottom: "1px solid #dee2e6",
                                            borderRadius: 0,
                                        }}
                                    />
                                    <label>Serial Number (Optional)</label>
                                </div>


                                <div className="form-floating mb-3">
                                    <input
                                        className="form-control border-0 bg-transparent fw-bold"
                                        name="name"
                                        value={item.name}
                                        onChange={(e) =>
                                            setItem({ ...item, name: e.target.value })
                                        }
                                        placeholder="Name"
                                        autoFocus
                                        style={{
                                            borderBottom: "1px solid #dee2e6",
                                            borderRadius: 0,
                                            fontSize: "1.1rem",
                                        }}
                                    />
                                    <label>Product / Item Name</label>
                                </div>


                                <div className="row g-0 mb-3 border-bottom pb-2">
                                    <div className="col-7 border-end">
                                        <div className="form-floating position-relative">
                                            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fw-bold">
                                                {currency.symbol}
                                            </span>
                                            <input
                                                type="number"
                                                className="form-control border-0 bg-transparent fw-bold text-success ps-5"
                                                name="price"
                                                value={item.price}
                                                onChange={(e) =>
                                                    setItem({ ...item, price: e.target.value })
                                                }
                                                placeholder="Price"
                                                style={{
                                                    borderRadius: 0,
                                                    fontSize: "1.2rem",
                                                }}
                                            />
                                            <label className="ps-5">Price</label>
                                        </div>
                                    </div>


                                    <div className="col-5">
                                        <div className="form-floating">
                                            <input
                                                className="form-control border-0 bg-transparent"
                                                name="unit"
                                                value={item.unit}
                                                onChange={(e) =>
                                                    setItem({ ...item, unit: e.target.value })
                                                }
                                                placeholder="Unit"
                                                style={{ borderRadius: 0 }}
                                            />
                                            <label className="ps-3">Unit (e.g. Kg)</label>
                                        </div>
                                    </div>
                                </div>


                                <div className="form-floating">
                                    <textarea
                                        className="form-control border-0 bg-transparent"
                                        name="description"
                                        placeholder="Description"
                                        style={{ height: "80px", borderRadius: 0 }}
                                        value={item.description || ""}
                                        onChange={(e) =>
                                            setItem({ ...item, description: e.target.value })
                                        }
                                    />
                                    <label>Description (Optional)</label>
                                </div>
                            </div>


                            <p className="text-center text-muted small px-4">
                                Ensure the price and unit are correct for accurate billing.
                            </p>


                            <div style={{ height: "100px", flexShrink: 0 }}></div>
                        </main>
                    </>
                ) : (
                    <>
                        {/* INVENTORY LIST HEADER */}
                        <header
                            className="bg-white shadow-sm flex-shrink-0 z-3"
                            style={{ paddingTop: "env(safe-area-inset-top)" }}
                        >
                            <div className="px-3 py-3 d-flex align-items-center justify-content-between">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="btn btn-light rounded-circle border-0 d-flex align-items-center justify-content-center shadow-sm"
                                    style={{ width: "42px", height: "42px" }}
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
                                    <h5 className="m-0 fw-bold text-dark" style={{ letterSpacing: "-0.5px" }}>
                                        Inventory
                                    </h5>
                                    <div className="text-muted small">
                                        {items.length} total inventor{items.length !== 1 ? "ies" : "y"}
                                    </div>
                                </div>


                                <div style={{ width: "42px" }}></div>
                            </div>


                            <div className="px-3 pb-3">
                                <div className="position-relative mx-auto" style={{ maxWidth: "600px" }}>
                                    <div className="position-absolute top-50 start-0 translate-middle-y ps-3 text-primary">
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
                                        className="form-control border-0 rounded-4 ps-5 shadow-sm bg-light"
                                        placeholder="Search by name or serial..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{ height: "48px", fontSize: "0.95rem" }}
                                    />
                                </div>
                            </div>
                        </header>


                        <main
                            className="p-3 d-flex flex-column w-100"
                            style={{
                                flex: "1 1 0",
                                overflowY: "auto",
                                overflowX: "hidden",
                                backgroundColor: "#f8f9fa",
                            }}
                        >
                            {items.length === 0 ? (
                                <div className="text-center py-5 mt-5">
                                    <div className="mb-4 d-inline-block p-4 rounded-circle bg-white shadow-sm border opacity-75">
                                        <svg
                                            width="64"
                                            height="64"
                                            fill="none"
                                            stroke="#adb5bd"
                                            strokeWidth="1"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                    </div>
                                    <h6 className="fw-bold text-dark mb-1">Your Inventory is Empty</h6>
                                    <p className="text-muted px-5 small">
                                        Tap the plus button below to add products and start managing your stock.
                                    </p>
                                </div>
                            ) : (
                                <div className="row g-3 mx-auto w-100" style={{ maxWidth: "700px" }}>
                                    {filteredItems.map((i) => (
                                        <div key={i.id} className="col-12 col-md-6">
                                            <div
                                                className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white h-100"
                                                onClick={() => handleItemClick(i)}
                                                style={{
                                                    cursor: "pointer",
                                                    transition: "transform 0.1s",
                                                }}
                                            >
                                                <div
                                                    className="card-body p-3 d-flex align-items-start gap-3"
                                                    style={{ minWidth: 0 }}
                                                >
                                                    <div
                                                        className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center fw-bold shadow-sm"
                                                        style={{
                                                            minWidth: "52px",
                                                            width: "52px",
                                                            height: "52px",
                                                            fontSize: "1rem",
                                                            border: "1px solid #fff",
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {i.name ? i.name.charAt(0).toUpperCase() : "#"}
                                                    </div>


                                                    <div
                                                        className="flex-grow-1 overflow-hidden"
                                                        style={{ minWidth: 0 }}
                                                    >
                                                        <h6
                                                            className="fw-bold text-dark mb-1 text-truncate"
                                                            style={{ fontSize: "1.05rem" }}
                                                        >
                                                            {i.name}
                                                        </h6>


                                                        <div className="text-muted small text-truncate mb-1">
                                                            {i.serialNo ? `SN: ${i.serialNo}` : "No serial number"}
                                                        </div>


                                                        <div
                                                            className="d-flex align-items-baseline gap-1 flex-nowrap overflow-hidden"
                                                            style={{ minWidth: 0 }}
                                                        >
                                                            <span
                                                                className="fw-bold text-success text-nowrap"
                                                                style={{
                                                                    fontSize: "1.08rem",
                                                                    lineHeight: 1.2,
                                                                }}
                                                            >
                                                                {formatAmount(i.price)}
                                                            </span>


                                                            {i.unit && (
                                                                <span
                                                                    className="text-muted small text-nowrap"
                                                                    style={{
                                                                        fontSize: "0.82rem",
                                                                        fontWeight: 600,
                                                                    }}
                                                                >
                                                                    / {i.unit}
                                                                </span>
                                                            )}
                                                        </div>


                                                        {i.description && (
                                                            <div className="text-muted small text-truncate mt-1">
                                                                {i.description}
                                                            </div>
                                                        )}
                                                    </div>


                                                    <button
                                                        onClick={(e) => deleteSingleItem(e, i.id)}
                                                        className="btn btn-link text-danger opacity-50 border-0 p-2 text-decoration-none"
                                                        style={{ zIndex: 2, flexShrink: 0 }}
                                                    >
                                                        <svg
                                                            width="22"
                                                            height="22"
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
                                        </div>
                                    ))}
                                </div>
                            )}


                            <div style={{ height: "130px", flexShrink: 0 }}></div>
                        </main>


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
                                boxShadow: "0 8px 24px rgba(13, 110, 253, 0.4)",
                            }}
                            onClick={openAddForm}
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