import {parse as parseJson5} from 'json5/lib';
import {lodashSet} from './lodash-imports';
import constants from 'node:constants';
import fs from 'node:fs';
import path from 'node:path';

type propertiesReaderType = typeof import('properties-reader') | undefined;
const propertiesReader = (function () {
	try {
		return require('properties-reader');
	}
	catch (e) {
	}
	return undefined;
})() as propertiesReaderType;
type parseDotEnvType = typeof import('dotenv').parse | undefined;
const parseDotEnv = (function () {
	try {
		return require('dotenv').parse;
	}
	catch (e) {
	}
	return undefined;
})() as parseDotEnvType;
type expandDotEnvType = typeof import('dotenv-expand').expand | undefined;
const expandDotEnv = (function () {
	if (parseDotEnv) {
		try {
			return require('dotenv-expand').expand;
		}
		catch (e) {
		}
	}
	return undefined;
})() as expandDotEnvType;
type parseYamlType = typeof import('yaml').parse | undefined;
const parseYaml = (function () {
	try {
		return require('yaml').parse;
	}
	catch (e) {
	}
	return undefined;
})() as parseYamlType;

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
				if (!parseDotEnv)
					throw unsupportedExtensionErr(ext);
				obj = parseDotEnv(txt);
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
				if (!parseYaml)
					throw unsupportedExtensionErr(ext);
				obj = parseYaml(txt);
				break;
			case '.json':
			case '.json5':
				obj = parseJson5(txt);
				break;
			default:
				throw unsupportedExtensionErr(ext);
		}
	}
	return obj as T;
}

