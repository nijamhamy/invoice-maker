import jsPDF from "jspdf";
import { getSettings } from "../utils/settings";
import { minimalTemplate } from "../utils/pdfTemplates/minimal";
import { classicTemplate } from "../utils/pdfTemplates/classic";
import { modernTemplate } from "../utils/pdfTemplates/modern";

const DEFAULT_CURRENCY = { code: "INR", symbol: "₹" };

export const sanitizePdfFileName = (value = "invoice") => {
    return String(value)
        .trim()
        .replace(/[^a-z0-9-_]+/gi, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase();
};

export const getInvoicePdfFileName = (invoice = {}) => {
    const rawValue = invoice?.invoiceNo || invoice?.id || "invoice";
    const safeName = sanitizePdfFileName(rawValue || "invoice");
    return `${safeName}.pdf`;
};

export const getPdfSettingsBundle = (invoice = {}, profile = {}, client = {}) => {
    const settings = getSettings();

    const hasProfileData =
        profile &&
        typeof profile === "object" &&
        Object.keys(profile).length > 0;

    const resolvedProfile =
        invoice?.businessProfile ||
        (hasProfileData ? profile : null) ||
        settings?.businessProfile ||
        {};

    const resolvedClient =
        client && typeof client === "object" && Object.keys(client).length > 0
            ? client
            : invoice?.clientDetails || invoice?.customer || {};

    const resolvedCurrency =
        invoice?.currency ||
        settings?.currency ||
        DEFAULT_CURRENCY;

    const templateType = settings?.pdfTemplate || "modern";

    return {
        settings,
        profile: resolvedProfile,
        client: resolvedClient,
        currency: resolvedCurrency,
        templateType,
    };
};

export const applyInvoiceTemplate = ({
    doc,
    invoice,
    profile,
    client,
    currency,
    templateType,
}) => {
    if (!doc) {
        throw new Error("jsPDF document is required");
    }

    if (!invoice) {
        throw new Error("Invoice data is required");
    }

    if (templateType === "minimal") {
        minimalTemplate(doc, invoice, profile, client, currency);
        return;
    }

    if (templateType === "classic") {
        classicTemplate(doc, invoice, profile, client, currency);
        return;
    }

    modernTemplate(doc, invoice, profile, client, currency);
};

export const createInvoicePdfDoc = (invoice, profile = {}, client = {}) => {
    if (!invoice) {
        throw new Error("Invoice data not provided");
    }

    const bundle = getPdfSettingsBundle(invoice, profile, client);
    const doc = new jsPDF("p", "mm", "a4");

    applyInvoiceTemplate({
        doc,
        invoice,
        profile: bundle.profile,
        client: bundle.client,
        currency: bundle.currency,
        templateType: bundle.templateType,
    });

    return {
        doc,
        fileName: getInvoicePdfFileName(invoice),
        ...bundle,
    };
};

export const generateInvoicePDF = (invoice, profile = {}, client = {}) => {
    const { doc, fileName } = createInvoicePdfDoc(invoice, profile, client);
    doc.save(fileName);
    return fileName;
};

export const getInvoicePdfBlob = (invoice, profile = {}, client = {}) => {
    const { doc, fileName, templateType, currency, settings } = createInvoicePdfDoc(
        invoice,
        profile,
        client
    );

    return {
        blob: doc.output("blob"),
        fileName,
        templateType,
        currency,
        settings,
    };
};

export const getInvoicePdfBlobUrl = (invoice, profile = {}, client = {}) => {
    const { doc, fileName, templateType, currency, settings } = createInvoicePdfDoc(
        invoice,
        profile,
        client
    );

    return {
        blobUrl: doc.output("bloburl"),
        fileName,
        templateType,
        currency,
        settings,
    };
};

export const getInvoicePdfArrayBuffer = (invoice, profile = {}, client = {}) => {
    const { doc, fileName, templateType, currency, settings } = createInvoicePdfDoc(
        invoice,
        profile,
        client
    );

    return {
        arrayBuffer: doc.output("arraybuffer"),
        fileName,
        templateType,
        currency,
        settings,
    };
};

export const getInvoicePdfDataUriString = (invoice, profile = {}, client = {}) => {
    const { doc, fileName, templateType, currency, settings } = createInvoicePdfDoc(
        invoice,
        profile,
        client
    );

    return {
        dataUriString: doc.output("datauristring"),
        fileName,
        templateType,
        currency,
        settings,
    };
};

export const getInvoicePdfBase64 = async (invoice, profile = {}, client = {}) => {
    const { blob, fileName, templateType, currency, settings } = getInvoicePdfBlob(
        invoice,
        profile,
        client
    );

    const base64 = await blobToBase64(blob);

    return {
        base64,
        fileName,
        templateType,
        currency,
        settings,
    };
};

export const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = () => {
            try {
                const result = String(reader.result || "");
                const base64 = result.split(",")[1] || "";
                resolve(base64);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

export const downloadBlobAsPdf = (blob, fileName = "invoice.pdf") => {
    if (!blob) {
        throw new Error("Blob is required for download");
    }

    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

    return fileName;
};

export const quickDownloadInvoicePdf = (invoice, profile = {}, client = {}) => {
    const { blob, fileName } = getInvoicePdfBlob(invoice, profile, client);
    return downloadBlobAsPdf(blob, fileName);
};