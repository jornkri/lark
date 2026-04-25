import { useState, useEffect } from "react";
import LoginPage from "./components/LoginPage.jsx";
import MapViewComponent from "./components/MapView.jsx";
import ConfigPage from "./components/ConfigPage.jsx";
import { checkSignIn } from "./services/auth.js";
import { loadConfig, saveConfig } from "./services/appConfig.js";

export default function App() {
  const [signedIn, setSignedIn] = useState(null);
  const [page,     setPage]     = useState("map"); // "map" | "config"
  const [config,   setConfig]   = useState(loadConfig);

  useEffect(() => {
    checkSignIn().then(setSignedIn);
  }, []);

  function handleSaveConfig(newConfig) {
    saveConfig(newConfig);
    setConfig(newConfig);
  }

  if (signedIn === null) {
    return <div className="loading">Laster LARK...</div>;
  }

  if (!signedIn) {
    return <LoginPage onSignIn={() => setSignedIn(true)} />;
  }

  if (page === "config") {
    return (
      <ConfigPage
        config={config}
        onSave={handleSaveConfig}
        onBack={() => setPage("map")}
      />
    );
  }

  return (
    <MapViewComponent
      config={config}
      onSignOut={() => setSignedIn(false)}
      onOpenConfig={() => setPage("config")}
      onConfigUpdate={handleSaveConfig}
    />
  );
}
