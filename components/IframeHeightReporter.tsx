"use client";

import { useEffect } from "react";

export function IframeHeightReporter() {
  useEffect(() => {
    const sendHeight = () =>
      window.parent.postMessage(
        { type: "IFRAME_HEIGHT", height: document.body.scrollHeight },
        "*"
      );

    sendHeight();
    const ro = new ResizeObserver(sendHeight);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  return null;
}
