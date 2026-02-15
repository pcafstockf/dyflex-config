// This verifies that the ESM build works correctly with proper module resolution for peer dependencies when needed.
// Run this script with: node tst/test-esm.mjs
import {evalConfig, loadConfigFile, makeConfig, mergeConfig} from 'dyflex-config';

console.log('ESM import test...');
console.log('makeConfig:', typeof makeConfig);
console.log('mergeConfig:', typeof mergeConfig);
console.log('evalConfig:', typeof evalConfig);
console.log('loadConfigFile:', typeof loadConfigFile);

if (typeof makeConfig === 'function' &&
	typeof mergeConfig === 'function' &&
	typeof evalConfig === 'function' &&
	typeof loadConfigFile === 'function') {
	console.log('✓ ESM imports working correctly');
} else {
	console.error('✗ ESM imports failed');
	process.exit(1);
}

// Test loading a YAML file (peer dependency test)
console.log('\nTesting YAML file loading...');
try {
	const config = await loadConfigFile('.github/workflows/node.js.yml');
	console.log('✓ YAML file loaded successfully');
	console.log('  Workflow name:', config.name);
	console.log('  Node versions:', config.jobs?.build?.strategy?.matrix?.['node-version']?.join(', '));
	process.exit(0);
} catch (e) {
	console.error('✗ YAML file loading failed:', e.message);
	process.exit(1);
}
