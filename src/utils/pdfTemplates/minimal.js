import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const minimalTemplate = (
    doc,
    invoice = {},
    profile = {},
    client = {},
    currency = { symbol: "₹", code: "INR" }
) => {
    /* ================= COLORS ================= */
    const primary = [0, 150, 136];
    const primaryDark = [0, 121, 107];
    const primarySoft = [232, 247, 245];
    const pageBg = [246, 248, 250];
    const cardBg = [255, 255, 255];
    const text = [22, 28, 36];
    const muted = [95, 105, 115];
    const line = [225, 230, 235];
    const darkHeader = [24, 36, 48];
    const paidRed = [198, 40, 40];
    const white = [255, 255, 255];

    /* ================= PAGE ================= */
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const SERIAL_LENGTH = 13;

    const resolvedProfile =
        profile?.businessProfile && typeof profile.businessProfile === "object"
            ? { ...profile, ...profile.businessProfile }
            : profile || {};

    /* ================= HELPERS ================= */
    const safe = (v, fallback = "") => {
        if (v == null || v === "undefined") return fallback;
        return String(v).trim() || fallback;
    };

    const num = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    const formatSerialNumber = (value, fallbackIndex = 1) => {
        const rawValue = value ?? fallbackIndex;
        let cleaned = safe(rawValue, String(fallbackIndex))
            .replace(/\s+/g, "")
            .toUpperCase();

        if (!cleaned) cleaned = String(fallbackIndex);

        if (cleaned.length > SERIAL_LENGTH) {
            cleaned = cleaned.slice(-SERIAL_LENGTH);
        }

        return cleaned.padStart(SERIAL_LENGTH, "0");
    };

    const money = (v) =>
        `${currency?.code || "INR"} ${num(v).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

    const formatDate = (value) => {
        if (!value) return "-";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return safe(value, "-");
        return d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const splitMultiline = (value) =>
        safe(value)
            .split(/\r?\n|,/)
            .map((lineText) => lineText.trim())
            .filter(Boolean);

    const getPaidAmount = (invoiceData = {}) => {
        if (Array.isArray(invoiceData?.payments) && invoiceData.payments.length) {
            const totalPaid = invoiceData.payments.reduce((sum, payment) => {
                return (
                    sum +
                    num(
                        payment?.amount ??
                        payment?.paidAmount ??
                        payment?.receivedAmount ??
                        0
                    )
                );
            }, 0);

            if (totalPaid > 0) return totalPaid;
        }

        return num(
            invoiceData?.paid ??
            invoiceData?.amountPaid ??
            invoiceData?.paymentReceived ??
            invoiceData?.receivedAmount ??
            invoiceData?.paidAmount ??
            0
        );
    };

    const getBusinessLines = (profileData = {}) => {
        const lines = [];
        if (profileData?.businessName) lines.push(profileData.businessName);
        if (profileData?.ownerName) lines.push(profileData.ownerName);
        if (profileData?.address) lines.push(...splitMultiline(profileData.address));
        if (profileData?.city || profileData?.state || profileData?.zip) {
            lines.push(
                [profileData.city, profileData.state, profileData.zip]
                    .filter(Boolean)
                    .join(", ")
            );
        }
        if (profileData?.country) lines.push(profileData.country);
        if (profileData?.phone) lines.push(`Phone: ${profileData.phone}`);
        if (profileData?.email) lines.push(`Email: ${profileData.email}`);
        if (profileData?.website) lines.push(profileData.website);
        if (profileData?.gst || profileData?.vat || profileData?.taxNo) {
            lines.push(
                `Tax ID: ${profileData.gst || profileData.vat || profileData.taxNo}`
            );
        }
        return lines;
    };

    const getClientLines = (clientData = {}) => {
        const lines = [];
        if (clientData?.name) lines.push(clientData.name);
        if (clientData?.company) lines.push(clientData.company);
        if (clientData?.address) lines.push(...splitMultiline(clientData.address));
        if (clientData?.city || clientData?.state || clientData?.zip) {
            lines.push(
                [clientData.city, clientData.state, clientData.zip]
                    .filter(Boolean)
                    .join(", ")
            );
        }
        if (clientData?.country) lines.push(clientData.country);
        if (clientData?.phone) lines.push(`Phone: ${clientData.phone}`);
        if (clientData?.email) lines.push(`Email: ${clientData.email}`);
        if (clientData?.gst || clientData?.vat || clientData?.taxNo) {
            lines.push(`Tax ID: ${clientData.gst || clientData.vat || clientData.taxNo}`);
        }
        return lines.length ? lines : ["Walk-in Customer"];
    };

    const getPaymentLines = () => {
        const bank = invoice?.bankDetails || resolvedProfile?.bankDetails || {};
        const lines = [];
        if (invoice?.paymentMode) lines.push(`Payment Method: ${invoice.paymentMode}`);
        if (bank?.bankName) lines.push(`Bank: ${bank.bankName}`);
        if (bank?.accountName) lines.push(`A/C Name: ${bank.accountName}`);
        if (bank?.accountNumber) lines.push(`A/C No: ${bank.accountNumber}`);
        if (bank?.ifsc) lines.push(`IFSC: ${bank.ifsc}`);
        if (bank?.iban) lines.push(`IBAN: ${bank.iban}`);
        if (bank?.swift) lines.push(`SWIFT: ${bank.swift}`);
        if (bank?.branch) lines.push(`Branch: ${bank.branch}`);
        if (invoice?.upiId || bank?.upiId) {
            lines.push(`UPI: ${invoice?.upiId || bank?.upiId}`);
        }
        return lines;
    };

    const getItems = () => {
        if (Array.isArray(invoice?.items) && invoice.items.length) return invoice.items;
        if (Array.isArray(invoice?.products) && invoice.products.length) return invoice.products;
        return [];
    };

    const normalizeItem = (item = {}, index = 0) => {
        const qty = num(item.qty ?? item.quantity ?? 1);
        const rate = num(item.rate ?? item.price ?? item.unitPrice ?? 0);
        const amount = num(item.amount ?? item.total ?? qty * rate);

        return {
            no: formatSerialNumber(
                item.serialNo ?? item.serialNumber ?? item.sku ?? item.code ?? item.id,
                index + 1
            ),
            name: safe(item.name || item.title || item.description, `Item ${index + 1}`),
            details: safe(item.details || item.note || item.subtitle, ""),
            qty,
            rate,
            amount,
            unit: safe(item.unit, ""),
        };
    };

    const getTotals = () => {
        const items = getItems().map(normalizeItem);
        const itemsSubtotal = items.reduce((sum, item) => sum + num(item.amount), 0);

        const subtotal = num(invoice?.subtotal ?? itemsSubtotal);
        const discountAmount = num(invoice?.discount ?? invoice?.discountAmount ?? 0);
        const shippingAmount = num(invoice?.shipping ?? invoice?.shippingAmount ?? 0);
        const taxAmount = num(invoice?.tax ?? invoice?.taxAmount ?? invoice?.gstAmount ?? 0);
        const total = num(
            invoice?.total ??
            invoice?.grandTotal ??
            invoice?.finalAmount ??
            subtotal - discountAmount + shippingAmount + taxAmount
        );
        const paid = getPaidAmount(invoice);
        const balance = Math.max(total - paid, 0);

        return {
            subtotal,
            discountAmount,
            shippingAmount,
            taxAmount,
            total,
            paid,
            balance,
            items,
        };
    };

    const drawSectionTitle = (title, x, y, width) => {
        doc.setFillColor(...primarySoft);
        doc.roundedRect(x, y - 6, width, 10, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...primaryDark);
        doc.text(title.toUpperCase(), x + 4, y);
    };

    const drawLabelValue = (label, value, x, y, valueX) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...muted);
        doc.text(label, x, y);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...text);
        doc.text(safe(value, "-"), valueX, y);
    };

    const drawMultilineBlock = (lines, x, y, maxWidth, lineGap = 5.2) => {
        let currentY = y;

        lines.forEach((lineText, index) => {
            const textLines = doc.splitTextToSize(safe(lineText), maxWidth);
            doc.setFont("helvetica", index === 0 ? "bold" : "normal");
            doc.setFontSize(index === 0 ? 11.2 : 9.8);
            doc.setTextColor(...(index === 0 ? text : muted));

            textLines.forEach((part) => {
                doc.text(part, x, currentY);
                currentY += lineGap;
            });
        });

        return currentY;
    };

    const drawPaidStamp = (x, y, width = 54, height = 20) => {
        doc.setDrawColor(...paidRed);
        doc.setTextColor(...paidRed);
        doc.setLineWidth(1.2);
        doc.roundedRect(x, y, width, height, 3, 3, "S");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("PAID", x + width / 2, y + 13, { align: "center" });
    };

    const drawTotalsBox = (totals, x, y, width = 70) => {
        const rows = [
            ["Subtotal", money(totals.subtotal)],
            ...(totals.discountAmount
                ? [["Discount", `- ${money(totals.discountAmount)}`]]
                : []),
            ...(totals.shippingAmount
                ? [["Shipping", money(totals.shippingAmount)]]
                : []),
            ...(totals.taxAmount ? [["Tax", money(totals.taxAmount)]] : []),
            ...(totals.paid ? [["Paid", `- ${money(totals.paid)}`]] : []),
        ];

        const boxHeight = rows.length * 8 + 18;

        doc.setFillColor(250, 251, 252);
        doc.setDrawColor(...line);
        doc.roundedRect(x, y, width, boxHeight, 3, 3, "FD");

        let currentY = y + 8;

        rows.forEach(([label, value]) => {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(...muted);
            doc.text(label, x + 4, currentY);

            doc.setFont("helvetica", "bold");
            doc.setTextColor(...text);
            doc.text(value, x + width - 4, currentY, { align: "right" });
            currentY += 8;
        });

        doc.setDrawColor(...line);
        doc.line(x + 4, currentY - 2, x + width - 4, currentY - 2);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12.5);
        doc.setTextColor(...text);
        doc.text("Total Amount", x + 4, currentY + 6);

        doc.setFontSize(14);
        doc.setTextColor(...primaryDark);
        doc.text(money(totals.total), x + width - 4, currentY + 6, { align: "right" });

        return y + boxHeight;
    };

    const totals = getTotals();
    const invoiceStatus = (() => {
        const rawStatus = safe(invoice?.status || invoice?.paymentStatus).toLowerCase();
        if (totals.total > 0 && totals.balance <= 0) return "Paid";
        if (totals.paid > 0 && totals.balance > 0) return "Partially Paid";
        if (rawStatus === "paid") return "Paid";
        if (rawStatus === "partially paid" || rawStatus === "partial") return "Partially Paid";
        if (rawStatus === "overdue") return "Overdue";
        if (rawStatus === "cancelled") return "Cancelled";
        if (rawStatus === "void") return "Void";
        return "Unpaid";
    })();

    const businessLines = getBusinessLines(resolvedProfile);
    const customer =
        client && Object.keys(client).length
            ? client
            : invoice?.clientDetails || invoice?.customer || {};
    const clientLines = getClientLines(customer);
    const paymentLines = getPaymentLines();

    /* ================= PAGE BACKGROUND ================= */
    doc.setFillColor(...pageBg);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    doc.setFillColor(...cardBg);
    doc.roundedRect(margin, 10, pageWidth - margin * 2, pageHeight - 20, 4, 4, "F");

    doc.setDrawColor(...line);
    doc.setLineWidth(0.5);
    doc.line(margin, 34, pageWidth - margin, 34);

    /* ================= HEADER ================= */
    if (resolvedProfile?.logo) {
        try {
            doc.addImage(resolvedProfile.logo, "PNG", margin, 14, 28, 14, undefined, "FAST");
        } catch { }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(...text);
    doc.text(safe(resolvedProfile?.businessName || "YOUR BUSINESS"), margin, 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...muted);

    let businessY = 28;
    businessLines.slice(1).forEach((lineText) => {
        doc.text(safe(lineText), margin, businessY);
        businessY += 4.8;
    });

    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...primaryDark);
    doc.text("INVOICE", pageWidth - margin, 22, { align: "right" });

    doc.setFillColor(...darkHeader);
    doc.roundedRect(pageWidth - 76, 25, 62, 17, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...white);
    doc.text("Total Amount", pageWidth - 45, 31, { align: "center" });

    doc.setFontSize(13);
    doc.text(money(totals.total), pageWidth - 45, 38, { align: "center" });

    /* ================= INFO BLOCKS ================= */
    let leftY = 50;
    let rightY = 50;

    drawSectionTitle("Bill To", margin, leftY, 84);
    leftY = drawMultilineBlock(clientLines, margin + 4, leftY + 8, 76);

    drawSectionTitle("Invoice Details", 112, rightY, 84);
    rightY += 10;

    drawLabelValue("Invoice No", invoice?.invoiceNo || invoice?.id || "-", 116, rightY, 146);
    rightY += 7;

    drawLabelValue(
        "Issue Date",
        formatDate(invoice?.issueDate || invoice?.date || invoice?.invoiceDate || invoice?.createdAt),
        116,
        rightY,
        146
    );
    rightY += 7;

    drawLabelValue("Due Date", formatDate(invoice?.dueDate), 116, rightY, 146);
    rightY += 7;

    drawLabelValue("Status", invoiceStatus, 116, rightY, 146);
    rightY += 7;

    if (invoice?.poNumber || invoice?.poNo) {
        drawLabelValue("PO Number", invoice?.poNumber || invoice?.poNo, 116, rightY, 146);
        rightY += 7;
    }

    if (invoice?.reference || invoice?.referenceNo) {
        drawLabelValue("Reference", invoice?.reference || invoice?.referenceNo, 116, rightY, 146);
        rightY += 7;
    }

    /* ================= ITEMS TABLE ================= */
    const tableStartY = Math.max(leftY, rightY) + 10;

    autoTable(doc, {
        startY: tableStartY,
        head: [["Serial No", "Description", "Qty", "Rate", "Amount"]],
        body: totals.items.length
            ? totals.items.map((item) => [
                item.no,
                item.details ? `${item.name} - ${item.details}` : item.name,
                `${item.qty}${item.unit ? ` ${item.unit}` : ""}`,
                money(item.rate),
                money(item.amount),
            ])
            : [["", "No line items available", "", "", ""]],
        theme: "grid",
        margin: { left: margin, right: margin },
        tableWidth: pageWidth - margin * 2,
        styles: {
            font: "helvetica",
            fontSize: 8.8,
            cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
            textColor: text,
            lineColor: line,
            lineWidth: 0.2,
            valign: "middle",
        },
        headStyles: {
            fillColor: darkHeader,
            textColor: white,
            fontStyle: "bold",
            halign: "left",
        },
        alternateRowStyles: {
            fillColor: [249, 251, 252],
        },
        columnStyles: {
            0: {
                cellWidth: 32,
                halign: "center",
                overflow: "hidden",
            },
            1: {
                cellWidth: 70,
                overflow: "hidden",
            },
            2: {
                cellWidth: 16,
                halign: "center",
                overflow: "hidden",
            },
            3: {
                cellWidth: 28,
                halign: "right",
                overflow: "hidden",
            },
            4: {
                cellWidth: 30,
                halign: "right",
                overflow: "hidden",
            },
        },
        didParseCell(data) {
            const col = data.column.index;

            if (data.section === "body" && col === 0) {
                data.cell.text = [safe(data.cell.raw, "").replace(/\n/g, " ")];
            } else if (data.section === "body" && col === 1) {
                const raw = Array.isArray(data.cell.text)
                    ? data.cell.text.join(" ")
                    : String(data.cell.text || "");
                data.cell.text = [raw.replace(/\n/g, " ").replace(/\s+/g, " ").trim()];
            } else if (Array.isArray(data.cell.text)) {
                data.cell.text = data.cell.text.map((t) => String(t).replace(/\n/g, " "));
            } else if (typeof data.cell.text === "string") {
                data.cell.text = [data.cell.text.replace(/\n/g, " ")];
            }
        },
    });

    let currentY = doc.lastAutoTable.finalY + 8;

    /* ================= TOTALS + PAYMENT ================= */
    const totalsBottomY = drawTotalsBox(totals, 126, currentY, 70);

    drawSectionTitle("Payment Information", margin, currentY + 2, 100);
    let paymentY = currentY + 10;

    if (paymentLines.length) {
        paymentLines.forEach((lineText, index) => {
            const lines = doc.splitTextToSize(lineText, 92);
            doc.setFont("helvetica", index === 0 ? "bold" : "normal");
            doc.setFontSize(10);
            doc.setTextColor(...muted);

            lines.forEach((part) => {
                doc.text(part, margin + 4, paymentY);
                paymentY += 5.2;
            });
        });
    } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...muted);
        doc.text("Payment details will be shared separately.", margin + 4, paymentY);
        paymentY += 5.2;
    }

    /* ================= NOTES ================= */
    const notesY = Math.max(paymentY + 6, totalsBottomY + 4);

    if (notesY < 245) {
        drawSectionTitle("Notes", margin, notesY, pageWidth - margin * 2);
        const notes =
            invoice?.notes ||
            invoice?.terms ||
            invoice?.comment ||
            "Thank you for your business. Please retain this invoice for your records.";

        const notesLines = doc.splitTextToSize(notes, pageWidth - margin * 2 - 8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...muted);
        doc.text(notesLines, margin + 4, notesY + 8);
    }

    /* ================= PAID STAMP ================= */
    if (invoiceStatus.toLowerCase() === "paid") {
        drawPaidStamp(138, 228, 52, 20);
    }

    /* ================= FOOTER ================= */
    doc.setDrawColor(...line);
    doc.line(margin, 280, pageWidth - margin, 280);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...muted);

    const footerLeft =
        resolvedProfile?.email || resolvedProfile?.phone || resolvedProfile?.website
            ? [resolvedProfile?.email, resolvedProfile?.phone, resolvedProfile?.website].filter(Boolean).join(" | ")
            : "Generated invoice";

    doc.text(footerLeft, margin, 286);

    doc.text(`Currency: ${currency?.code || "INR"} | Page 1`, pageWidth - margin, 286, {
        align: "right",
    });
};