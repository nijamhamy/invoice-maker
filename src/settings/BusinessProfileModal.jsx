import { useState, useEffect, useRef } from "react";
import { getData, saveData } from "../utils/storage.js";

export default function BusinessProfileModal({ onClose }) {
    // Reference for the hidden file input
    const fileInputRef = useRef(null);

    const [profile, setProfile] = useState({
        businessName: "",
        address: "",
        email: "",
        phone: "",
        logo: "" // Stores the Base64 image string
    });

    useEffect(() => {
        const settings = getData("appSettings") || {};
        if (settings.businessProfile) {
            setProfile(settings.businessProfile);
        }
    }, []);

    const saveProfile = () => {
        const settings = getData("appSettings") || {};
        settings.businessProfile = profile;
        saveData("appSettings", settings);
        onClose();
    };

    // Handle Image Selection
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // limit size to 500kb to prevent LocalStorage crash
            if (file.size > 500000) {
                alert("Please select an image smaller than 500KB");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile({ ...profile, logo: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    // Remove Logo
    const removeLogo = (e) => {
        e.stopPropagation(); // Prevent triggering the upload click
        setProfile({ ...profile, logo: "" });
    };

    return (
        <div className="modal d-block bg-dark bg-opacity-50">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content shadow-lg border-0">

                    {/* Header */}
                    <div className="modal-header border-0 pb-0">
                        <h5 className="modal-title fw-bold">Business Profile</h5>
                        <button className="btn-close" onClick={onClose}></button>
                    </div>

                    <div className="modal-body">

                        {/* ✅ UI/UX: LOGO UPLOADER SECTION */}
                        <div className="d-flex flex-column align-items-center mb-4">
                            <div
                                className="position-relative rounded-circle d-flex align-items-center justify-content-center border border-2 border-light shadow-sm"
                                style={{
                                    width: "100px",
                                    height: "100px",
                                    cursor: "pointer",
                                    backgroundColor: "#f8f9fa",
                                    overflow: "hidden"
                                }}
                                onClick={() => fileInputRef.current.click()}
                            >
                                {profile.logo ? (
                                    <img
                                        src={profile.logo}
                                        alt="Logo"
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                ) : (
                                    <div className="text-secondary text-center">
                                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        <div style={{ fontSize: "10px", marginTop: "2px" }}>Upload</div>
                                    </div>
                                )}
                            </div>

                            {/* Remove Logo Button (Only shows if logo exists) */}
                            {profile.logo && (
                                <button
                                    onClick={removeLogo}
                                    className="btn btn-sm text-danger mt-1 p-0 border-0"
                                    style={{ fontSize: "12px" }}
                                >
                                    Remove Logo
                                </button>
                            )}

                            {/* Hidden File Input */}
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                style={{ display: "none" }}
                                onChange={handleImageUpload}
                            />
                        </div>

                        {/* Text Inputs */}
                        <div className="mb-3">
                            <label className="form-label small text-muted fw-bold">Business Name</label>
                            <input
                                className="form-control"
                                value={profile.businessName}
                                onChange={e => setProfile({ ...profile, businessName: e.target.value })}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label small text-muted fw-bold">Address</label>
                            <textarea
                                className="form-control"
                                rows="2"
                                value={profile.address}
                                onChange={e => setProfile({ ...profile, address: e.target.value })}
                            />
                        </div>

                        <div className="row g-2">
                            <div className="col-6">
                                <label className="form-label small text-muted fw-bold">Email</label>
                                <input
                                    className="form-control"
                                    value={profile.email}
                                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                                />
                            </div>
                            <div className="col-6">
                                <label className="form-label small text-muted fw-bold">Phone</label>
                                <input
                                    className="form-control"
                                    value={profile.phone}
                                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                />
                            </div>
                        </div>

                    </div>

                    <div className="modal-footer border-0 pt-0">
                        <button className="btn btn-light text-muted" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary px-4" onClick={saveProfile}>Save Profile</button>
                    </div>
                </div>
            </div>
        </div>
    );
}