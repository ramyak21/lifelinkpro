import { useEffect } from "react";

const APP_TITLE = "LifeLink Pro";

// Sets the browser tab title for the current page
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_TITLE}` : `${APP_TITLE} — Community services platform`;
  }, [title]);
}
