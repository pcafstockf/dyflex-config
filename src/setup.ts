import {evalConfig, OnEvalErrorFn} from './eval-config';
import {keyValueToConfig} from './kvp-to-config';
import {mergeConfig, mergeConfigs} from './merge-config';
import {discoverInitializers, invokeInitializers} from './process-initializers';

export {keyValueToConfig, mergeConfig, evalConfig, discoverInitializers, invokeInitializers};

/**
 * Options for @see makeConfig
 */
export interface ConfigOpts<CTX = any> {
	/**
	 * The callback will be invoked in one of two ways.
	 * For each sub-object discovered in the configuration that has a @see RegisterConfigMarker property.
	 *  Typically used to bind the configuration into a dependency injection container.
	 * When library internals need to retrieve a previously bound configuration object.
	 * @param key   The *value* of the @see RegisterConfigMarker property (which must be a string) converted via Symbol.for().
	 * @param obj   The object that contained the @see RegisterConfigMarker property.
	 * @param path  The location of the 'obj' within the configuration.
	 * @returns     void *or* the previously bound configuration object.
	 */
	evalCb?: {
		(key: symbol, obj: object, path: string[]): void;
		(key: symbol): object;
	};
	/**
	 * Allows for caller defined interpolation functions.
	 * @see evalConfig
	 */
	evalExt?: Record<string, (v: any) => any>;
	/**
	 * Optional callback invoked when a helper function fails during template interpolation.
	 * If provided, its return value is always used as the replacement (even if undefined).
	 * If not provided, the original input is returned on failure.
	 * If the callback throws, the error propagates immediately (fail-fast).
	 * @see OnEvalErrorFn
	 */
	onEvalError?: OnEvalErrorFn;
	/**
	 * If truthy, this will trigger both:
	 *  @see discoverInitializers
	 *  @see invokeInitializers
	 * Typically this is the dependency injection container.
	 */
	ctx?: CTX;
}

/**
 * All in one helper to configure your application.
 * @param conf  Your default configuration object (typically a TypeScript/JavaScript literal object).
 * @param opts  See the individual properties of @see ConfigOpts.
 * @param overrides A variadic array of configuration objects.
 *                   If an element is itself an array, it will be interpreted as ['merge.point', configObj].
 *                   Otherwise, if an element is *not* an object, it will be ignored.
 *                   NOTE: Overrides containing Promises (e.g. from loadConfigFile) must be awaited by the caller before passing.
 *                   Example: ['mysql', await loadConfigFile('.env')]
 * @returns The same conf object, now fully merged, interpolated, and (if ctx was provided) initialized.
 */
export async function makeConfig<CONF extends object = object, CTX = any>(conf: CONF, opts: ConfigOpts<CTX> = {}, ...overrides: object[]) {
	if (!conf)
		conf = {} as CONF;
	mergeConfigs(conf, overrides);
	evalConfig(conf, opts.evalCb, opts.evalExt, opts.onEvalError);
	if (opts.ctx) {
		const initializers = discoverInitializers(conf);
		await invokeInitializers(opts.ctx, initializers);
	}
	return conf;
}
