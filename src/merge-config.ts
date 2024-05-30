import {get as lodashGet, mergeWith as lodashMergeWith, set as lodashSet, union as lodashUniton} from 'lodash';

/**
 * A unique marker used as the default value for lodashGet.
 */
const DoesNotHave = Symbol('DoesNotHave');

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
	const deletes: (() => void)[] = [];
	lodashMergeWith(mp, src, (objValue, srcValue, key, object) => {
		if (key?.startsWith('!')) {
			deletes.push(() => {
				delete object[key];
			});
			object[key.substring(1)] = srcValue;
		}
		else if (Array.isArray(objValue))
			return lodashUniton(objValue, srcValue);
		return undefined;
	});
	deletes.forEach(d => d());
	return dst;
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
