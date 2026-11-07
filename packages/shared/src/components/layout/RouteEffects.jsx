import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// On navigation: scroll to the top and move focus to the main region, so
// keyboard and screen-reader users start reading the new page.
export default function RouteEffects() {
  const { pathname } = useLocation();
  const firstRender = useRef(true);

  useEffect(() => {
    window.scrollTo(0, 0);

    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
