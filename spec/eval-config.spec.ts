// noinspection SpellCheckingInspection

import {isFinite} from 'lodash';
import * as os from 'node:os';
import {evalConfig} from '../src/eval-config';

const PluginASymbol = Symbol.for('pluginAconfig');
const IgnoredSymbol = Symbol('invisible');
const PluginBSymbol = Symbol.for('pluginBconfig');
const PluginCSymbol = Symbol('pluginCconfig');

describe('Configuration Evaluation', () => {
	const originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;

	beforeAll(() => {
		jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
	});
	afterAll(async () => {
		jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
	});
	it('should be able to find and register config symbols', () => {
		const gCtx = {} as Record<symbol, any>;
		const regFn = (key: symbol, obj: object) => {
			gCtx[key] = obj;
		};
		const config = evalConfig({
			host: {
				hostname: 'localhost',
				port: 8888
			},
			pluginA: {
				__conf_register: 'pluginAconfig',
				name: 'A',
				isLocal: '<%= fn.asBool(config.host.hostname === "localhost") %>',
				notOverridden: '<%= UNDEFINED %>'
			},
			pluginB: {
				__conf_register: PluginBSymbol,
				port: '<%= fn.asNum(config.host.port) %>',
				info: '<%= fn.asJs(config.host) %>'
			},
			[IgnoredSymbol]: {
				__conf_register: PluginCSymbol
			},
			appSpecific: {
				undefValue: '<%= fn.asJs(config.foo?.bar) %>',
				nullValue: '<%= fn.asJs(config.pluginA.name !== "Z" ? null : config.pluginA.name) %>'
			}
		}, regFn);
		expect(gCtx[PluginASymbol].name).toBe('A');
		expect(gCtx[PluginASymbol].isLocal).toBeTrue();
		// Remember, Jasmine expects the error to be thrown *inside* a *function* that is passed to expect.
		expect(() => gCtx[PluginASymbol].notOverridden).toThrowError(/Config property .+ is not defined/i);
		// Interpolation should be happening.
		expect(gCtx[PluginBSymbol].port).toBe(config.host.port);
		expect(gCtx[PluginBSymbol].info).toEqual(config.host);
		expect(gCtx[PluginCSymbol]).toBeUndefined();
		expect(config.appSpecific.undefValue).toBeUndefined();
		expect(config.appSpecific.nullValue).toBeNull();
	});
	it('should fail to compile bad templates', async () => {
		try {
			evalConfig({
				uncompilableTemplate: '<%= %> %>'
			});
			fail('Bad template was accepted (and should not have been)');
		}
		catch (e) {
			expect(e).toBeInstanceOf(Error);
			expect((e as Error).message).toContain('nable to eval ');
		}
	});
	it('should fail to evaluate bad templates', async () => {
		const config = evalConfig({
			stub: undefined,
			badTemplate: '<%= config.stub.invalid %>'
		});
		expect(() => config.badTemplate).toThrowError(/Unable to interpolate /i);
	});
	it('should be able to perform template type conversions', async () => {
		const config = evalConfig({
			fromEnv: {
				user: '<%= fn.fromEnv("USER") %>'
			},
			numbers: {
				nullVal: '<%= fn.asNum(null) %>',
				nullStr: '<%= fn.asNum("null") %>',
				undefVal: '<%= fn.asNum(undefined) %>',
				undefStr: '<%= fn.asNum("undefined") %>',
				nanVal: '<%= fn.asNum(NaN) %>',
				nanStr: '<%= fn.asNum("NaN") %>',
				infVal: '<%= fn.asNum(Infinity) %>',
				infStr: '<%= fn.asNum("Infinity") %>',
				notNum: '<%= fn.asNum("i-am-not-a-number") %>',
				numVal: '<%= fn.asNum(24) %>' as any as number,
				numStr: '<%= fn.asNum("42") %>' as any as number
			},
			booleans: {
				nullVal: '<%= fn.asBool(null) %>',
				nullStr: '<%= fn.asBool("null") %>',
				undefVal: '<%= fn.asBool(undefined) %>',
				undefStr: '<%= fn.asBool("undefined") %>',
				truthyStr: '<%= fn.asBool("i-am-a bool") %>',
				truthyNum: '<%= fn.asBool(1) %>',
				falsyStr: '<%= fn.asBool("") %>',
				falsyNum: '<%= fn.asBool(0) %>',
				trueVal: '<%= fn.asBool(true) %>' as any as boolean,
				trueStr: '<%= fn.asBool("tRue") %>' as any as boolean,
				falseVal: '<%= fn.asBool(false) %>' as any as boolean,
				falseStr: '<%= fn.asBool("FaLse") %>' as any as boolean,
				yesStr: '<%= fn.asBool("yeS") %>',
				noStr: '<%= fn.asBool("no") %>',
				arrayVal: '<%= fn.asBool([]) %>'
			}
		});
		// fromEnv (have to get to actually execute the template).
		expect(config.fromEnv.user).toBe(os.userInfo().username);
		// asNum (have to get to actually execute the template).
		expect(config.numbers.nullVal).toBeNull();
		expect(config.numbers.nullStr).toBeNull();
		expect(config.numbers.undefVal).toBeUndefined();
		expect(config.numbers.undefStr).toBeUndefined();
		expect(typeof config.numbers.nanVal).toBe('number');
		expect(config.numbers.nanVal).toBeNaN();
		expect(typeof config.numbers.nanStr).toBe('number');
		expect(config.numbers.nanStr).toBeNaN();
		expect(typeof config.numbers.infVal).toBe('number');
		expect(isFinite(config.numbers.infVal)).toBeFalse();
		expect(typeof config.numbers.infStr).toBe('number');
		expect(isFinite(config.numbers.infStr)).toBeFalse();
		expect(typeof config.numbers.notNum).toBe('number');
		expect(config.numbers.notNum).toBeNaN();
		expect(typeof config.numbers.numVal).toBe('number');
		expect(config.numbers.numVal).toBe(24);
		expect(typeof config.numbers.numStr).toBe('number');
		expect(config.numbers.numStr).toBe(42);
		// asBool
		expect(config.booleans.nullVal).toBeNull();
		expect(config.booleans.nullStr).toBeNull();
		expect(config.booleans.undefVal).toBeUndefined();
		expect(config.booleans.undefStr).toBeUndefined();
		expect(config.booleans.truthyStr).toBeTrue();
		expect(config.booleans.truthyNum).toBeTrue();
		expect(config.booleans.falsyStr).toBeFalse();
		expect(config.booleans.falsyNum).toBeFalse();
		expect(config.booleans.trueVal).toBeTrue();
		expect(config.booleans.trueStr).toBeTrue();
		expect(config.booleans.falseVal).toBeFalse();
		expect(config.booleans.falseStr).toBeFalse();
		expect(config.booleans.yesStr).toBeTrue();
		expect(config.booleans.noStr).toBeFalse();
		expect(config.booleans.arrayVal).toBeTrue();
	});
	it('should be able to resolve relative references', async () => {
		const SymC = Symbol.for('C');
		const gCtx = {
		} as Record<symbol, any>;
		const config = evalConfig({
			root: {
				a: {
					aa: [
						{upper: 'AA'},
						{mixed: 'aA'},
						{lower: 'aa'}
					]
				},
				b: {
					baa: '<%= fn.relTo("..a.aa[1].mixed") %>',
					bcc: '<%= fn.relTo("C.cc") %>',
					z: '<%= fn.relTo(".bcc") %>'
				},
				c: {
					__conf_register: SymC,
					cc: 'CC'
				}
			}
		}, (key, obj, _) => {
			if (typeof obj === 'undefined')
				return gCtx[key];
			gCtx[key] = obj;
		}, {
			reverse: (v: string) => v.split('').reverse().join('').toUpperCase()
		});
		expect(config.root.b.baa).toEqual('aA');
		expect(config.root.b.bcc).toEqual('CC');
		expect(config.root.b.z).toEqual('CC');
	});
	it('should be able to custom fn extensions', async () => {
		const config = evalConfig({
			foo: 'bar',
			rab: '<%= fn.reverse(config.foo) %>'
		}, undefined, {
			reverse: (v: string) => v.split('').reverse().join('').toUpperCase()
		});
		expect(config.rab).toEqual('RAB');
	});
});
