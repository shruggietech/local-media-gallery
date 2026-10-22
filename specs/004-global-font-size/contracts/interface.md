# Interface contract

View settings adds Field id font-scale labelled Global font size, options Default(100%), Small(90%), Smaller(80%). It is keyboard accessible and uses the current compact control geometry.

Existing load_settings/save_settings envelopes carry fontScale. Persist through the existing revision-checked native store. Legacy input without field means100; known invalid values are errors and never overwrite a prior valid file. This does not change root/media access commands.

All app text including viewer title/metadata inherits the selected body factor; the root rem baseline, media dimensions,12px masonry gaps and minimum control targets remain fixed. Native OS dialog and built-in video-control styling are outside the application text preference.
