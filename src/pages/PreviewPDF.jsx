import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import { Share } from "@capacitor/share";
import { StatusBar, Style } from "@capacitor/status-bar";

import { getData } from "../utils/storage";
import {
    getInvoicePdfBlob,
    getInvoicePdfBase64,
    getInvoicePdfFileName,
} from "../services/pdfService";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PreviewPDF() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [pdfBlob, setPdfBlob] = useState(null);
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState("");
    const [numPages, setNumPages] = useState(0);
    const [pageWidth, setPageWidth] = useState(
        typeof window !== "undefined"
            ? window.innerWidth > 600
                ? 500
                : window.innerWidth * 0.92
            : 500
    );

    const isNativePlatform = useMemo(() => {
        return Capacitor.isNativePlatform();
    }, []);

    useEffect(() => {
        const initStatusBar = async () => {
            try {
                await StatusBar.setStyle({ style: Style.Dark });
                await StatusBar.setBackgroundColor({ color: "#121212" });
                await StatusBar.show();
            } catch (e) {
                console.warn("StatusBar plugin not available or running in web", e);
            }
        };

        initStatusBar();
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setPageWidth(window.innerWidth > 600 ? 500 : window.innerWidth * 0.92);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const invoices = getData("invoices") || [];
        const stateInvoice = location.state?.previewInvoice || null;
        const foundInvoice = stateInvoice || invoices.find((inv) => inv.id === id);

        if (!foundInvoice) {
            window.alert("Invoice not found");
            navigate("/", { replace: true });
            return;
        }

        setInvoice(foundInvoice);
    }, [id, navigate, location.state]);

    useEffect(() => {
        if (!invoice) return;

        let cancelled = false;

        const generatePreview = async () => {
            try {
                setLoading(true);
                setPdfBlob(null);
                setNumPages(0);

                const { blob } = getInvoicePdfBlob(invoice);

                if (!cancelled) {
                    setPdfBlob(blob);
                    setLoading(false);
                }
            } catch (error) {
                console.error("PDF Error:", error);

                if (!cancelled) {
                    setPdfBlob(null);
                    setLoading(false);
                }
            }
        };

        const timer = setTimeout(generatePreview, 250);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [invoice]);

    const browserDownloadFallback = () => {
        if (!pdfBlob || !invoice) return;

        const fileName = getInvoicePdfFileName(invoice);
        const blobUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");

        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    };

    const savePdfToDevice = async () => {
        if (!invoice) return null;

        try {
            const { base64, fileName } = await getInvoicePdfBase64(invoice);

            await Filesystem.writeFile({
                path: fileName,
                data: base64,
                directory: Directory.Cache,
                recursive: true,
            });

            const fileUriResult = await Filesystem.getUri({
                directory: Directory.Cache,
                path: fileName,
            });

            return {
                fileName,
                uri: fileUriResult.uri,
            };
        } catch (error) {
            console.error("Save PDF error:", error);
            return null;
        }
    };

    const handleNativeAction = async (type) => {
        if (!pdfBlob || !invoice || actionLoading) return;

        try {
            setActionLoading(type);

            if (!isNativePlatform) {
                if (type === "download") {
                    browserDownloadFallback();
                    return;
                }

                if (type === "print" || type === "view") {
                    const blobUrl = URL.createObjectURL(pdfBlob);
                    window.open(blobUrl, "_blank");
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
                    return;
                }

                if (type === "share" || type === "whatsapp") {
                    if (navigator.share) {
                        const file = new File([pdfBlob], getInvoicePdfFileName(invoice), {
                            type: "application/pdf",
                        });

                        await navigator.share({
                            title: invoice?.isReport ? "Report PDF" : "Invoice PDF",
                            files: [file],
                        });
                    } else {
                        browserDownloadFallback();
                    }
                    return;
                }
            }

            const saved = await savePdfToDevice();

            if (!saved?.uri) {
                browserDownloadFallback();
                return;
            }

            if (type === "whatsapp") {
                await Share.share({
                    title: getInvoicePdfFileName(invoice),
                    files: [saved.uri],
                    dialogTitle: "Share via WhatsApp",
                });
                return;
            }

            if (type === "share") {
                await Share.share({
                    title: invoice?.isReport ? "Report PDF" : "Invoice PDF",
                    text: invoice?.invoiceNo || "Invoice",
                    files: [saved.uri],
                    dialogTitle: "Share PDF",
                });
                return;
            }

            if (type === "view" || type === "print" || type === "download") {
                await FileOpener.open({
                    filePath: saved.uri,
                    contentType: "application/pdf",
                    openWithDefault: true,
                });
                return;
            }
        } catch (e) {
            console.error("Native action error:", e);
            browserDownloadFallback();
        } finally {
            setActionLoading("");
        }
    };

    const ActionButton = ({ onClick, color, icon, label, actionKey }) => {
        const isBusy = actionLoading === actionKey;

        return (
            <button
                onClick={onClick}
                disabled={!!actionLoading}
                className="btn w-100 p-0 d-flex flex-column align-items-center justify-content-center border-0 shadow-none"
                style={{ background: "transparent", opacity: actionLoading && !isBusy ? 0.55 : 1 }}
            >
                <div
                    className="rounded-circle d-flex align-items-center justify-content-center mb-2 active-scale"
                    style={{
                        width: 56,
                        height: 56,
                        background:
                            color === "whatsapp"
                                ? "#E8F9EE"
                                : color === "primary"
                                    ? "#E6F0FF"
                                    : "#F3F4F6",
                        color:
                            color === "whatsapp"
                                ? "#25D366"
                                : color === "primary"
                                    ? "#0d6efd"
                                    : "#4B5563",
                        transition: "all 0.2s ease",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                    }}
                >
                    {isBusy ? (
                        <span
                            className="spinner-border spinner-border-sm"
                            style={{ width: 20, height: 20 }}
                        ></span>
                    ) : (
                        icon
                    )}
                </div>

                <span
                    className="fw-bold text-dark opacity-75"
                    style={{ fontSize: "11px", letterSpacing: "0.3px" }}
                >
                    {label}
                </span>
            </button>
        );
    };

    return (
        <div
            className="d-flex flex-column"
            style={{
                height: "100dvh",
                width: "100vw",
                overflow: "hidden",
                backgroundColor: "#0a0a0a",
            }}
        >
            <div
                className="d-flex flex-column mx-auto w-100 h-100 position-relative"
                style={{
                    maxWidth: "768px",
                    backgroundColor: "#121212",
                    overflow: "hidden",
                }}
            >
                <header
                    className="px-3 pb-3 d-flex align-items-center justify-content-between bg-dark border-bottom border-secondary border-opacity-25 flex-shrink-0 z-3"
                    style={{
                        paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
                    }}
                >
                    <button
                        onClick={() => navigate(-1)}
                        className="btn btn-dark bg-secondary bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center p-0"
                        style={{ width: 44, height: 44 }}
                    >
                        <svg
                            width="22"
                            height="22"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>

                    <div className="text-center">
                        <h6 className="m-0 fw-bold text-uppercase text-white opacity-75">
                            Preview Invoice
                        </h6>
                        <div className="small text-white opacity-50">
                            {invoice?.invoiceNo || "PDF Preview"}
                        </div>
                    </div>

                    <div style={{ width: 44 }}></div>
                </header>

                <main
                    className="d-flex flex-column align-items-center pt-4 w-100"
                    style={{
                        flex: "1 1 0",
                        overflowY: "auto",
                        overflowX: "hidden",
                    }}
                >
                    {loading ? (
                        <div className="d-flex flex-column align-items-center justify-content-center h-100">
                            <div
                                className="spinner-border text-primary mb-3"
                                style={{ width: "3rem", height: "3rem" }}
                                role="status"
                            ></div>
                            <span className="text-white opacity-50 small fw-bold">
                                Generating PDF...
                            </span>
                        </div>
                    ) : pdfBlob ? (
                        <div className="position-relative" style={{ width: "fit-content", maxWidth: "100%" }}>
                            <Document
                                file={pdfBlob}
                                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                                onLoadError={(error) => console.error("Preview load error:", error)}
                                loading={null}
                                error={
                                    <div className="text-center text-white opacity-75 py-5">
                                        Preview is not available. Please use the buttons below to view, share, print, or save the bill PDF.

                                    </div>
                                }
                            >
                                {Array.from(new Array(numPages || 0), (_, index) => (
                                    <div
                                        key={`page_${index + 1}`}
                                        className="mb-4 pdf-page-container"
                                        style={{
                                            fontSize: 0,
                                            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                                        }}
                                    >
                                        <Page
                                            pageNumber={index + 1}
                                            width={pageWidth}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                            className="bg-white rounded-2 overflow-hidden"
                                            canvasBackground="#FFFFFF"
                                        />
                                    </div>
                                ))}
                            </Document>
                        </div>
                    ) : (
                        <div className="text-center text-white opacity-75 py-5">
                            Failed to generate PDF preview.
                        </div>
                    )}

                    <div
                        style={{
                            height: "calc(185px + env(safe-area-inset-bottom, 20px))",
                            flexShrink: 0,
                            width: "100%",
                        }}
                    ></div>
                </main>

                <div
                    className="w-100 bg-white shadow-lg mt-auto"
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        zIndex: 1050,
                        borderRadius: "28px 28px 0 0",
                        paddingBottom: "calc(10px + env(safe-area-inset-bottom, 15px))",
                    }}
                >
                    <div className="d-flex justify-content-center pt-3 pb-1">
                        <div
                            className="bg-secondary opacity-25 rounded-pill"
                            style={{ width: 48, height: 5 }}
                        ></div>
                    </div>

                    <div className="container px-3 py-3 mb-1">
                        <div className="row g-0">
                            <div className="col-3">
                                <ActionButton
                                    onClick={() => handleNativeAction("whatsapp")}
                                    color="whatsapp"
                                    label="WhatsApp"
                                    actionKey="whatsapp"
                                    icon={
                                        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                        </svg>
                                    }
                                />
                            </div>

                            <div className="col-3">
                                <ActionButton
                                    onClick={() => handleNativeAction("share")}
                                    color="light"
                                    label="Share"
                                    actionKey="share"
                                    icon={
                                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                        </svg>
                                    }
                                />
                            </div>

                            <div className="col-3">
                                <ActionButton
                                    onClick={() => handleNativeAction("print")}
                                    color="light"
                                    label="Print"
                                    actionKey="print"
                                    icon={
                                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                    }
                                />
                            </div>

                            <div className="col-3">
                                <ActionButton
                                    onClick={() => handleNativeAction("download")}
                                    color="primary"
                                    label="Save PDF"
                                    actionKey="download"
                                    icon={
                                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <style>{`
                    .active-scale:active { transform: scale(0.92); }
                    .react-pdf__Page__canvas {
                        background-color: white !important;
                        max-width: 100%;
                        height: auto !important;
                    }
                    .react-pdf__Document {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                `}</style>
            </div>
        </div>
    );
}