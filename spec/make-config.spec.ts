import {makeConfig} from '../src/setup';
import {InitializeMarker} from "../src";

describe('makeConfig', () => {
	it('should merge multiple tuple overrides into the correct paths', async () => {
		const config = await makeConfig(
			{
				db: {host: 'localhost', port: 3306},
				cache: {host: 'localhost', ttl: 60}
			},
			{},
			['db', {port: 5432, user: 'admin'}],
			['cache', {ttl: 300, maxSize: 100}]
		);
		// Both tuples should merge into their respective top-level keys, not into each other.
		expect(config.db.host).toBe('localhost');
		expect(config.db.port).toBe(5432);
		expect((config.db as any).user).toBe('admin');
		expect(config.cache.host).toBe('localhost');
		expect(config.cache.ttl).toBe(300);
		expect((config.cache as any).maxSize).toBe(100);
		// Verify no cross-contamination.
		expect((config.db as any).ttl).toBeUndefined();
		expect((config.cache as any).port).toBeUndefined();
	});
	it('should merge overrides, evaluate templates, and invoke initializers', async () => {
		let initialized = false;
		const ctx = {};
		const config = await makeConfig(
			{
				host: 'localhost',
				port: '<%= fn.asNum(config.portNum) %>' as any as number,
				portNum: 3000,
				svc: {
					[InitializeMarker]: {fn: async () => { initialized = true; }}
				}
			},
			{ctx},
			{host: 'example.com'}
		);
		expect(config.host).toBe('example.com');  // merge worked
		expect(config.port).toBe(3000);            // eval worked
		expect(initialized).toBeTrue();            // initializer ran
	});
});
