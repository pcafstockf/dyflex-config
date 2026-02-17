import {lodashGet, lodashMergeWith, lodashSet, lodashUnionWith, lodashIsEqual} from './lodash-imports';

/**
 * A unique marker used as the default value for lodashGet.
 */
const DoesNotHave = Symbol('DoesNotHave');

/**
 * Deep merge objects with directive-based control over merge behavior.
 *
 * Supported key prefixes:
 * - `!` - Force replace (always overwrites target)
 * - `~` - Conditional replace (only if target key exists)
 * - `%` - Deep merge arrays element-by-element
 * - `-` - Remove array elements (removes srcValue items from target array)
 *
 * Arrays without prefixes are merged with union semantics (no duplicates).
 *
 * @example
 * ```typescript
 * const config = {
 *   server: { port: 3000, host: 'localhost' },
 *   features: ['auth', 'logging'],
 *   plugins: ['core', 'deprecated'],
 *   items: [{ id: 1, name: 'old' }, { id: 2, name: 'keep' }]
 * };
 *
 * const result = mergeViaDirectives(config, {
 *   '!server': { port: 8080 },              // ! force replace (ignores 'host')
 *   '~features': ['monitoring'],            // ~ conditional replace (features exists)
 *   '~missing': ['wontAppear'],             // ~ won't replace (missing doesn't exist)
 *   '%items': [{ id: 1, name: 'new' }],     // % deep merge array elements by index
 *   '-plugins': ['deprecated'],             // - remove 'deprecated' from plugins
 *   tags: ['production']                    // no prefix = normal deep merge
 * });
 *
 * // Result:
 * // {
 * //   server: { port: 8080 },                    // replaced, 'host' gone
 * //   features: ['monitoring'],                  // replaced conditionally
 * //   plugins: ['core'],                         // 'deprecated' removed
 * //   items: [{ id: 1, name: 'new' }, { id: 2, name: 'keep' }],
 * //   tags: ['production']
 * // }
 * ```
 */
export function mergeViaDirectives<TObject, TSource>(object: TObject, source: TSource): TObject & TSource {
	let deletes: (() => void)[] = [];
	const mergerFn = (objValue: any, srcValue: any, key: string, object: any) => {
		if (key?.startsWith('!')) {
			deletes.push(() => {
				delete object[key];
			});
			object[key.substring(1)] = srcValue;
		}
		else if (key?.startsWith('~')) {
			if (object[key.substring(1)])
				object[key.substring(1)] = srcValue;
			deletes.push(() => {
				delete object[key];
			});
		}
		else if (Array.isArray(srcValue)) {
			if (key?.startsWith('%')) {
				object[key.substring(1)] = lodashMergeWith(object[key.substring(1)], srcValue, mergerFn);
				deletes.push(() => {
					delete object[key];
				});
			}
			else if (key?.startsWith('-')) {
				const existing = object[key.substring(1)];
				const tbr = new Set(srcValue);
				for (let i = existing.length - 1; i >= 0; i--) {
					if (tbr.has(existing[i]))
						existing.splice(i, 1);
				}
				deletes.push(() => {
					delete object[key];
				});
			}
			else
				return lodashUnionWith(objValue, srcValue, lodashIsEqual);
		}
		return undefined;
	};
	const result = lodashMergeWith(object, source, mergerFn);
	deletes.forEach(d => d());
	return result;
}

/**
 * Merge additional data into a configuration.
 * Normally data properties that resolve to undefined are skipped if a config value exists.
 * However, data properties whose name begins with a ! bang, are forcefully replaced (minus the bang of course) with the data property value regardless (e.g. null, undefined, etc.).
 * It is possible to merge 'src' into a sub-node of 'dst' by providing a 'mergePoint' in lodash property path notation.
 */
export function mergeConfig<T extends object>(dst: T, src: object, mergePoint?: string): T {
	if (!dst)
		dst = {} as T;
	let mp = dst;
	// noinspection SuspiciousTypeOfGuard
	if (typeof mergePoint === 'string' && mergePoint) {
		// Remember, the 3rd param is a default value, so if we get back the default, there was nothing at the merge point.
		mp = lodashGet(dst, mergePoint, DoesNotHave) as any;
		// If there was nothing at the merge point, then just set the value.  Otherwise, fall through to merge below.
		if ((mp as any) === DoesNotHave) {
			lodashSet(dst, mergePoint, src);
			return dst;
		}
	}
	return mergeViaDirectives(mp, src);
}

/**
 * Convenience to merge multiple configuration objects in a single go.
 * If any of the configs to be merged is an array, it will be interpreted as ['merge-point', src].
 * Otherwise, each element will be merged as itself.
 */
export function mergeConfigs<T extends object>(dst: T, src: (object | [string, object])[]): T {
	src.forEach(s => {
		if (Array.isArray(s))
			dst = mergeConfig(dst, s[1], s[0]);
		else if (typeof s === 'object' && s)
			dst = mergeConfig(dst, s);
	});
	return dst as T;
}
