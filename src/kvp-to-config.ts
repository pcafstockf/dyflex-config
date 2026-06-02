import JSON5 from 'json5';
import {lodashSet} from './lodash-imports';

const defaultSepRegex = /=(.*)/s;

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Process key/value pairs of configuration related data.
 * The key is always assumed to be a valid lodash property path.
 * WARNING:
 *  The default key/value separator is '=' but can be anything that is *not* a valid lodash property path separator.
 *  The default pair delimiter is ';' but can be anything that does not conflict with the semantics of the separator.
 * If you pass an array of strings, they are assumed to be:
 *  ['key1=value1','key2=value2']
 * If you pass a string, it is assumed to be:
 *  'key1=value1;key2=value2'
 *
 * @param pairs  An array of 'key=value' strings, or a single delimited string of pairs.
 * @param sep    Key/value separator (default '=').  Regex metacharacters are escaped automatically.
 * @param delim  Pair delimiter when 'pairs' is a single string (default ';').
 * @returns A nested object constructed from the key/value pairs.
 * @throws {Error} If any pair has an empty key or an unparseable value.
 */
export function keyValueToConfig<T = object>(pairs: string[], sep?: string): T;
export function keyValueToConfig<T = object>(pairs: string, sep?: string, delim?: string): T;
export function keyValueToConfig<T = object>(pairs: string | string[], sep = '=', delim = ';'): T {
	if (!pairs)
		return {} as T;
	if (!Array.isArray(pairs)) {
		pairs = pairs.split(delim);
	}
	const regExpr = sep === '=' ? defaultSepRegex : new RegExp(`${escapeRegExp(sep)}(.*)`, 's');
	const cmdLineDefs = pairs.reduce((p: Record<string, any>, v: string) => {
		const kvp = v.trim().split(regExpr).filter(s => !!s);
		if (kvp.length !== 2 || (!kvp[0].trim() || (!kvp[1].trim())))
			throw new Error('Invalid property key: ' + v);
		try {
			const key = kvp[0].trim();
			p[key] = JSON5.parse(kvp[1].trim());
		}
		catch {
			throw new Error('Invalid property value for key: ' + kvp[0].trim());
		}
		return p;
	}, {});
	return Object.keys(cmdLineDefs).reduce((p, v) => {
		lodashSet(p, v, cmdLineDefs[v]);
		return p;
	}, {}) as T;
}
