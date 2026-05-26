import { useState, useEffect } from "react";
import { getData, saveData } from "../utils/storage.js";

function applyDarkMode(enabled) {
    const theme = enabled ? "dark" : "light";

    document.body.classList.toggle("dark-mode", enabled);
    document.documentElement.classList.toggle("dark-mode", enabled);

    document.body.classList.toggle("light-mode", !enabled);
    document.documentElement.classList.toggle("light-mode", !enabled);

    document.body.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);

    document.body.setAttribute("data-bs-theme", theme);
    document.documentElement.setAttribute("data-bs-theme", theme);

    document.documentElement.style.colorScheme = theme;
    document.body.style.colorScheme = theme;
}

export default function DarkModeModal({ onClose }) {
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const saved = getData("appSettings");
        if (saved?.darkMode !== undefined) {
            setDarkMode(saved.darkMode);
        }
    }, []);

    const saveDarkMode = () => {
        const old = getData("appSettings") || {};
        saveData("appSettings", { ...old, darkMode });

        applyDarkMode(darkMode);

        window.dispatchEvent(new Event("theme-change"));
        onClose();
    };

    const surfaceBg = darkMode ? "#1e1e1e" : "#ffffff";
    const softBg = darkMode ? "#2a2a2a" : "#f8f9fa";
    const textMain = darkMode ? "#ffffff" : "#111827";
    const textMuted = darkMode ? "#a0a0a0" : "#6c757d";
    const borderColor = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

    return (
        <div
            className="modal d-block bg-dark bg-opacity-50"
            style={{ zIndex: 2000 }}
            data-bs-theme={darkMode ? "dark" : "light"}
        >
            <div className="modal-dialog modal-dialog-centered modal-sm">
                <div
                    className="modal-content border-0 shadow-lg rounded-4 overflow-hidden"
                    style={{
                        backgroundColor: surfaceBg,
                        color: textMain,
                        border: `1px solid ${borderColor}`,
                    }}
                >
                    <div className="modal-header border-0 pb-2">
                        <div>
                            <h5 className="modal-title fw-bold mb-1" style={{ color: textMain }}>
                                Dark Mode
                            </h5>
                            <div className="small" style={{ color: textMuted }}>
                                Choose enabled or disabled
                            </div>
                        </div>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <div className="modal-body pt-2 pb-3">
                        <div
                            className="border rounded-4 px-3 py-3"
                            style={{
                                backgroundColor: softBg,
                                borderColor,
                            }}
                        >
                            <div className="d-flex justify-content-between align-items-center gap-3">
                                <div>
                                    <div className="fw-bold" style={{ color: textMain }}>
                                        Dark Theme
                                    </div>
                                    <div className="small" style={{ color: textMuted }}>
                                        {darkMode ? "Enabled" : "Disabled"}
                                    </div>
                                </div>

                                <div className="form-check form-switch m-0">
                                    <input
                                        id="darkModeSwitch"
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        checked={darkMode}
                                        onChange={(e) => setDarkMode(e.target.checked)}
                                        style={{ width: "48px", height: "24px", cursor: "pointer" }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer border-0 pt-0">
                        <button
                            className="btn px-4 border rounded-3"
                            onClick={onClose}
                            style={{
                                backgroundColor: softBg,
                                color: textMain,
                                borderColor,
                            }}
                        >
                            Cancel
                        </button>
                        <button className="btn btn-primary px-4 fw-bold rounded-3" onClick={saveDarkMode}>
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}