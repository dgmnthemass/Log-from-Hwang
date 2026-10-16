import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

async function start() {
  let app = <App />;
  if (import.meta.env.MODE === "toss") {
    const { TDSMobileAITProvider } = await import("@toss/tds-mobile-ait");
    app = (
      <TDSMobileAITProvider brandPrimaryColor="#0064FF">
        {app}
      </TDSMobileAITProvider>
    );
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>{app}</StrictMode>,
  );
}
void start().catch(() => {
  document.getElementById("root")!.textContent =
    "앱을 시작하지 못했어요. 연결을 확인한 뒤 새로고침해 주세요.";
});
