import { useState, useEffect } from "react";
import { getData, saveData } from "../utils/storage.js";

const currencies = [
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee" },
    { code: "SAR", symbol: "SAR", name: "Saudi Riyal" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
];

export default function CurrencyModal({ onClose }) {
    const [selected, setSelected] = useState(currencies[0]);

    useEffect(() => {
        const saved = getData("appSettings");
        if (saved?.currency) setSelected(saved.currency);
    }, []);

    const saveCurrency = () => {
        const old = getData("appSettings") || {};
        saveData("appSettings", { ...old, currency: selected });
        onClose();
    };

    return (
        <div className="modal d-block bg-dark bg-opacity-50">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">

                    <div className="modal-header">
                        <h5>Select Currency</h5>
                        <button className="btn-close" onClick={onClose}></button>
                    </div>

                    <div className="modal-body">
                        <select
                            className="form-control"
                            value={selected.code}
                            onChange={(e) =>
                                setSelected(currencies.find(c => c.code === e.target.value))
                            }
                        >
                            {currencies.map(c => (
                                <option key={c.code} value={c.code}>
                                    {c.name} ({c.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" onClick={saveCurrency}>Save</button>
                    </div>

                </div>
            </div>
        </div>
    );
}
