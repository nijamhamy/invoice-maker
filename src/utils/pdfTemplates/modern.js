import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SERIAL_LENGTH = 13;

const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};

const formatCurrency = (value, currency = { symbol: "₹", code: "INR" }) => {
    const amount = toNumber(value).toFixed(2);
    const prefix = currency?.symbol || currency?.code || "";
    return prefix ? `${prefix} ${amount}` : amount;
};

const safeText = (value, fallback = "") => {
    if (value === null || value === undefined) return fallback;
    return String(value).trim() || fallback;
};

const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatSerialNumber = (value, fallbackIndex = 1) => {
    const rawValue = value ?? fallbackIndex;
    let cleaned = safeText(rawValue, String(fallbackIndex))
        .replace(/\s+/g, "")
        .toUpperCase();

    if (!cleaned) cleaned = String(fallbackIndex);

    if (cleaned.length > SERIAL_LENGTH) {
        cleaned = cleaned.slice(-SERIAL_LENGTH);
    }

    return cleaned.padStart(SERIAL_LENGTH, "0");
};

const splitMultiline = (value) => {
    return safeText(value)
        .split(/\r?\n|,/)
        .map((line) => line.trim())
        .filter(Boolean);
};

const getClientLines = (client = {}) => {
    const lines = [];

    if (client?.name) lines.push(client.name);
    if (client?.company) lines.push(client.company);
    if (client?.address) lines.push(...splitMultiline(client.address));
    if (client?.city || client?.state || client?.zip) {
        lines.push(
            [client.city, client.state, client.zip].filter(Boolean).join(", ")
        );
    }
    if (client?.country) lines.push(client.country);
    if (client?.phone) lines.push(`Phone: ${client.phone}`);
    if (client?.email) lines.push(`Email: ${client.email}`);
    if (client?.gst || client?.vat || client?.taxNo) {
        lines.push(`Tax ID: ${client.gst || client.vat || client.taxNo}`);
    }

    return lines.length ? lines : ["Walk-in Customer"];
};

const getBusinessLines = (profile = {}) => {
    const lines = [];

    if (profile?.businessName) lines.push(profile.businessName);
    if (profile?.ownerName) lines.push(profile.ownerName);
    if (profile?.address) lines.push(...splitMultiline(profile.address));
    if (profile?.city || profile?.state || profile?.zip) {
        lines.push(
            [profile.city, profile.state, profile.zip].filter(Boolean).join(", ")
        );
    }
    if (profile?.country) lines.push(profile.country);
    if (profile?.phone) lines.push(`Phone: ${profile.phone}`);
    if (profile?.email) lines.push(`Email: ${profile.email}`);
    if (profile?.website) lines.push(profile.website);
    if (profile?.gst || profile?.vat || profile?.taxNo) {
        lines.push(`Tax ID: ${profile.gst || profile.vat || profile.taxNo}`);
    }

    return lines;
};

const getPaymentLines = (invoice = {}, profile = {}) => {
    const bank = invoice?.bankDetails || profile?.bankDetails || {};
    const lines = [];

    if (invoice?.paymentMode) lines.push(`Payment Method: ${invoice.paymentMode}`);
    if (bank?.bankName) lines.push(`Bank: ${bank.bankName}`);
    if (bank?.accountName) lines.push(`A/C Name: ${bank.accountName}`);
    if (bank?.accountNumber) lines.push(`A/C No: ${bank.accountNumber}`);
    if (bank?.ifsc) lines.push(`IFSC: ${bank.ifsc}`);
    if (bank?.iban) lines.push(`IBAN: ${bank.iban}`);
    if (bank?.swift) lines.push(`SWIFT: ${bank.swift}`);
    if (bank?.branch) lines.push(`Branch: ${bank.branch}`);
    if (invoice?.upiId || bank?.upiId) lines.push(`UPI: ${invoice?.upiId || bank?.upiId}`);

    return lines;
};

const getPaidAmount = (invoice = {}) => {
    if (Array.isArray(invoice?.payments) && invoice.payments.length) {
        const paymentsTotal = invoice.payments.reduce(
            (sum, payment) =>
                sum +
                toNumber(
                    payment?.amount ??
                    payment?.paidAmount ??
                    payment?.receivedAmount ??
                    0
                ),
            0
        );

        if (paymentsTotal > 0) return paymentsTotal;
    }

    return toNumber(
        invoice?.paid ??
        invoice?.amountPaid ??
        invoice?.paymentReceived ??
        invoice?.receivedAmount ??
        invoice?.paidAmount ??
        0
    );
};

const getInvoiceStatus = (invoice = {}, totals = {}) => {
    const total = toNumber(totals?.total ?? invoice?.total ?? invoice?.grandTotal);
    const paid = toNumber(totals?.paid ?? getPaidAmount(invoice));
    const balance = toNumber(
        totals?.balance ?? (total > 0 ? Math.max(total - paid, 0) : 0)
    );

    if (total > 0 && balance <= 0) return "Paid";
    if (paid > 0 && balance > 0) return "Partially Paid";

    const raw = safeText(invoice?.status, "").toLowerCase();

    if (raw === "paid") return "Paid";
    if (raw === "partially paid" || raw === "partial") return "Partially Paid";
    if (raw === "overdue") return "Overdue";
    if (raw === "cancelled") return "Cancelled";
    if (raw === "void") return "Void";
    if (raw === "draft") return "Draft";
    if (raw === "refunded") return "Refunded";

    return "Unpaid";
};

const drawLabelValue = (doc, label, value, x, y, valueX) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(74, 85, 104);
    doc.text(label, x, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(safeText(value, "-"), valueX, y);
};

const drawSectionTitle = (doc, title, x, y, width) => {
    doc.setFillColor(219, 234, 254);
    doc.roundedRect(x, y - 6, width, 10, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(29, 78, 216);
    doc.text(title.toUpperCase(), x + 4, y);
};

const drawMultilineBlock = (doc, lines, x, y, maxWidth, lineGap = 5.2) => {
    let currentY = y;

    lines.forEach((line, index) => {
        const textLines = doc.splitTextToSize(safeText(line), maxWidth);
        doc.setFont("helvetica", index === 0 ? "bold" : "normal");
        doc.setFontSize(index === 0 ? 11.5 : 10);
        doc.setTextColor(index === 0 ? 15 : 71, index === 0 ? 23 : 85, index === 0 ? 42 : 105);

        textLines.forEach((t) => {
            doc.text(t, x, currentY);
            currentY += lineGap;
        });
    });

    return currentY;
};

const getItems = (invoice = {}) => {
    if (Array.isArray(invoice?.items) && invoice.items.length) return invoice.items;
    if (Array.isArray(invoice?.products) && invoice.products.length) return invoice.products;
    return [];
};

const normalizeItem = (item = {}, index = 0) => {
    const qty = toNumber(item.qty ?? item.quantity ?? 1);
    const rate = toNumber(item.rate ?? item.price ?? item.unitPrice ?? 0);
    const amount = toNumber(item.amount ?? item.total ?? qty * rate);

    return {
        no: formatSerialNumber(
            item.serialNo ?? item.serialNumber ?? item.sku ?? item.code ?? item.id,
            index + 1
        ),
        name: safeText(item.name || item.title || item.description, `Item ${index + 1}`),
        details: safeText(item.details || item.note || item.subtitle || ""),
        qty,
        rate,
        amount,
        unit: safeText(item.unit, ""),
    };
};

const getTotals = (invoice = {}, items = []) => {
    const itemsSubtotal = items.reduce((sum, item) => sum + toNumber(item.amount), 0);

    const subtotal = toNumber(invoice.subtotal ?? itemsSubtotal);
    const discount = toNumber(invoice.discount ?? invoice.discountAmount ?? 0);
    const shipping = toNumber(invoice.shipping ?? invoice.shippingAmount ?? 0);
    const tax = toNumber(invoice.tax ?? invoice.taxAmount ?? invoice.gstAmount ?? 0);
    const paid = getPaidAmount(invoice);

    const total =
        toNumber(
            invoice.total ??
            invoice.grandTotal ??
            invoice.finalAmount ??
            subtotal - discount + shipping + tax
        ) || 0;

    const balance = Math.max(total - paid, 0);

    return {
        subtotal,
        discount,
        shipping,
        tax,
        paid,
        total,
        balance,
    };
};

const drawTableHeader = (doc, startX, startY, widths) => {
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(startX, startY, widths.total, 11, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.2);
    doc.setTextColor(255, 255, 255);

    doc.text("Serial No", startX + 3, startY + 7);
    doc.text("Description", startX + widths.no + 4, startY + 7);
    doc.text("Qty", startX + widths.no + widths.desc + 4, startY + 7);
    doc.text("Rate", startX + widths.no + widths.desc + widths.qty + 4, startY + 7);
    doc.text("Amount", startX + widths.total - 18, startY + 7);
};

const drawItemsTable = (doc, invoice, currency, startY) => {
    const startX = 14;
    const pageWidth = 210;
    const usableWidth = pageWidth - startX * 2;

    const widths = {
        no: 32,
        desc: 70,
        qty: 16,
        rate: 28,
        amount: 30,
    };
    widths.total = usableWidth;

    drawTableHeader(doc, startX, startY, widths);

    const items = getItems(invoice).map(normalizeItem);
    let y = startY + 15;

    if (!items.length) {
        doc.setDrawColor(191, 219, 254);
        doc.setFillColor(239, 246, 255);
        doc.rect(startX, y - 4, usableWidth, 12, "FD");

        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("No line items available", startX + 4, y + 3);

        return { y: y + 12, items };
    }

    items.forEach((item, index) => {
        const descLines = doc.splitTextToSize(
            item.details ? `${item.name}\n${item.details}` : item.name,
            widths.desc - 8
        );
        const rowHeight = Math.max(12, descLines.length * 5 + 4);

        if (y + rowHeight > 245) {
            doc.addPage();
            y = 20;
            drawTableHeader(doc, startX, y, widths);
            y += 15;
        }

        doc.setDrawColor(219, 234, 254);
        doc.setFillColor(
            ...(index % 2 === 0 ? [255, 255, 255] : [248, 250, 252])
        );
        doc.rect(startX, y - 4, usableWidth, rowHeight, "FD");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.8);
        doc.setTextColor(30, 41, 59);

        doc.text(String(item.no), startX + 3, y + 3);
        doc.text(descLines, startX + widths.no + 4, y + 3);

        doc.text(
            `${item.qty}${item.unit ? ` ${item.unit}` : ""}`,
            startX + widths.no + widths.desc + 4,
            y + 3
        );

        doc.text(
            formatCurrency(item.rate, currency),
            startX + widths.no + widths.desc + widths.qty + 4,
            y + 3
        );

        doc.text(
            formatCurrency(item.amount, currency),
            startX + usableWidth - 24,
            y + 3
        );

        y += rowHeight;
    });

    return { y, items };
};

const drawTotalsBox = (doc, totals, currency, x, y, width = 70) => {
    const rows = [
        ["Subtotal", formatCurrency(totals.subtotal, currency)],
        ...(totals.discount ? [["Discount", `- ${formatCurrency(totals.discount, currency)}`]] : []),
        ...(totals.shipping ? [["Shipping", formatCurrency(totals.shipping, currency)]] : []),
        ...(totals.tax ? [["Tax", formatCurrency(totals.tax, currency)]] : []),
        ...(totals.paid ? [["Paid", `- ${formatCurrency(totals.paid, currency)}`]] : []),
    ];

    const boxHeight = rows.length * 8 + 18;

    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(x, y, width, boxHeight, 3, 3, "FD");

    let currentY = y + 8;

    rows.forEach(([label, value]) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(label, x + 4, currentY);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text(value, x + width - 4, currentY, { align: "right" });

        currentY += 8;
    });

    doc.setDrawColor(191, 219, 254);
    doc.line(x + 4, currentY - 2, x + width - 4, currentY - 2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(29, 78, 216);
    doc.text("Total Amount", x + 4, currentY + 6);

    doc.setFontSize(13.5);
    doc.text(formatCurrency(totals.total, currency), x + width - 4, currentY + 6, {
        align: "right",
    });

    return y + boxHeight;
};

const drawPaidStamp = (doc, x, y, width = 52, height = 20) => {
    doc.setDrawColor(198, 40, 40);
    doc.setLineWidth(1.2);
    doc.setTextColor(198, 40, 40);

    doc.roundedRect(x, y, width, height, 3, 3, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("PAID", x + width / 2, y + 13, {
        align: "center",
    });
};

export const modernTemplate = (
    doc,
    invoice = {},
    profile = {},
    client = {},
    currency = { code: "INR", symbol: "₹" }
) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    const business =
        profile?.businessProfile && typeof profile.businessProfile === "object"
            ? { ...profile, ...profile.businessProfile }
            : profile || {};
    const customer = client && Object.keys(client).length ? client : invoice?.clientDetails || invoice?.customer || {};
    const businessLines = getBusinessLines(business);
    const clientLines = getClientLines(customer);
    const paymentLines = getPaymentLines(invoice, business);

    const items = getItems(invoice).map(normalizeItem);
    const totals = getTotals(invoice, items);
    const invoiceStatus = getInvoiceStatus(invoice, totals);

    doc.setFillColor(239, 246, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 10, pageWidth - margin * 2, pageHeight - 20, 4, 4, "F");

    doc.setDrawColor(191, 219, 254);
    doc.setLineWidth(0.5);
    doc.line(margin, 34, pageWidth - margin, 34);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(15, 23, 42);
    doc.text(business?.businessName || "YOUR BUSINESS", margin, 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);

    let businessY = 28;
    businessLines.slice(1).forEach((line) => {
        doc.text(safeText(line), margin, businessY);
        businessY += 4.8;
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(37, 99, 235);
    doc.text("INVOICE", pageWidth - margin, 22, { align: "right" });

    doc.setFillColor(29, 78, 216);
    doc.roundedRect(pageWidth - 74, 25, 60, 17, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("Amount", pageWidth - 44, 31, { align: "center" });

    doc.setFontSize(13);
    doc.text(formatCurrency(totals.total, currency), pageWidth - 44, 38, {
        align: "center",
    });

    let leftY = 50;
    let rightY = 50;

    drawSectionTitle(doc, "Bill To", margin, leftY, 84);
    leftY = drawMultilineBlock(doc, clientLines, margin + 4, leftY + 8, 76);

    drawSectionTitle(doc, "Invoice Details", 112, rightY, 84);
    rightY += 10;

    drawLabelValue(doc, "Invoice No", invoice?.invoiceNo || invoice?.id || "-", 116, rightY, 146);
    rightY += 7;

    drawLabelValue(
        doc,
        "Invoice Date",
        formatDate(
            invoice?.issueDate ??
            invoice?.invoiceDate ??
            invoice?.date ??
            invoice?.createdAt ??
            invoice?.updatedAt
        ),
        116,
        rightY,
        146
    );
    rightY += 7;

    drawLabelValue(doc, "Due Date", formatDate(invoice?.dueDate), 116, rightY, 146);
    rightY += 7;

    drawLabelValue(doc, "Status", invoiceStatus, 116, rightY, 146);
    rightY += 7;

    if (invoice?.poNumber || invoice?.poNo) {
        drawLabelValue(doc, "PO Number", invoice?.poNumber || invoice?.poNo, 116, rightY, 146);
        rightY += 7;
    }

    if (invoice?.reference || invoice?.referenceNo) {
        drawLabelValue(doc, "Reference", invoice?.reference || invoice?.referenceNo, 116, rightY, 146);
        rightY += 7;
    }

    const tableStartY = Math.max(leftY, rightY) + 10;
    const tableData = drawItemsTable(doc, invoice, currency, tableStartY);
    let currentY = tableData.y + 8;

    const totalsBottomY = drawTotalsBox(doc, totals, currency, 126, currentY, 70);

    drawSectionTitle(doc, "Payment Information", margin, currentY + 2, 100);
    let paymentY = currentY + 10;

    if (paymentLines.length) {
        paymentLines.forEach((line, index) => {
            const lines = doc.splitTextToSize(line, 92);
            doc.setFont("helvetica", index === 0 ? "bold" : "normal");
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);

            lines.forEach((part) => {
                doc.text(part, margin + 4, paymentY);
                paymentY += 5.2;
            });
        });
    } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("Payment details will be shared separately.", margin + 4, paymentY);
        paymentY += 5.2;
    }

    const notesY = Math.max(paymentY + 6, totalsBottomY + 4);

    if (notesY < 245) {
        drawSectionTitle(doc, "Notes", margin, notesY, pageWidth - margin * 2);
        const notes =
            invoice?.notes ||
            invoice?.terms ||
            "Thank you for your business. Please make payment by the due date.";

        const notesLines = doc.splitTextToSize(notes, pageWidth - margin * 2 - 8);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(notesLines, margin + 4, notesY + 8);
    }

    if (safeText(invoiceStatus).toLowerCase() === "paid") {
        drawPaidStamp(doc, 138, 228, 52, 20);
    }

    doc.setDrawColor(191, 219, 254);
    doc.line(margin, 280, pageWidth - margin, 280);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);

    const footerLeft =
        business?.email || business?.phone || business?.website
            ? [business?.email, business?.phone, business?.website].filter(Boolean).join("  |  ")
            : "Generated invoice";

    doc.text(footerLeft, margin, 286);

    doc.text(
        `Currency: ${currency?.code || "INR"}  |  Page 1`,
        pageWidth - margin,
        286,
        { align: "right" }
    );
};