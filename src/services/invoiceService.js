import { v4 as uuid } from "uuid";

export const formatMoney = (value, currencySymbol = "₹") => {
    const amount = Number(value || 0);
    const formatted = new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);

    return `${currencySymbol} ${formatted}`;
};

export const calculateInvoiceTotals = ({
    items = [],
    discountRate = 0,
    taxRate = 0,
}) => {
    const subtotal = items.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1),
        0
    );

    const discountAmount = subtotal * (Number(discountRate || 0) / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (Number(taxRate || 0) / 100);
    const grandTotal = taxableAmount + taxAmount;

    return {
        subtotal,
        discountAmount,
        taxableAmount,
        taxAmount,
        grandTotal,
    };
};

export const addInvoiceItem = (currentItems = [], item) => {
    const existingIndex = currentItems.findIndex(
        (ex) => (ex.id && ex.id === item.id) || ex.name === item.name
    );

    if (existingIndex > -1) {
        const updated = [...currentItems];
        updated[existingIndex].qty = (Number(updated[existingIndex].qty) || 0) + 1;
        return updated;
    }

    return [...currentItems, { ...item, qty: 1, uniqueId: uuid() }];
};

export const updateInvoiceItemQty = (currentItems = [], uniqueId, qty) => {
    return currentItems.map((item) =>
        item.uniqueId === uniqueId
            ? { ...item, qty: Math.max(1, Number(qty) || 1) }
            : item
    );
};

export const removeInvoiceItem = (currentItems = [], uniqueId) => {
    return currentItems.filter((item) => item.uniqueId !== uniqueId);
};

export const getSelectedClientData = (clients = [], clientId) => {
    if (clientId === "guest") {
        return { id: "guest", name: "Walk-in Customer" };
    }

    return clients.find((c) => c.id === clientId) || null;
};

export const buildInvoicePayload = ({
    id,
    isEditMode = false,
    clientId,
    clients = [],
    invoiceNo = "",
    issueDate = "",
    dueDate = "",
    items = [],
    paymentMethod = "Cash",
    paymentStatus = "Unpaid",
    comment = "",
    discountRate = 0,
    taxRate = 0,
}) => {
    const clientData =
        clients.find((c) => c.id === clientId) ||
        (clientId === "guest"
            ? { id: "guest", name: "Walk-in Customer" }
            : { name: "Guest Customer" });

    const { subtotal, discountAmount, taxAmount, grandTotal } =
        calculateInvoiceTotals({
            items,
            discountRate,
            taxRate,
        });

    return {
        id: isEditMode ? id : uuid(),
        clientId,
        clientName: clientData.name,
        clientDetails: clientData,
        invoiceNo,
        issueDate,
        dueDate,
        items,
        paymentMethod,
        paymentStatus,
        comment,
        subtotal,
        discountRate,
        discountAmount,
        taxRate,
        taxAmount,
        total: grandTotal,
    };
};