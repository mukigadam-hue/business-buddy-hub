import { createRoot } from "react-dom/client";
import React from "react";
import { registerSW } from 'virtual:pwa-register';
import App from "./App.tsx";
import "./index.css";
import "./i18n";

registerSW({
  immediate: true,
  onRegisterError(error) {
    console.error('Service worker registration failed:', error);
  },
});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("App crash:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center" }}>
          <h2>Something went wrong</h2>
          <pre style={{ fontSize: 12, color: "red", whiteSpace: "pre-wrap" }}>
            {this.state.error?.message || "Unknown error"}
          </pre>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);