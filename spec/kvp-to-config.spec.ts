import {keyValueToConfig} from '../src/kvp-to-config';

describe('Read Configuration options from key/value pairs (typically cli)', () => {
	const originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;

	beforeAll(() => {
		jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;
	});
	afterAll(() => {
		jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
	});

	it('should be able to merge configurations from multiple locations', () => {
		let conf = keyValueToConfig(['question="meaning"', 'answer=42']);
		expect(conf).toEqual({question: 'meaning', answer: 42});
	});

	it('should handle empty command line', () => {
		let conf = keyValueToConfig(undefined as unknown as string);
		expect(conf).toEqual({});
		conf = keyValueToConfig(null as unknown as string);
		expect(conf).toEqual({});
		conf = keyValueToConfig('');
		expect(conf).toEqual({});
	});

	it('should handle bad define keys', () => {
		try {
			keyValueToConfig('question');
			fail('expected bad key to trigger an exception');
		}
		catch (e) {
			expect(e).toBeInstanceOf(Error);
			// noinspection SpellCheckingInspection
			expect((e as Error).message).toContain('nvalid property key');
		}
	});

	it('should handle bad define values', () => {
		try {
			keyValueToConfig('question={a,b}');
			fail('expected bad value to trigger an exception');
		}
		catch (e) {
			expect(e).toBeInstanceOf(Error);
			// noinspection SpellCheckingInspection
			expect((e as Error).message).toContain('nvalid property value');
		}
	});
});
