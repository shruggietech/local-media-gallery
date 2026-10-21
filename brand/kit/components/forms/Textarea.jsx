export function Textarea({ id, label, required = false, error, ...props }) {
  return (
    <div className="lo-field">
      <label className="lo-field__label" htmlFor={id}>{label}{required ? <span className="lo-field__required" aria-hidden="true"> *</span> : null}</label>
      <textarea className="lo-field__control" id={id} required={required} {...props} />
      {error ? <p className="lo-field__error" role="alert">{error}</p> : null}
    </div>
  );
}
