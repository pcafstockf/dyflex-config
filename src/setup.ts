import {evalConfig} from './eval-config';
import {keyValueToConfig} from './kvp-to-config';
import {mergeConfig} from './merge-config';
import {discoverInitializers, invokeInitializers} from './process-initializers';

export {keyValueToConfig, mergeConfig, evalConfig, discoverInitializers, invokeInitializers};

/**
 * Options for @see makeConfig
 */
export interface ConfigOpts<CTX = any> {
	/**
	 * The callback will be invoked for each sub-object discovered in the configuration that has a @see RegisterConfigMarker property.
	 * This callback is typically used to bind the configuration into a dependency injection container.
	 * @param key   The *value* of the @see RegisterConfigMarker property (which must be a string) converted via Symbol.for().
	 * @param obj   The object that contained the @see RegisterConfigMarker property.
	 * @param path  The location of the 'obj' within the configuration.
	 */
	evalCb?: (key: symbol, obj: object, path: string[]) => void;
	/**
	 * Allows for caller defined interpolation functions.
	 * @see evalConfig
	 */
	evalExt?: Record<string, (v: any) => any>;
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
 */
export async function makeConfig<CONF extends object = object, CTX = any>(conf: CONF, opts: ConfigOpts<CTX>, ...overrides: object[]) {
	if (!conf)
		conf = {} as CONF;
	overrides?.forEach(c => {
		if (Array.isArray(c))
			mergeConfig<CONF>(conf, c[1], c[0]);
		else if (c && typeof c === 'object')
			mergeConfig<CONF>(conf, c);
	});
	evalConfig(conf, opts.evalCb, opts.evalExt);
	if (opts.ctx) {
		const initializers = discoverInitializers(conf);
		await invokeInitializers(opts.ctx, initializers);
	}
	return conf;
}
