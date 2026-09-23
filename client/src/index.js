import React from "react";
import ReactDOM from "react-dom/client";
// All CSS, eagerly and in a fixed order; must come before any component import
// (see appStyles.js for why).
import "./appStyles.js";
import App from "./App.jsx";
import reportWebVitals from "./reportWebVitals.js";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
