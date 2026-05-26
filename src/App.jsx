import React, { useEffect, useRef, useState, Suspense, lazy } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";

import { App as CapacitorApp } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Toast } from "@capacitor/toast";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { EdgeToEdge } from "@capawesome/capacitor-android-edge-to-edge-support";
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
  const [disableTopBanner, setDisableTopBanner] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);

  const bannerVisibleRef = useRef(false);
  const listenersRef = useRef({
    loaded: null,
    failed: null,
    sizeChanged: null,
  });

  const BANNER_AD_ID = "ca-app-pub-8553625771070050/3797533299";

  const isPreviewPdfPage = location.pathname.startsWith("/invoice/preview/");
  const shouldHideBanner = isPreviewPdfPage || isSubscribed || disableTopBanner;

  useEffect(() => {
    let t;
    if (Capacitor.isNativePlatform()) {
      t = setTimeout(() => SplashScreen.hide().catch(() => { }), 1800);
    }
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const checkDevice = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        const info = await Device.getInfo();
        setDeviceInfo(info);

        const manufacturer = (info.manufacturer || "").toLowerCase();
        const model = (info.model || "").toLowerCase();
        const osVersion = String(info.osVersion || "");
        const platform = info.platform || "";

        console.log(
          "DEVICE INFO => " +
          JSON.stringify({
            manufacturer,
            model,
            osVersion,
            platform,
          })
        );

        const blockedDevices = [
          { manufacturer: "motorola", modelIncludes: "moto g60" },
          { manufacturer: "motorola", modelIncludes: "g60" },
        ];

        const isBlocked = blockedDevices.some(
          (d) =>
            manufacturer.includes(d.manufacturer) &&
            model.includes(d.modelIncludes)
        );

        setDisableTopBanner(isBlocked);

        console.log(
          "TOP BANNER DEVICE CHECK => " +
          JSON.stringify({
            isBlocked,
            manufacturer,
            model,
            osVersion,
          })
        );
      } catch (e) {
        console.error("Device info read failed:", e);
        setDisableTopBanner(false);
      }
    };

    checkDevice();
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
      document.body.setAttribute("data-bs-theme", isDark ? "dark" : "light");
      document.documentElement.setAttribute(
        "data-bs-theme",
        isDark ? "dark" : "light"
      );

      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      document.body.style.colorScheme = isDark ? "dark" : "light";
      document.documentElement.style.backgroundColor = isDark ? "#121212" : "#ffffff";
      document.body.style.backgroundColor = isDark ? "#121212" : "#ffffff";

      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.setOverlaysWebView({ overlay: false });

          if (Capacitor.getPlatform() === "android") {
            await EdgeToEdge.setBackgroundColor({
              color: isDark ? "#121212" : "#ffffff",
            });
          }

          await StatusBar.setStyle({
            style: isDark ? Style.Dark : Style.Light,
          });

          await StatusBar.show();

          setTimeout(async () => {
            try {
              if (Capacitor.getPlatform() === "android") {
                await EdgeToEdge.setBackgroundColor({
                  color: isDark ? "#121212" : "#ffffff",
                });
              }

              await StatusBar.setStyle({
                style: isDark ? Style.Dark : Style.Light,
              });

              await StatusBar.show();
            } catch (_) { }
          }, 120);
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

    let isMounted = true;

    const addBannerListeners = async () => {
      if (
        listenersRef.current.loaded ||
        listenersRef.current.failed ||
        listenersRef.current.sizeChanged
      ) {
        return;
      }

      try {
        listenersRef.current.sizeChanged = await AdMob.addListener(
          BannerAdPluginEvents.SizeChanged,
          (size) => {
            if (!isMounted) return;
            const h = Math.ceil(Number(size?.height || 0));

            console.log(
              "ADMOB SizeChanged => " +
              JSON.stringify({
                height: h,
                raw: size,
                statusBarHeight,
                path: location.pathname,
                platform: Capacitor.getPlatform(),
              })
            );

            setBannerHeight(h);
            setIsBannerLoaded(h > 0);
          }
        );

        listenersRef.current.loaded = await AdMob.addListener(
          BannerAdPluginEvents.Loaded,
          () => {
            if (!isMounted) return;

            console.log(
              "ADMOB Loaded => " +
              JSON.stringify({
                statusBarHeight,
                path: location.pathname,
                platform: Capacitor.getPlatform(),
              })
            );

            bannerVisibleRef.current = true;
            setIsBannerLoaded(true);
          }
        );

        listenersRef.current.failed = await AdMob.addListener(
          BannerAdPluginEvents.FailedToLoad,
          (error) => {
            console.log(
              "ADMOB FailedToLoad => " + JSON.stringify(error, null, 2)
            );

            if (!isMounted) return;

            bannerVisibleRef.current = false;
            setIsBannerLoaded(false);
            setBannerHeight(0);
          }
        );
      } catch (e) {
        console.error("Banner listener setup error:", e);
      }
    };

    addBannerListeners();

    return () => {
      isMounted = false;

      (async () => {
        try {
          await listenersRef.current.loaded?.remove();
        } catch (_) { }
        try {
          await listenersRef.current.failed?.remove();
        } catch (_) { }
        try {
          await listenersRef.current.sizeChanged?.remove();
        } catch (_) { }

        listenersRef.current = {
          loaded: null,
          failed: null,
          sizeChanged: null,
        };

        try {
          await AdMob.removeBanner();
        } catch (_) { }

        bannerVisibleRef.current = false;
      })();
    };
  }, [adInitialized]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!adInitialized) return;

    const updateBannerVisibility = async () => {
      if (shouldHideBanner) {
        try {
          await AdMob.hideBanner();
        } catch (_) { }

        bannerVisibleRef.current = false;
        setIsBannerLoaded(false);
        setBannerHeight(0);

        console.log(
          "ADMOB Hidden => " +
          JSON.stringify({
            reason: isPreviewPdfPage
              ? "preview-page"
              : isSubscribed
                ? "subscribed"
                : disableTopBanner
                  ? "blocked-device"
                  : "unknown",
            statusBarHeight,
            path: location.pathname,
            platform: Capacitor.getPlatform(),
            deviceInfo,
          })
        );

        return;
      }

      if (bannerVisibleRef.current) {
        return;
      }

      try {
        console.log(
          "ADMOB ShowBanner Request => " +
          JSON.stringify({
            adId: BANNER_AD_ID,
            adSize: "ADAPTIVE_BANNER",
            position: "TOP_CENTER",
            margin: 0,
            statusBarHeight,
            path: location.pathname,
            platform: Capacitor.getPlatform(),
          })
        );

        await AdMob.showBanner({
          adId: BANNER_AD_ID,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.TOP_CENTER,
          margin: 0,
          isTesting: false,
        });

        bannerVisibleRef.current = true;
      } catch (e) {
        console.error("AdMob showBanner error:", e);
        bannerVisibleRef.current = false;
        setIsBannerLoaded(false);
        setBannerHeight(0);
      }
    };

    updateBannerVisibility();
  }, [
    adInitialized,
    shouldHideBanner,
    statusBarHeight,
    isPreviewPdfPage,
    isSubscribed,
    disableTopBanner,
    location.pathname,
    deviceInfo,
  ]);

  useEffect(() => {
    console.log(
      "APP Layout Debug => " +
      JSON.stringify({
        statusBarHeight,
        bannerHeight,
        isBannerLoaded,
        path: location.pathname,
        platform: Capacitor.getPlatform(),
        disableTopBanner,
      })
    );
  }, [
    statusBarHeight,
    bannerHeight,
    isBannerLoaded,
    location.pathname,
    disableTopBanner,
  ]);

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

  const spacerHeight = shouldHideBanner ? 0 : isBannerLoaded ? bannerHeight : 0;

  const footerSpace = "calc(76px + env(safe-area-inset-bottom, 0px))";
  const bgColor = darkMode ? "#121212" : "#ffffff";

  return (
    <div
      className={`app-container d-flex flex-column ${darkMode ? "dark-mode" : "light-mode"
        }`}
      data-theme={darkMode ? "dark" : "light"}
      data-bs-theme={darkMode ? "dark" : "light"}
      style={{
        height: "100dvh",
        overflow: "hidden",
        backgroundColor: darkMode ? "#121212" : "#ffffff",
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
            backgroundColor: bgColor,
          }}
        >
          <Suspense
            fallback={
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: bgColor,
                }}
              />
            }
          >
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