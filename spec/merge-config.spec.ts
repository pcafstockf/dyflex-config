import {loadConfigFile} from '../src/load-fs-config';
import {mergeConfig, mergeConfigs} from '../src/merge-config';
import {pkgToConfig} from '../src/pkg-to-config';

describe('Configuration Merging', () => {
	const originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;

	beforeAll(() => {
		jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
	});
	afterAll(async () => {
		jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
	});

	it('should be able to merge configurations from multiple locations', async () => {
		// Use the base config from our 'include' spec.
		let config = mergeConfigs<any>({}, [
			['app', await pkgToConfig(__dirname)],
			await loadConfigFile('./fixtures/.env'),
			await loadConfigFile('./fixtures/config-e.env'),
			['tenant', await loadConfigFile('./fixtures/config-a.json')],
			{question: 'What version', answer: '<%= app.version %>'}
		]);
		expect(config.app.name).toEqual('dyflex-config');
		// Interpolation should not be happening yet.
		expect(config.answer).toEqual('<%= app.version %>');
		expect((config as any).tenant?.name).toBeUndefined();
		expect(typeof (config as any).tenant?.age).toBe('number');
		expect(typeof (config as any).tenant?.address).toBe('object');
		// It is unusual but legitimate to invoke merge multiple times.
		config = await mergeConfigs(config, [
			await loadConfigFile('./fixtures/overrides/config-c.yaml'),
			await loadConfigFile('./fixtures/overrides/config-d.ini'),
			await loadConfigFile('./fixtures/overrides/config-f.properties'),
			await loadConfigFile('./fixtures/config-b.json5')
		]);
		// Should not have changed some things.
		expect(config.app.name).toEqual('dyflex-config');
		// Check that !bang merging works as expected
		expect((config as any).tenant?.age).toBeUndefined();
		expect((config as any).tenant?.firstName).toBeUndefined();
		expect((config as any).tenant?.name).toBe('John Doe');
	});
});

describe('Merge Directives', () => {
	it('should support conditional replace (~) merge directive', () => {
		const target = { existingKey: 'keep-or-update', untouched: 42 };
		const source = {
			'~existingKey': 'updated-val',
			'~missingKey': 'should-not-exist'
		};
		const result = mergeConfigs(target, [source]);
		expect(result.existingKey).toBe('updated-val');
		expect((result as any).missingKey).toBeUndefined();
		expect(result.untouched).toBe(42);
	});

	it('should support element-by-element array merge (%) directive', () => {
		const target = {
			items: [
				{ id: 1, name: 'original-1' },
				{ id: 2, name: 'original-2' }
			]
		};
		const source = {
			'%items': [
				{ name: 'replaced-1' }
			]
		};
		const result = mergeConfigs(target, [source]);
		expect(result.items[0]).toEqual({ id: 1, name: 'replaced-1' });
		expect(result.items[1]).toEqual({ id: 2, name: 'original-2' });
	});

	it('should support array element removal (-) directive and handle non-array targets', () => {
		const target = {
			plugins: ['alpha', 'beta', 'gamma'],
			scalar: 'not-an-array'
		};
		const source = {
			'-plugins': ['beta'],
			'-scalar': ['dummy']
		};
		const result = mergeConfigs(target, [source]);
		expect(result.plugins).toEqual(['alpha', 'gamma']);
		expect(result.scalar).toBe('not-an-array');
	});

	it('should handle undefined target object in mergeConfig gracefully', () => {
		const result = mergeConfig(undefined as any, { initialized: true });
		expect(result).toEqual({ initialized: true });
	});
});
