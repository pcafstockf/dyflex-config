import JSON5 from 'json5';
import {lodashSet} from './lodash-imports';
import constants from 'node:constants';
import fs from 'node:fs';
import path from 'node:path';

const loadPropertiesReader = async () => {
	try {
		const pr = await import('properties-reader');
		return (pr.default || pr) as typeof import('properties-reader');
	}
	catch (e) {
	}
	return undefined;
};
const loadParseDotEnv = async () => {
	try {
		const dotenv = await import('dotenv');
		return dotenv.parse;
	}
	catch (e) {
	}
	return undefined;
};
const loadExpandDotEnv = async () => {
		try {
			const dotenvExpand = await import('dotenv-expand');
			return dotenvExpand.expand;
		}
		catch (e) {
		}
	return undefined;
};
const loadParseYaml = async () => {
	try {
		const yaml = await import('yaml');
		return yaml.parse;
	}
	catch (e) {
	}
	return undefined;
};

/**
 * Simple helper
 */
function unsupportedExtensionErr(ext: string) {
	const err: NodeJS.ErrnoException = new Error(`Unsupported file format '${ext}'`);
	err.errno = constants.ENOTSUP;
	err.code = 'ENOTSUP';
	return err;
}

/**
 * Similar to some of the 'fs' module overrides, you can pass a BufferEncoding, or an object (optionally containing a BufferEncoding), and data to be interpolated.
 * NOTE:
 *  Interpolation of data specific to the library being used to load the file.
 *      dotenv: Uses dotenv-expand.  If you want to include the current process.env as a data source, you must do so explicitly.
 *          loadConfigFile('.env', {...process.env, ...myData});
 */
export type LoadConfigFileOpts = BufferEncoding | {
	encoding?: BufferEncoding,
	data: any
}

/**
 * Load a supported *local* file as an object (e.g. json(5), yaml, properties, ini, .env).
 * WARNING:
 *   yaml, properties, ini, .env are all declared as "peer-dependencies".
 *   If you do not have these modules installed, this will throw an unsupported extension for those file types.
 * @param filepath  Full file path name to be loaded and parsed.
 * @param opts  @see LoadConfigFileOpts
 */
export async function loadConfigFile<T = object>(filepath: string, opts?: LoadConfigFileOpts): Promise<T> {
	const stat = await fs.promises.stat(filepath);
	if (!stat.isFile()) {
		const err: NodeJS.ErrnoException = new Error(`Not a file`);
		err.errno = constants.EISDIR;
		err.code = 'EISDIR:';
		throw err;
	}
	let encoding: BufferEncoding;
	if (typeof opts === 'string')
		encoding = opts as BufferEncoding;
	else {
		encoding = opts?.encoding ?? 'utf-8';
	}
	let obj: object = undefined as any;
	const filename = path.basename(filepath);
	let ext = path.extname(filename).toLowerCase();
	// Deal with files that actually start with a dot (e.g. ".env")
	if (filename.lastIndexOf('.') === 0)
		ext = path.extname('hack' + filename).toLowerCase();
	if (ext === '.properties' || ext === '.ini') {
		const propertiesReader = await loadPropertiesReader();
		if (!propertiesReader)
			throw unsupportedExtensionErr(ext);
		// These types of files support dotted keys.
		const reader = propertiesReader(filepath, encoding);
		obj = Object.keys(reader.getAllProperties()).reduce((obj, k) => {
			lodashSet(obj, k, reader.get(k));
			return obj;
		}, {});
	}
	else {
		const txt = await fs.promises.readFile(filepath, encoding || 'utf-8');
		switch (ext) {
			case '.env':
				const parseDotEnv = await loadParseDotEnv();
				if (!parseDotEnv)
					throw unsupportedExtensionErr(ext);
				obj = parseDotEnv(txt);
				const expandDotEnv = await loadExpandDotEnv();
				if (expandDotEnv) {
					const providedData = typeof opts === 'object' && opts.data ? opts.data : {};
					const expData = {
						processEnv: {
							...obj
						},
						parsed: {
							...obj,
							...providedData
						}
					};
					const tmp = expandDotEnv(expData as any) as any;
					obj = Object.keys(obj).reduce((p, key) => {
						p[key] = tmp.processEnv[key];
						return p;
					}, {} as Record<string, string>);
				}
				break;
			case '.yaml':
			case '.yml':
				const parseYaml = await loadParseYaml();
				if (!parseYaml)
					throw unsupportedExtensionErr(ext);
				obj = parseYaml(txt);
				break;
			case '.json':
			case '.json5':
				obj = JSON5.parse(txt);
				break;
			default:
				throw unsupportedExtensionErr(ext);
		}
	}
	return obj as T;
}

