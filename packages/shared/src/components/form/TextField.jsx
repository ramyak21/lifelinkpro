import FieldShell from "./FieldShell";

// <TextField label="Full name" {...form.field("name")} autoComplete="name" />
export default function TextField({ id, label, hint, error, optional, full, className, type = "text", ...inputProps }) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} full={full} className={className}>
      {(controlProps) => <input type={type} {...controlProps} {...inputProps} />}
    </FieldShell>
  );
}
