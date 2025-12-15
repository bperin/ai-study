"use client";

import { useEffect, useState } from "react";
import GenerationStatus from "./GenerationStatus";

export default function GlobalGenerationStatus() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Only access localStorage on the client side
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        // Simple JWT decode without library to avoid dependency
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        if (payload.sub) {
          setUserId(payload.sub);
        }
      } catch (e) {
        console.error("Failed to decode token for status", e);
      }
    }
  }, []);

  if (!userId) return null;

  return <GenerationStatus userId={userId} />;
}