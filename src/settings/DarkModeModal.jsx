import { useState, useEffect } from "react";
import { getData, saveData } from "../utils/storage.js";

// Helper — applies or removes dark mode on both <html> and <body>
function applyDarkMode(enabled) {
    if (enabled) {
        document.body.classList.add("dark-mode");
        document.documentElement.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
        document.documentElement.classList.remove("dark-mode");
    }
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

    return (
        <div className="modal d-block bg-dark bg-opacity-50" style={{ zIndex: 2000 }}>
            <div className="modal-dialog modal-dialog-centered modal-sm">
                <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                    <div className="modal-header border-0 pb-2">
                        <div>
                            <h5 className="modal-title fw-bold mb-1">Dark Mode</h5>
                            <div className="text-muted small">Choose enabled or disabled</div>
                        </div>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <div className="modal-body pt-2 pb-3">
                        <div className="border rounded-4 px-3 py-3 bg-light-subtle">
                            <div className="d-flex justify-content-between align-items-center gap-3">
                                <div>
                                    <div className="fw-bold text-dark">Dark Theme</div>
                                    <div className="small text-muted">
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
                        <button className="btn btn-light px-4 border rounded-3" onClick={onClose}>
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