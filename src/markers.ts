/**
 * Common prefix for all dyflex-config marker keys embedded in configuration objects.
 */
export const ConfigMarkerPrefix = '__conf_';
/**
 * When a config sub-object contains this key (with a string value), that fragment is registered via the registrar callback (typically DI binding).
 * The string value is converted to Symbol.for() at eval time (not merge time), because external config formats (JSON, YAML, .env, etc.) cannot represent Symbols.
 * Symbol.for() provides a deterministic, globally shared key that any code can resolve without a shared import.
 */
export const RegisterConfigMarker = `${ConfigMarkerPrefix}register`;
/**
 * When a config sub-object contains this key (with an {@link InitializerDesc} value), the initializer function is extracted and invoked after config is fully built.
 */
export const InitializeMarker = `${ConfigMarkerPrefix}init`;
