import { useState, useEffect } from "react";
import LoginPage from "./components/LoginPage.jsx";
import MapViewComponent from "./components/MapView.jsx";
import { checkSignIn } from "./services/auth.js";

export default function App() {
  const [signedIn, setSignedIn] = useState(null);

  useEffect(() => {
    checkSignIn().then(setSignedIn);
  }, []);

  if (signedIn === null) {
    return <div className="loading">Laster LARK...</div>;
  }

  return signedIn
    ? <MapViewComponent onSignOut={() => setSignedIn(false)} />
    : <LoginPage onSignIn={() => setSignedIn(true)} />;
}
