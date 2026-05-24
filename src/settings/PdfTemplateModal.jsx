import { useState, useEffect } from "react";
import { getData, saveData } from "../utils/storage.js";

export default function PdfTemplateModal({ onClose }) {
    const [template, setTemplate] = useState("classic");

    useEffect(() => {
        const saved = getData("appSettings");
        if (saved?.pdfTemplate) setTemplate(saved.pdfTemplate);
    }, []);

    const saveTemplate = () => {
        const old = getData("appSettings") || {};
        saveData("appSettings", { ...old, pdfTemplate: template });
        onClose();
    };

    return (
        <div className="modal d-block bg-dark bg-opacity-50">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">

                    <div className="modal-header">
                        <h5>Invoice PDF Template</h5>
                        <button className="btn-close" onClick={onClose}></button>
                    </div>

                    <div className="modal-body">
                        {["classic", "modern", "minimal"].map(t => (
                            <div className="form-check mb-2" key={t}>
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    checked={template === t}
                                    onChange={() => setTemplate(t)}
                                />
                                <label className="form-check-label text-capitalize">
                                    {t}
                                </label>
                            </div>
                        ))}
                    </div>

                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" onClick={saveTemplate}>Save</button>
                    </div>

                </div>
            </div>
        </div>
    );
}
