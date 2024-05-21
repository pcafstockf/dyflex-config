import {InitializerDesc, InitializerFn} from './initializers';

/**
 * Contextual information describing an initializer
 */
export interface InitializerMeta<T = any> {
	path: string[];
	obj: object;
	fn: InitializerFn<T>;
}

/**
 * A collection of initializer functions (and their meta-data).
 * The map will be sorted in priority order (lowest to highest).
 * It is okay for multiple initializers to have the same priority.
 */
export type Initializers<T = any> = Map<number, InitializerMeta<T>[]>;

/**
 * Scan the configuration extracting the initialization markers (__conf_init).
 * @param config A fully merged and evaluated configuration.
 * @return  A priority ordered Map of initializer functions discovered inside the configuration.
 */
export function discoverInitializers<T = any>(
	config: object
): Initializers {
	const initializers = {} as Record<number, InitializerMeta<T>[]>;
	const propPath: string[] = [];
	const deepProcess = (obj: any) => {
		let propKey: PropertyKey;
		for (propKey in obj) {
			// Scan for objects containing our magic properties
			if (typeof propKey === 'string' && propKey.startsWith('__conf_')) {
				switch (propKey) {
					case '__conf_init':
						if (typeof obj[propKey] === 'object') {
							const ro = obj[propKey] as InitializerDesc<T>;
							if (typeof ro.fn === 'function' && (typeof ro.priority === 'number' || typeof ro.priority === 'undefined')) {
								delete obj[propKey];
								let a = initializers[ro.priority ?? 0];
								if (!a) {
									a = [];
									initializers[ro.priority ?? 0] = a;
								}
								a.push({
									path: propPath.slice(),
									obj: obj,
									fn: ro.fn
								});
							}
						}
						break;
					default:
						break;
				}
			}
			else {
				propPath.push(String(propKey));
				if (typeof obj[propKey] === 'object' && obj[propKey])
					deepProcess(obj[propKey]);  // recurse
				propPath.pop();
			}
		}
		return obj;
	};
	// Walk the configuration hierarchy
	deepProcess(config);
	// Return the initializers in order of priority.
	return Object.keys(initializers).sort().reduce((p, strKey) => {
		const numKey = parseInt(strKey, 10);
		p.set(numKey, initializers[numKey]);
		return p;
	}, new Map<number, InitializerMeta<T>[]>());
}

/**
 * Invoke all @see InitializerFn in priority order.
 * All initializers of the same priority will be executed in parallel (e.g. async).
 * All initializers of a given priority will be completed before initializers of the next highest priority are invoked.
 * NOTE:
 *  If any initializer throws, it will abort this function and cascade the error upwards.
 *  The assumption is that if an initializer cannot perform its purpose then your application cannot run.
 *  If an initializer has a fallback mechanism, it should do that rather than throw (e.g. it may choose not to bind its services).
 *
 * @param ctx   Passed to the initializer, this is usually the Dependency Injection Container
 * @param initializers  The initializer functions to execute.
 */
export async function invokeInitializers<T = any>(ctx: T, initializers: Initializers): Promise<void> {
	for await (const [_, value] of initializers.entries()) {
		await Promise.all(value.map(i => i.fn(ctx, i.path, i.obj) ?? Promise.resolve()));
	}
}

export * from './initializers';

