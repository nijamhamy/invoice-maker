import { NavLink } from "react-router-dom";

export default function FooterNav() {
    const NavItem = ({ to, icon, label }) => (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `text-decoration-none d-flex flex-column align-items-center justify-content-center flex-fill position-relative ${isActive ? "text-primary" : "text-secondary"
                }`
            }
            style={({ isActive }) => ({
                minHeight: "60px",
                paddingTop: "8px",
                paddingBottom: "8px",
                transition: "all 0.2s ease",
                fontWeight: isActive ? 700 : 500,
            })}
        >
            {({ isActive }) => (
                <>
                    <div
                        className="d-flex align-items-center justify-content-center rounded-circle"
                        style={{
                            width: "34px",
                            height: "34px",
                            backgroundColor: isActive ? "rgba(13, 110, 253, 0.10)" : "transparent",
                            transition: "all 0.2s ease",
                        }}
                    >
                        {icon}
                    </div>

                    <span
                        style={{
                            fontSize: "10px",
                            marginTop: "4px",
                            letterSpacing: "0.3px",
                            lineHeight: 1.1,
                        }}
                    >
                        {label}
                    </span>
                </>
            )}
        </NavLink>
    );

    return (
        <nav
            className="position-fixed bg-white border-top shadow-lg"
            style={{
                left: "50%",
                transform: "translateX(-50%)",
                bottom: 0,
                width: "100%",
                maxWidth: "768px",
                zIndex: 999,
                borderTopLeftRadius: "18px",
                borderTopRightRadius: "18px",
                paddingBottom: "max(8px, env(safe-area-inset-bottom, 0px))",
                boxShadow: "0 -8px 24px rgba(0,0,0,0.08)",
                backgroundColor: "#ffffff",
                willChange: "transform",
                overflow: "hidden",
            }}
        >
            <div
                className="d-flex justify-content-between align-items-stretch px-1"
                style={{
                    minHeight: "68px",
                }}
            >
                <NavItem
                    to="/"
                    label="Home"
                    icon={
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.1" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    }
                />

                <NavItem
                    to="/items"
                    label="Items"
                    icon={
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.1" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    }
                />

                <NavItem
                    to="/clients"
                    label="Clients"
                    icon={
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.1" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    }
                />

                <NavItem
                    to="/reports"
                    label="Reports"
                    icon={
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.1" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    }
                />

                <NavItem
                    to="/settings"
                    label="Settings"
                    icon={
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.1" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    }
                />
            </div>
        </nav>
    );
}