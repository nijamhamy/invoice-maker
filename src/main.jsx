import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

if (Capacitor.getPlatform() !== "web") {
  StatusBar.setOverlaysWebView({ overlay: false });

  StatusBar.setBackgroundColor({ color: "#ffffff" });

  // White background => dark icons/text
  StatusBar.setStyle({ style: Style.Dark });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);