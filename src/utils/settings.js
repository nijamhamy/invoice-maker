import { getData, saveData } from "./storage";

const DEFAULT_SETTINGS = {
    businessProfile: {
        businessName: "",
        address: "",
        email: "",
        phone: "",
        logo: "",
    },
    currency: {
        code: "INR",
        symbol: "₹",
        name: "Indian Rupee",
    },
    pdfTemplate: "classic",
    darkMode: false,
    taxRate: 0,
    discountRate: 0,
    defaultDiscountRate: 0,
    defaultNote: "",
    defaultInvoiceNote: "",
    invoiceNote: "",
};

export const getSettings = () => {
    const savedSettings = getData("appSettings") || {};

    return {
        ...DEFAULT_SETTINGS,
        ...savedSettings,
        businessProfile: {
            ...DEFAULT_SETTINGS.businessProfile,
            ...(savedSettings.businessProfile || {}),
        },
        currency: {
            ...DEFAULT_SETTINGS.currency,
            ...(savedSettings.currency || {}),
        },
    };
};

export const saveSettings = (newSettings = {}) => {
    const currentSettings = getSettings();

    const updatedSettings = {
        ...currentSettings,
        ...newSettings,
        businessProfile: {
            ...currentSettings.businessProfile,
            ...(newSettings.businessProfile || {}),
        },
        currency: {
            ...currentSettings.currency,
            ...(newSettings.currency || {}),
        },
    };

    saveData("appSettings", updatedSettings);

    window.dispatchEvent(new Event("settings-changed"));
    window.dispatchEvent(new Event("theme-change"));

    return updatedSettings;
};