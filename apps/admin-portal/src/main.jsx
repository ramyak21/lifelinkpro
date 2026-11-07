import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "@lifelink/shared/context/AuthProvider";
import ToastProvider from "@lifelink/shared/components/ui/ToastProvider";
import { configureSession } from "@lifelink/shared/services/session";
import "@lifelink/shared/styles/global.css";

// The admin portal keeps its own session, separate from a member session in the user portal
configureSession({ tokenKey: "lifelink.admin.token", userKey: "lifelink.admin.user" });

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
