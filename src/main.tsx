import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize i18n - wrapped to prevent blocking render
try {
  await import("./i18n");
} catch (e) {
  console.error("i18n init failed:", e);
}

console.log("App mounting...");
createRoot(document.getElementById("root")!).render(<App />);
console.log("App mounted.");
