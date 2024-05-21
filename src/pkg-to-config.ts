import {parse as parseJson5} from 'json5/lib';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Magical helper to insert application description information into your configuration.
 * This function is designed to be webpack friendly.
 * If you run your app via npm, then npm populates process.env.(npm_package_name, npm_package_version, npm_package_description).
 * If you have a package.json file it can probably be loaded and inspected.
 * But what if you have webpacked to a single standalone .js file???
 *  Try this:
 *      Use the webpack.DefinePlugin to define the following three substitutions (you can grab them from your package.json as part of your webpack configuration):
 *          __APP_NAME__, __APP_VERSION__, __APP_DESCRIPTION__ (the names don't really matter, these are just suggesting).
 *      Then in your application, invoke this function.
 *          // @ts-ignore
 *          const appInfo = pkgToConfig(__dirname, __APP_NAME__, __APP_VERSION__, __APP_DESCRIPTION__);
 *      Of course since those literals are not defined anywhere, you will need to use @ts-ignore.
 * @param searchDir The directory of whatever file invoked this function.  This is used to assist in locating package.json
 * @param name  Generally only defined if you webpacked using the approach described above.
 * @param version  Generally only defined if you webpacked using the approach described above.
 * @param description  Generally only defined if you webpacked using the approach described above.
 */
export function pkgToConfig(searchDir?: string, name?: string, version?: string, description?: string) {
	// Use are args if we got them, otherwise try to pick up what we need from npm.
	let appName = name || process.env.npm_package_name || undefined;
	let appVersion = version || process.env.npm_package_version || undefined;
	let appDescription = description || process.env.npm_package_description || undefined;
	if (!appName) {
		// We were not called from webpack or via npm, so try to find an appropriate package.json.
		let dir = searchDir ? path.resolve(searchDir) : process.cwd();
		while (dir.startsWith(process.cwd())) {
			const fileName = path.join(dir, 'package.json');
			let stat: fs.Stats;
			try {
				stat = fs.statSync(fileName);
			}
			catch (e) {
				stat = undefined as any as fs.Stats;
			}
			if (stat?.isFile()) {
				const txt = fs.readFileSync(fileName, 'utf-8');
				const obj = parseJson5(txt);
				if (obj) {
					appName = obj.name;
					appVersion = obj.version;
					appDescription = obj.description;
					break;
				}
			}
			dir = path.dirname(dir);
		}
	}
	// Either we got the info or we didn't.
	return {
		name: appName,
		version: appVersion,
		description: appDescription
	};
}
