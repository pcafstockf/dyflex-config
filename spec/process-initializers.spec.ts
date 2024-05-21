import {evalConfig} from '../src/eval-config';
import {discoverInitializers, invokeInitializers} from '../src/process-initializers';

type InitializerContext = Record<string | number | symbol, any>;
let invocationOrder = 0;

/* ******** Simple Service definition ******** */
async function InitServiceA(ctx: InitializerContext, path: string[], obj: object) {
	ctx[invocationOrder] = {
		path: path,
		obj: obj
	};
	invocationOrder++;
}

const serviceALabel = 'IamCool';
const ServiceAConf = 'ServiceAConf';
const DefaultServiceAConf = {
	__conf_register: Symbol.for(ServiceAConf),
	__conf_init: {fn: InitServiceA},
	label: serviceALabel
};

/* ******** Service B (explicitly structured differently than A) ******** */
async function InitServiceB(ctx: InitializerContext, path: string[], obj: object) {
	ctx[invocationOrder] = obj;
	invocationOrder++;
}

const serviceBName = 'awesome';
const DefaultServiceBConf = {
	__conf_init: {priority: 1, fn: InitServiceB},
	name: serviceBName
};

/* ******** Unit tests ******** */
describe('Initializer Discovery and Execution', () => {
	const originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;

	beforeAll(() => {
		jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
	});
	afterAll(async () => {
		jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
	});
	it('should recognize and process initializers in the configuration', async () => {
		const gCtx = {} as InitializerContext;
		const config = evalConfig({
			serviceB: Object.assign({}, DefaultServiceBConf),
			serviceA: Object.assign({}, DefaultServiceAConf)
		}, () => {
		});   // Without a registration function we *intentionally* do *not* remove registration markers.
		const initializers = discoverInitializers(config);
		expect(initializers.size).toBe(2);
		await invokeInitializers(gCtx, initializers);
		expect(gCtx[0].obj.label).toBe(serviceALabel);
		expect(gCtx[1].name).toBe(serviceBName);
	});
	it('should fail the config process if an initializer errors', async () => {
		const gCtx = {} as InitializerContext;
		const config = evalConfig({
			serviceA: Object.assign({}, DefaultServiceAConf)
		});
		expect(config.serviceA.__conf_register).toBe(Symbol.for(ServiceAConf));
		const errMsg = 'Unable to initialize';
		config.serviceA.__conf_init.fn = () => {
			throw new Error(errMsg);
		};
		const initializers = discoverInitializers(config);
		expect(initializers.size).toBe(1);
		try {
			await invokeInitializers(gCtx, initializers);
			fail('An initializer failed but did not abort the process');
		}
		catch (e) {
			expect(e).toBeInstanceOf(Error);
			expect((e as Error).message).toBe(errMsg);
		}
	});
});
