"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker Club CJ enregistré :", reg.scope);
        })
        .catch((err) => {
          console.warn("Échec d'enregistrement du Service Worker :", err);
        });
    }
  }, []);

  return null;
}
