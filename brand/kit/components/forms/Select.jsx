export function Select({ id, label, required = false, error, children, ...props }) {
  return (
    <div className="lo-field">
      <label className="lo-field__label" htmlFor={id}>{label}{required ? <span className="lo-field__required" aria-hidden="true"> *</span> : null}</label>
      <select className="lo-field__control" id={id} required={required} {...props}>{children}</select>
      {error ? <p className="lo-field__error" role="alert">{error}</p> : null}
    </div>
  );
}
