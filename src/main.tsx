import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./theme/tokens.css";
import App from "./App.tsx";

const root = document.getElementById("root");
if (!root) {
	throw new Error("src/main.tsx: root element not found in document");
}

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
