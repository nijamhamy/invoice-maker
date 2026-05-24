import { getData, saveData } from "./storage";

// 📦 1. EXPORT BACKUP (Smart: Share on Mobile, Download on Desktop)
export const exportBackup = async () => {
    try {
        // 1. Gather all app data
        const backupData = {
            appSettings: getData("appSettings"),
            invoices: getData("invoices") || [],
            clients: getData("clients") || [],
            items: getData("items") || [],
            version: "1.0",
            timestamp: new Date().toISOString()
        };

        // 2. Convert to a File
        const dataStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const fileName = `invoice_backup_${new Date().toISOString().slice(0, 10)}.json`;

        // 3. Try to Share (Mobile Experience)
        let shareSuccess = false;

        // Check if browser supports sharing files
        if (navigator.share && navigator.canShare) {
            const file = new File([blob], fileName, { type: "application/json" });
            const shareData = {
                title: "Invoice App Backup",
                text: "Save this backup file to keep your data safe.",
                files: [file]
            };

            if (navigator.canShare(shareData)) {
                try {
                    await navigator.share(shareData);
                    shareSuccess = true; // Success!
                } catch (error) {
                    // If user cancels or Desktop blocks it, we catch the error here
                    console.warn("Share failed or cancelled. Falling back to download.");
                }
            }
        }

        // 4. Fallback: Download File (Desktop Experience)
        // If sharing didn't happen (or failed), we force a download
        if (!shareSuccess) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }

    } catch (error) {
        console.error("Critical Backup Error:", error);
        alert("Failed to create backup file.");
    }
};

// 📥 2. IMPORT BACKUP (Remains the same)
export const importBackup = (file, onSuccess) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);

            if (!json.invoices && !json.clients) {
                alert("Invalid backup file.");
                return;
            }

            if (window.confirm("⚠️ Warning: This will REPLACE your current data with the backup. Are you sure?")) {
                if (json.appSettings) saveData("appSettings", json.appSettings);
                if (json.invoices) saveData("invoices", json.invoices);
                if (json.clients) saveData("clients", json.clients);
                if (json.items) saveData("items", json.items);

                alert("✅ Backup restored successfully!");
                if (onSuccess) onSuccess();
                window.location.reload();
            }
        } catch (error) {
            console.error("Restore failed", error);
            alert("Error reading backup file.");
        }
    };

    reader.readAsText(file);
};