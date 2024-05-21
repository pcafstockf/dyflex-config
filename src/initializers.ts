/**
 * Default configurations (aka from object literals as opposed to json),
 * can declare functions that can be extracted from the configuration.
 * Typically, this is used by dependency injection to auto-wire the context root.
 * Configuration gets fully loaded / merged, evaluated, searched for initializers, and then each is invoked.
 * @param ctx   Provided by the caller of the initializer (usually the DI container).
 * @param path  Describes where in the configuration the initializer was found (using lodash property path notation).
 * @param obj   The object that contained the initializer.
 */
export type InitializerFn<T = any> = (ctx: T, path: string[], obj: object) => void | Promise<void>;

/**
 * This is what you embed in your Default configuration (aka object literal).
 * Note that this structure contains a function and therefore cannot be embedded in a textual configuration like json or yaml.
 * This is intentional.
 */
export interface InitializerDesc<T = any> {
	fn: InitializerFn<T>;
	/**
	 * Can be negative or positive.
	 * Defaults to zero.
	 * Initializer functions will be called in priority order, lowest to highest.
	 */
	priority?: number;
}
