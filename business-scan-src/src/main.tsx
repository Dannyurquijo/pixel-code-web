import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AmbientNetwork } from "./AmbientNetwork";
import { BusinessScan } from "./BusinessScan";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AmbientNetwork />
    <BusinessScan />
  </StrictMode>,
);
