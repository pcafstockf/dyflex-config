import {loadConfigFile} from '../src/load-fs-config';

describe('Read Configuration options from files', () => {
	const originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;

	beforeAll(() => {
		jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;
	});
	afterAll(() => {
		jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
	});

	it('should be able to load json5', async () => {
		const conf = await loadConfigFile<{ hexadecimal: number }>('./fixtures/config-b.json5');
		expect(conf.hexadecimal).toEqual(0xdecaf);
	});

	it('should handle non-existent config file', async () => {
		try {
			await loadConfigFile<{ hexadecimal: number }>('./fixtures/does-not-exist.json5');
			fail('expected non-existent file to trigger an exception');
		}
		catch (e) {
			expect(e).toBeInstanceOf(Error);
			expect((e as Error).message).toContain('no such file or directory');
		}
	});

	it('should handle bad config file location', async () => {
		try {
			await loadConfigFile<{ hexadecimal: number }>('./fixtures');
			fail('expected directory to trigger an exception');
		}
		catch (e) {
			expect(e).toBeInstanceOf(Error);
			expect((e as Error).message).toContain('ot a file');
		}
	});

	it('should handle unsupported file types', async () => {
		try {
			await loadConfigFile<{ hexadecimal: number }>('./fixtures/config-g.toml');
			fail('expected toml file to trigger an exception');
		}
		catch (e) {
			expect(e).toBeInstanceOf(Error);
			expect((e as Error).message).toContain('nsupported file format ');
		}
	});

	it('should support yaml', async () => {
		const conf = await loadConfigFile<{ owners: { name: string; age: number }[] }>('./fixtures/overrides/config-c.yaml');
		expect(Array.isArray(conf.owners)).toBeTrue();
		const mary = conf.owners.find(o => o.name.toLowerCase().startsWith('mary'));
		expect(mary).toBeTruthy();
		expect(mary!.age).toEqual(27);
	});

	it('should support dotenv', async () => {
		// We use this one instead of the one in overrides specifically because it is hidden (starts with a .).
		const conf = await loadConfigFile<{ SIMPLE: string }>('./fixtures/.env');
		expect(conf.SIMPLE).toBe('123xyz');
	});

	it('should support ini', async () => {
		// This file is also used for a 'bang' merging test.
		const conf = await loadConfigFile<{ ['!tenant']: { name: string; } }>('./fixtures/overrides/config-d.ini');
		expect(conf['!tenant'].name).toBe('John Doe');
	});

	it('should support properties', async () => {
		const conf = await loadConfigFile<{ db: { url: string; password: string } }>('./fixtures/overrides/config-f.properties');
		expect(conf.db.url).toBe('localhost');
	});
});
