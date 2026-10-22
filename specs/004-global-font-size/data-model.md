# Data model

ViewSettings.fontScale is80|90|100, effective default100. Native persisted field font_scale serializes as fontScale, defaults100 only when omitted, rejects unsupported numbers/types/null. Existing version0.0.0 and formatVersion1 remain. Master schema property is optional, enum80/90/100 with default100. All existing preferences/compatible unknown fields retain their behavior.

Lifecycle: load -> apply factor -> explicit choice updates memory and queues save -> restart restores choice. Missing field does not trigger a save. Existing failure/conflict warnings remain. CSS root custom property stores factor0.8|0.9|1; html font-size is untouched.
