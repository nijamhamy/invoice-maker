import React, { useEffect, useState, Suspense, lazy } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";

import { App as CapacitorApp } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Toast } from "@capacitor/toast";
import { Capacitor } from "@capacitor/core";
import {
  AdMob,
  BannerAdSize,
  BannerAdPosition,
  BannerAdPluginEvents,
} from "@capacitor-community/admob";
import { SafeArea } from "@aashu-dubey/capacitor-statusbar-safe-area";

import FooterNav from "./components/FooterNav";
import { getSettings } from "./utils/settings";
import { getData } from "./utils/storage";
import {
  initRevenueCat,
  getCustomerSubscriptionStatus,
} from "./services/revenuecat";

const Home = lazy(() => import("./pages/Home"));
const Items = lazy(() => import("./pages/Items"));
const Clients = lazy(() => import("./pages/Clients"));
const Settings = lazy(() => import("./pages/Settings"));
const Premium = lazy(() => import("./pages/Premium"));
const InvoiceCreate = lazy(() => import("./pages/InvoiceCreate"));
const Reports = lazy(() => import("./pages/Reports"));
const PreviewPDF = lazy(() =>
  import("./pages/PreviewPDF").catch((error) => {
    console.error("Failed to load PreviewPDF:", error);
    window.location.reload();
    return { default: () => null };
  })
);
const ClientCreate = lazy(() => import("./pages/Clients"));

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(false);
  const [isBannerLoaded, setIsBannerLoaded] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);
  const [statusBarHeight, setStatusBarHeight] = useState(0);
  const [adInitialized, setAdInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const BANNER_AD_ID = "ca-app-pub-8553625771070050/3797533299";

  useEffect(() => {
    let t;
    if (Capacitor.isNativePlatform()) {
      t = setTimeout(() => SplashScreen.hide().catch(() => { }), 1800);
    }
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const getHeight = async () => {
      if (!Capacitor.isNativePlatform()) {
        setStatusBarHeight(0);
        return;
      }

      try {
        const { height } = await SafeArea.getStatusBarHeight();
        const h = Math.round(Number(height || 0));
        if (h > 0) {
          setStatusBarHeight(h);
          return;
        }
      } catch (e) {
        console.warn("SafeArea status bar height failed:", e);
      }

      try {
        const el = document.createElement("div");
        el.style.cssText =
          "position:fixed;top:env(safe-area-inset-top,0px);height:0;width:0;visibility:hidden;pointer-events:none;";
        document.body.appendChild(el);
        const computedTop = parseFloat(getComputedStyle(el).top || "0");
        document.body.removeChild(el);
        const fallback = Math.round(computedTop || 24);
        setStatusBarHeight(fallback > 0 ? fallback : 24);
      } catch {
        setStatusBarHeight(24);
      }
    };

    getHeight();
  }, []);

  useEffect(() => {
    const applyTheme = async () => {
      const savedSettings = getData("appSettings") || getSettings();
      const isDark = !!savedSettings?.darkMode;
      setDarkMode(isDark);

      document.body.classList.toggle("dark-mode", isDark);
      document.documentElement.classList.toggle("dark-mode", isDark);
      document.body.classList.toggle("light-mode", !isDark);
      document.documentElement.classList.toggle("light-mode", !isDark);
      document.body.setAttribute("data-theme", isDark ? "dark" : "light");
      document.documentElement.setAttribute(
        "data-theme",
        isDark ? "dark" : "light"
      );

      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.setOverlaysWebView({ overlay: false });
          await StatusBar.setStyle({
            style: isDark ? Style.Dark : Style.Light,
          });

          if (Capacitor.getPlatform() === "android") {
            await StatusBar.setBackgroundColor({
              color: isDark ? "#121212" : "#ffffff",
            });
          }

          await StatusBar.show();
        } catch (e) {
          console.error("StatusBar error:", e);
        }
      }
    };

    applyTheme();
    window.addEventListener("storage", applyTheme);
    window.addEventListener("theme-change", applyTheme);

    return () => {
      window.removeEventListener("storage", applyTheme);
      window.removeEventListener("theme-change", applyTheme);
    };
  }, []);

  useEffect(() => {
    const refreshSubscription = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        await initRevenueCat();
        const subscribed = await getCustomerSubscriptionStatus();
        setIsSubscribed(subscribed);
      } catch (e) {
        console.error("RevenueCat refresh failed:", e);
      }
    };

    refreshSubscription();
    window.addEventListener("subscription-updated", refreshSubscription);

    return () => {
      window.removeEventListener("subscription-updated", refreshSubscription);
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (statusBarHeight === 0) return;

    const initAdMob = async () => {
      try {
        await AdMob.initialize({
          initializeForAds: true,
          requestTrackingAuthorization: false,
        });
        setAdInitialized(true);
      } catch (e) {
        console.error("AdMob initialize failed:", e);
      }
    };

    initAdMob();
  }, [statusBarHeight]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!adInitialized) return;

    let loadedListener;
    let failedListener;
    let sizeChangedListener;

    const isPreviewPage = location.pathname.startsWith("/invoice/preview/");

    const manageBanner = async () => {
      try {
        loadedListener && (await loadedListener.remove());
        failedListener && (await failedListener.remove());
        sizeChangedListener && (await sizeChangedListener.remove());
      } catch (_) { }

      if (isPreviewPage || isSubscribed) {
        try {
          await AdMob.removeBanner();
        } catch (_) { }
        setIsBannerLoaded(false);
        setBannerHeight(0);
        return;
      }

      try {
        sizeChangedListener = await AdMob.addListener(
          BannerAdPluginEvents.SizeChanged,
          (size) => {
            const h = Number(size?.height || 0);
            if (h > 0) {
              setBannerHeight(h);
              setIsBannerLoaded(true);
            } else {
              setBannerHeight(0);
              setIsBannerLoaded(false);
            }
          }
        );

        loadedListener = await AdMob.addListener(
          BannerAdPluginEvents.Loaded,
          () => {
            setIsBannerLoaded(true);
            setBannerHeight((prev) => (prev > 0 ? prev : 60));
          }
        );

        failedListener = await AdMob.addListener(
          BannerAdPluginEvents.FailedToLoad,
          (error) => {
            console.warn("Banner failed to load:", error);
            setIsBannerLoaded(false);
            setBannerHeight(0);
          }
        );

        const isAndroid = Capacitor.getPlatform() === "android";
        const topBannerMargin = isAndroid
          ? Math.max(0, statusBarHeight - 6)
          : statusBarHeight;

        await AdMob.showBanner({
          adId: BANNER_AD_ID,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.TOP_CENTER,
          margin: topBannerMargin,
          isTesting: false,
        });
      } catch (e) {
        console.error("AdMob showBanner error:", e);
        setIsBannerLoaded(false);
        setBannerHeight(0);
      }
    };

    manageBanner();

    return () => {
      (async () => {
        try {
          loadedListener && (await loadedListener.remove());
          failedListener && (await failedListener.remove());
          sizeChangedListener && (await sizeChangedListener.remove());
        } catch (_) { }
      })();
    };
  }, [location.pathname, adInitialized, statusBarHeight, isSubscribed]);

  useEffect(() => {
    let backHandler;

    const initBackButton = async () => {
      let lastBackPress = 0;

      backHandler = await CapacitorApp.addListener(
        "backButton",
        async ({ canGoBack }) => {
          const openOffcanvas = document.querySelector(".offcanvas.show");
          if (openOffcanvas && window.bootstrap) {
            const inst =
              window.bootstrap.Offcanvas.getInstance(openOffcanvas);
            if (inst) {
              inst.hide();
              return;
            }
          }

          const openModal = document.querySelector(".modal.show");
          if (openModal && window.bootstrap) {
            const inst = window.bootstrap.Modal.getInstance(openModal);
            if (inst) {
              inst.hide();
              return;
            }
          }

          const isHome =
            location.pathname === "/" || location.pathname === "/home";

          if (!isHome && canGoBack) {
            navigate(-1);
            return;
          }

          if (!isHome && !canGoBack) {
            navigate("/", { replace: true });
            return;
          }

          const now = Date.now();
          if (now - lastBackPress < 2000) {
            CapacitorApp.exitApp();
          } else {
            lastBackPress = now;
            await Toast.show({ text: "Press back again to exit" });
          }
        }
      );
    };

    if (Capacitor.isNativePlatform()) initBackButton();

    return () => {
      if (backHandler) backHandler.remove();
    };
  }, [location.pathname, navigate]);

  const hideFooterPages = [
    "/invoice/new",
    "/invoice/edit/",
    "/invoice/preview/",
  ];
  const shouldHideFooter = hideFooterPages.some((p) =>
    location.pathname.startsWith(p)
  );
  const isPreviewPdfPage = location.pathname.startsWith("/invoice/preview/");

  const spacerHeight = isPreviewPdfPage || isSubscribed
    ? 0
    : isBannerLoaded
      ? (bannerHeight || 60) + 2
      : 0;

  const footerSpace = "calc(76px + env(safe-area-inset-bottom, 0px))";
  const bgColor = darkMode ? "#121212" : "#ffffff";

  return (
    <div
      className={`app-container d-flex flex-column ${darkMode ? "dark-mode" : "light-mode"
        }`}
      data-theme={darkMode ? "dark" : "light"}
      style={{
        height: "100dvh",
        overflow: "hidden",
        backgroundColor: darkMode ? "#121212" : "#f8f9fb",
      }}
    >
      <div
        className="d-flex flex-column mx-auto w-100 h-100 position-relative"
        style={{
          maxWidth: "768px",
          overflow: "hidden",
          backgroundColor: bgColor,
        }}
      >
        <div
          className="ad-banner-spacer flex-shrink-0"
          style={{
            height: `${spacerHeight}px`,
            transition: "height 0.3s ease",
            backgroundColor: bgColor,
            borderBottom:
              spacerHeight > 0
                ? darkMode
                  ? "1px solid rgba(255,255,255,0.06)"
                  : "1px solid rgba(0,0,0,0.08)"
                : "none",
            position: "relative",
          }}
        >
          {spacerHeight > 0 && (
            <span
              className="badge bg-light text-muted border"
              style={{
                position: "absolute",
                bottom: 3,
                left: 6,
                fontSize: "9px",
                fontWeight: "500",
                pointerEvents: "none",
              }}
            >
              AD
            </span>
          )}
        </div>

        <div
          className="flex-grow-1 w-100 position-relative"
          style={{
            minHeight: 0,
            overflow: "hidden",
            paddingBottom: shouldHideFooter ? "0px" : footerSpace,
          }}
        >
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/items" element={<Items />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/invoice/new" element={<InvoiceCreate />} />
              <Route path="/invoice/edit/:id" element={<InvoiceCreate />} />
              <Route path="/invoice/preview/:id" element={<PreviewPDF />} />
              <Route path="/clients/create" element={<ClientCreate />} />
            </Routes>
          </Suspense>
        </div>

        {!shouldHideFooter && <FooterNav />}
      </div>
    </div>
  );
}