import {template as lodashTemplate, TemplateExecutor, get as lodashGet, toPath as lodashToPath} from 'lodash';
import constants from 'node:constants';

/**
 * Helper to convert strings to false (pretty much any other string evaluates to truthy
 */
function isFalsy(v: any) {
	if (typeof v === 'string') {
		switch (v.toLowerCase()) {
			case 'no':
			case 'false':
			case '0':
			case '':
				return true;
		}
	}
	else if (typeof v === 'boolean')
		return !v;
	else if (typeof v === 'number' || typeof v === 'object')
		return !v;
	return false;
}

/**
 * WARNING:
 * The registrar function is called TWO different ways.
 * The first (and most common way) is to register (aka associate) an object (value) with the symbol (key).
 * The second way 'obj' and 'path' will be undefined and the intent is to **return** the object previously associated with 'symbol'.
 */
export type RegistrarFn = (key: symbol, obj: object | undefined, path: string[] | undefined) => void | any

/**
 * Walk the configuration looking for markers, as well as strings that should be interpolated.
 *
 * @param config    The fully merged configuration.
 * @param register  User provided hook invoked for any object containing the '__reg_config' property.
 *                   Typically used to bind into a Dependency Injection Container.
 *                   @see RegistrarFn
 * @param evalExt   Allows for caller defined interpolation functions.
 *                   Each key *must* be of the form [A-Za-z\d_$]+ and will be hung off the 'fn.' object during template interpolation.
 *                   Remember, that ultimately what goes back to the templating engine must be a string.
 *                   Your extension [e.g. fn.syncFileReader("/my-path")] must either return a string, or wrap itself with fn.asNum, fn.asBool, or fn.asJs.
 */
export function evalConfig<T extends object>(
	config: T,
	registrar?: RegistrarFn,
	evalExt?: Record<string, (v: any) => any>
): T {
	const interpolateExpr = /<%=\s*([\s\S]+?)\s*%>/;
	const evalExpr = /<%=\s*(fn.[A-Za-z\d_$]+\([\s\S]+?\);?)\s*%>/;
	const propPath: string[] = [];
	// Helper function to process an object in the config hierarchy.
	const deepProcess = (obj: any) => {
		let propKey: PropertyKey;
		for (propKey in obj) {
			// Look for markers and process relevant ones.
			if (typeof propKey === 'string' && propKey.startsWith('__conf_')) {
				switch (propKey) {
					case '__conf_register':
						// This little snippet allows us to use our "default config as code" infrastructure to automatically bind sub-configurations.
						if (typeof obj[propKey] === 'string')
							obj[propKey] = Symbol.for(obj[propKey]);
						if (typeof obj[propKey] === 'symbol' && registrar) {
							const key = obj[propKey];
							delete obj[propKey];
							registrar(key, obj, propPath);
						}
						break;
					default:
						break;
				}
			}
			else {
				propPath.push(String(propKey));
				if (typeof obj[propKey] === 'string') {
					const origValue = obj[propKey].trim();
					// The value is a string and therefore could be interpolated, see if it matches.
					if (interpolateExpr.test(origValue) || evalExpr.test(origValue)) {
						const propKeyPath = propPath.slice();
						let templateFn: TemplateExecutor;
						try {
							// Good match.  Build a lodash template for it and re-define the objects property as an accessor that invokes the lodash template function.
							templateFn = lodashTemplate(origValue, {
								interpolate: interpolateExpr,
								evaluate: evalExpr,
								variable: undefined as any
							});
						}
						catch (e) {
							const err: NodeJS.ErrnoException = new Error(`Unable to eval config at ${propPath.join('->')}`);
							err.errno = constants.EINVAL;
							err.code = 'EINVAL';
							(err as any).cause = e;
							throw err;
						}
						Object.defineProperty(obj, propKey, {
							get: () => {
								try {
									let converter: (() => any) | undefined;
									// noinspection JSUnusedGlobalSymbols
									let val: any = templateFn({
										config: config,
										// Remember that all template interpolation must come back as a string.
										// We set the converter
										fn: Object.assign({
											// Some helper functions that allow us to return all json types from interpolation (not just more strings).
											asNum: (v: any) => {
												converter = () => {
													if (v === 'null' || v === null)
														return null;
													if (v === 'undefined' || typeof v === 'undefined')
														return undefined;
													if (v === 'NaN' || isNaN(v))
														return NaN;
													if (v === 'Infinity' || (!isFinite(v)))
														return Infinity;
													return Number(v);
												};
												return String(v);
											},
											asBool: (v: any) => {
												converter = () => {
													if (v === 'null' || v === null)
														return null;
													if (v === 'undefined' || typeof v === 'undefined')
														return undefined;
													if (typeof v === 'boolean')
														return v;
													if (isFalsy(v))
														return false;
													return Boolean(v);
												};
												return String(v);
											},
											fromEnv: (v: any) => {
												if (typeof v === 'string' && typeof process.env[v] === 'string')
													return process.env[v];
												return undefined;
											},
											asJs: (v: any) => {
												converter = () => v;
												// It doesn't matter, the converter is set and will give us what we ultimately want back.
												try {
													return 'JsPlaceHolder';
												}
												catch (e) {
													return 'TypeError';
												}
											},
											relTo: (v: any) => {
												if (typeof v === 'string' && v) {
													if (v.startsWith('.')) {
														const myPath = propKeyPath.slice();
														while (v.startsWith('.')) {
															myPath.pop();
															v = v.substring(1);
														}
														const targetPath = myPath.concat(...lodashToPath(v));
														return lodashGet(config, targetPath, undefined);
													}
													else {
														const dotIdx = v.indexOf('.');
														const bracketIdx = v.indexOf('[');
														const idx = Math.min(dotIdx !== -1 ? dotIdx : Infinity, // If '.' not found, set index to Infinity
															bracketIdx !== -1 ? bracketIdx : Infinity // If '[' not found, set index to Infinity
														);
														const symName = v.substring(0, idx);
														let target = registrar(Symbol.for(symName), undefined, undefined);
														if (typeof target !== 'undefined') {
															if (idx < v.length)
																return lodashGet(target, lodashToPath(v.substring(idx + 1)), undefined);
															return target;
														}
													}
												}
												else if (typeof v === 'symbol')
													return registrar(v, undefined, undefined);
												return undefined;
											}
										}, evalExt ?? {})
									});
									if (converter)
										val = converter();
									return val;
								}
								catch (e) {
									let err: NodeJS.ErrnoException;
									if (e instanceof ReferenceError && e.message.toLowerCase().indexOf('undefined is not defined') >= 0)
										err = new Error(`Config property ${propKeyPath.join('.')} is not defined`);
									else
										err = new Error(`Unable to interpolate config ${propKeyPath.join('.')}`);
									err.errno = constants.EPROTO;
									err.code = 'EPROTO';
									(err as any).cause = e;
									throw err;
								}
							}
						});
					}
				}
				else if (typeof obj[propKey] === 'object' && obj[propKey])
					deepProcess(obj[propKey]);  // Recurse.
				propPath.pop();
			}
		}
		return obj;
	};
	// Walk the configuration hierarchy
	deepProcess(config);

	return config as any as T;
}
