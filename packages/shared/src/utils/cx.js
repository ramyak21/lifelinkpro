// Joins class names, skipping falsy values: cx("a", isOn && "b") → "a b"
export default function cx(...classNames) {
  return classNames.filter(Boolean).join(" ");
}
