import { useRef } from "react";
import { exportBackup, importBackup } from "../utils/backup";
import { Share } from '@capacitor/share'; // ✅ Import Capacitor Share
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'; // ✅ Import Filesystem

export default function BackupModal({ onClose }) {
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            importBackup(file, onClose);
        }
    };

    // ✅ PROFESSIONAL ANDROID BACKUP LOGIC
    const handleBackup = async () => {
        try {
            // 1. Get the data string (Logic usually inside your exportBackup)
            const data = {
                invoices: JSON.parse(localStorage.getItem("invoices") || "[]"),
                clients: JSON.parse(localStorage.getItem("clients") || "[]"),
                items: JSON.parse(localStorage.getItem("items") || "[]"),
                settings: JSON.parse(localStorage.getItem("settings") || "{}")
            };
            const fileName = `Invoice_Backup_${new Date().toISOString().split('T')[0]}.json`;
            const dataString = JSON.stringify(data, null, 2);

            // 2. Save to temporary file in Android storage
            const savedFile = await Filesystem.writeFile({
                path: fileName,
                data: dataString,
                directory: Directory.Cache, // Temporary location
                encoding: Encoding.UTF8,
            });

            // 3. Open Native Android Share Sheet
            // This allows saving to Google Drive, Device, or Email
            await Share.share({
                title: 'App Data Backup',
                text: 'Safe keep your invoice data backup file.',
                url: savedFile.uri, // Native URI of the file
                dialogTitle: 'Save Backup to...',
            });

        } catch (error) {
            console.error("Backup failed", error);
            // Fallback for Web browser if Capacitor is not available
            exportBackup();
        }
    };

    return (
        <div className="modal d-block bg-dark bg-opacity-50" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content shadow-lg border-0 rounded-4">

                    {/* Header */}
                    <div className="modal-header border-0 pb-0">
                        <h5 className="modal-title fw-bold text-dark">Data Backup & Restore</h5>
                        <button className="btn-close" onClick={onClose}></button>
                    </div>

                    <div className="modal-body p-4 text-center">
                        <div className="mb-4">
                            <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: 60, height: 60 }}>
                                <svg width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                            </div>
                            <p className="text-muted small">
                                Save your data to Google Drive or your device to prevent data loss.
                                You can restore it later on any device.
                            </p>
                        </div>

                        <div className="d-grid gap-3">

                            {/* BACKUP BUTTON - Now using handleBackup */}
                            <button
                                onClick={handleBackup}
                                className="btn btn-primary py-2 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2"
                            >
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Backup Data
                            </button>

                            {/* DIVIDER */}
                            <div className="d-flex align-items-center">
                                <hr className="flex-grow-1" />
                                <span className="mx-2 text-muted small">OR</span>
                                <hr className="flex-grow-1" />
                            </div>

                            {/* RESTORE BUTTON */}
                            <button
                                onClick={() => fileInputRef.current.click()}
                                className="btn btn-outline-secondary py-2 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2"
                            >
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m-4-4v12" /></svg>
                                Restore Backup
                            </button>

                            <input
                                type="file"
                                accept=".json"
                                ref={fileInputRef}
                                style={{ display: "none" }}
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    <div className="modal-footer border-0 pt-0 justify-content-center">
                        <button className="btn btn-link text-muted text-decoration-none small" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
}