import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "@lifelink/shared/context/AuthProvider";
import ToastProvider from "@lifelink/shared/components/ui/ToastProvider";
import { configureSession } from "@lifelink/shared/services/session";
import "@lifelink/shared/styles/global.css";

// Same storage keys the single-app version used, so existing member sessions survive the split
configureSession({ tokenKey: "token", userKey: "user" });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
