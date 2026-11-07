// Turns an API error into a message that is safe and useful to show people.
// The API already returns short, sanitised messages for 4xx errors; anything
// unexpected falls back to a friendly sentence (never a raw Axios/SQL error).
export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const response = error?.response;

  if (!response) {
    return error?.request
      ? "We couldn't reach the LifeLink Pro server. Check your connection and try again."
      : fallback;
  }

  if (response.status >= 500) {
    return fallback;
  }

  const message = response.data?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}
