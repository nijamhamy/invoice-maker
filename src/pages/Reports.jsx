import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getData } from "../utils/storage";
import { getSettings } from "../utils/settings";
import { v4 as uuid } from "uuid";
import { StatusBar, Style } from "@capacitor/status-bar";

export default function Reports() {
    const navigate = useNavigate();

    const settings = getSettings();
    const currency = settings.currency || { code: "INR", symbol: "₹" };
    const profile = settings.businessProfile || {};

    const [invoices, setInvoices] = useState([]);
    const [timeRange, setTimeRange] = useState("Daily");
    const [income, setIncome] = useState(0);
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [reportData, setReportData] = useState([]);

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
        const data = getData("invoices") || [];
        setInvoices(data);
    }, []);

    useEffect(() => {
        const now = new Date();
        const paidInvoices = invoices.filter((inv) => inv.paymentStatus === "Paid");
        let total = 0;

        if (timeRange === "Daily") {
            const todayStr = now.toISOString().split("T")[0];
            total = paidInvoices
                .filter((inv) => inv.issueDate === todayStr)
                .reduce((sum, inv) => sum + Number(inv.total || 0), 0);
        } else if (timeRange === "Monthly") {
            const currentMonth = now.toISOString().slice(0, 7);
            total = paidInvoices
                .filter((inv) => inv.issueDate?.startsWith(currentMonth))
                .reduce((sum, inv) => sum + Number(inv.total || 0), 0);
        } else if (timeRange === "Yearly") {
            const currentYear = now.getFullYear().toString();
            total = paidInvoices
                .filter((inv) => inv.issueDate?.startsWith(currentYear))
                .reduce((sum, inv) => sum + Number(inv.total || 0), 0);
        }

        setIncome(total);
    }, [invoices, timeRange]);

    useEffect(() => {
        const filtered = invoices.filter((inv) => inv.issueDate === selectedDate);
        setReportData(filtered);
    }, [selectedDate, invoices]);

    const reportSummary = useMemo(() => {
        const totalInvoices = reportData.length;
        const paidCount = reportData.filter((i) => i.paymentStatus === "Paid").length;
        const unpaidCount = reportData.filter((i) => i.paymentStatus === "Unpaid").length;
        const totalAmount = reportData.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

        return {
            totalInvoices,
            paidCount,
            unpaidCount,
            totalAmount,
        };
    }, [reportData]);

    const downloadReport = () => {
        if (reportData.length === 0) return;

        const reportId = `REP-${uuid()}`;
        const dayTotal = reportData.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

        const reportInvoiceFormat = {
            id: reportId,
            invoiceNo: `REPORT-${selectedDate}`,
            clientName: "Daily Sales Report",
            issueDate: selectedDate,
            dueDate: selectedDate,
            items: reportData.map((inv) => ({
                name: `Inv: ${inv.invoiceNo} - ${inv.clientName}`,
                price: Number(inv.total || 0),
                qty: 1,
            })),
            subtotal: dayTotal,
            total: dayTotal,
            paymentStatus: "Summary",
            isReport: true,
            businessProfile: profile,
            currency,
            sourceInvoices: reportData,
            summary: {
                totalInvoices: reportSummary.totalInvoices,
                paidCount: reportSummary.paidCount,
                unpaidCount: reportSummary.unpaidCount,
                totalAmount: reportSummary.totalAmount,
            },
        };

        navigate(`/invoice/preview/${reportId}`, {
            state: {
                previewInvoice: reportInvoiceFormat,
                isTemporaryReport: true,
            },
        });
    };

    const SummaryCard = ({ title, value, subtitle, tone = "default" }) => {
        const toneStyles = {
            default: { bg: "#ffffff", value: "#111827", badge: "#6b7280" },
            success: { bg: "#ecfdf3", value: "#059669", badge: "#10b981" },
            warning: { bg: "#fff7ed", value: "#ea580c", badge: "#f97316" },
            primary: { bg: "#eff6ff", value: "#2563eb", badge: "#3b82f6" },
        };

        const current = toneStyles[tone] || toneStyles.default;

        return (
            <div className="col-6 col-md-3">
                <div
                    className="card border-0 shadow-sm rounded-4 h-100"
                    style={{ backgroundColor: current.bg }}
                >
                    <div className="card-body p-3">
                        <div className="text-muted small fw-semibold mb-2">{title}</div>
                        <div
                            className="fw-bold"
                            style={{ fontSize: "1.15rem", color: current.value, lineHeight: 1.2 }}
                        >
                            {value}
                        </div>
                        {subtitle && (
                            <div
                                className="small mt-2"
                                style={{ color: current.badge, fontWeight: 600 }}
                            >
                                {subtitle}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            className="d-flex flex-column w-100 h-100 bg-light"
            style={{ overflow: "hidden" }}
        >
            <div
                className="d-flex flex-column mx-auto w-100 h-100 position-relative"
                style={{
                    maxWidth: "768px",
                    overflow: "hidden",
                    backgroundColor: "#f8f9fb",
                }}
            >
                {/* HEADER */}
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
                                width="22"
                                height="22"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                viewBox="0 0 24 24"
                            >
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>

                        <div className="text-center">
                            <h5 className="m-0 fw-bold text-dark" style={{ letterSpacing: "-0.5px" }}>
                                Analytics & Reports
                            </h5>
                            <div className="text-muted small">Track income and generate summaries</div>
                        </div>

                        <div style={{ width: 42 }}></div>
                    </div>
                </header>

                {/* SCROLL AREA */}
                <main
                    className="d-flex flex-column w-100"
                    style={{
                        flex: "1 1 0",
                        overflowY: "auto",
                        overflowX: "hidden",
                        backgroundColor: "#f8f9fb",
                    }}
                >
                    <div className="container py-4">
                        {/* INCOME OVERVIEW */}
                        <h6 className="text-muted small fw-bold text-uppercase ms-1 mb-3">
                            Income Overview
                        </h6>

                        <div className="bg-white p-1 rounded-pill shadow-sm d-flex mb-3 border">
                            {["Daily", "Monthly", "Yearly"].map((range) => (
                                <button
                                    key={range}
                                    className={`btn btn-sm flex-grow-1 rounded-pill fw-bold border-0 ${timeRange === range
                                            ? "bg-primary text-white shadow-sm"
                                            : "text-muted bg-transparent"
                                        }`}
                                    onClick={() => setTimeRange(range)}
                                    style={{ transition: "all 0.2s ease" }}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>

                        <div
                            className="card border-0 shadow rounded-4 text-white mb-4 overflow-hidden"
                            style={{
                                background: "linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)",
                            }}
                        >
                            <div className="card-body p-4 text-center">
                                <div className="opacity-75 small text-uppercase fw-bold mb-2">
                                    {timeRange === "Daily"
                                        ? "Today's Income"
                                        : timeRange === "Monthly"
                                            ? "This Month's Income"
                                            : "This Year's Income"}
                                </div>
                                <h1
                                    className="fw-bold m-0"
                                    style={{
                                        fontSize: "clamp(2rem, 6vw, 3rem)",
                                        letterSpacing: "-1px",
                                    }}
                                >
                                    {currency.symbol}{" "}
                                    {income.toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                    })}
                                </h1>
                            </div>
                        </div>

                        {/* REPORT SECTION */}
                        <h6 className="text-muted small fw-bold text-uppercase ms-1 mb-3">
                            Generate Report
                        </h6>

                        <div className="card border-0 shadow-sm rounded-4 bg-white mb-3">
                            <div className="card-body p-3 p-sm-4">
                                <label className="form-label fw-bold small text-muted">
                                    Select Date
                                </label>

                                <input
                                    type="date"
                                    className="form-control bg-light border-0 fw-bold mb-3 shadow-sm"
                                    style={{ height: "52px" }}
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />

                                <div className="row g-3 mb-3">
                                    <SummaryCard
                                        title="Invoices"
                                        value={reportSummary.totalInvoices}
                                        subtitle="Found"
                                        tone="primary"
                                    />
                                    <SummaryCard
                                        title="Paid"
                                        value={reportSummary.paidCount}
                                        subtitle="Completed"
                                        tone="success"
                                    />
                                    <SummaryCard
                                        title="Unpaid"
                                        value={reportSummary.unpaidCount}
                                        subtitle="Pending"
                                        tone="warning"
                                    />
                                    <SummaryCard
                                        title="Total"
                                        value={`${currency.symbol} ${reportSummary.totalAmount.toLocaleString("en-IN", {
                                            minimumFractionDigits: 2,
                                        })}`}
                                        subtitle="Day amount"
                                        tone="default"
                                    />
                                </div>

                                {reportData.length > 0 ? (
                                    <div className="bg-light rounded-4 p-3 mb-3 border">
                                        <div className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                                            <span className="small text-muted fw-bold">
                                                Invoices Found
                                            </span>
                                            <span className="badge bg-dark rounded-pill">
                                                {reportData.length}
                                            </span>
                                        </div>

                                        <div
                                            className="pe-1"
                                            style={{ maxHeight: "220px", overflowY: "auto" }}
                                        >
                                            {reportData.map((inv) => (
                                                <div
                                                    key={inv.id}
                                                    className="d-flex justify-content-between align-items-center small py-2 border-bottom"
                                                    style={{ borderColor: "rgba(0,0,0,0.06)" }}
                                                >
                                                    <div className="me-3 overflow-hidden">
                                                        <div className="fw-semibold text-dark text-truncate">
                                                            {inv.clientName || "Unknown Client"}
                                                        </div>
                                                        <div className="text-muted text-truncate">
                                                            {inv.invoiceNo}
                                                        </div>
                                                    </div>

                                                    <div className="text-end" style={{ minWidth: "90px" }}>
                                                        <div className="fw-bold text-dark">
                                                            {currency.symbol} {Number(inv.total || 0).toLocaleString("en-IN")}
                                                        </div>
                                                        <div
                                                            className={`small fw-semibold ${inv.paymentStatus === "Paid"
                                                                    ? "text-success"
                                                                    : "text-danger"
                                                                }`}
                                                        >
                                                            {inv.paymentStatus || "Unpaid"}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-muted small py-4 mb-3 border rounded-4 bg-light">
                                        No invoices found for this date.
                                    </div>
                                )}

                                <button
                                    className="btn btn-dark w-100 py-3 rounded-4 fw-bold d-flex align-items-center justify-content-center gap-2"
                                    onClick={downloadReport}
                                    disabled={reportData.length === 0}
                                    style={{
                                        opacity: reportData.length === 0 ? 0.6 : 1,
                                    }}
                                >
                                    <svg
                                        width="20"
                                        height="20"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Preview & Print Report
                                </button>
                            </div>
                        </div>

                        <div style={{ height: "120px", flexShrink: 0 }}></div>
                    </div>
                </main>
            </div>
        </div>
    );
}