import {loadConfigFile} from '../src/load-fs-config';
import {mergeConfigs} from '../src/merge-config';
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
			['app', pkgToConfig(__dirname)],
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
