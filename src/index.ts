export * from './markers';
export * from './eval-config';
export * from './merge-config';
export {loadConfigFile} from './load-fs-config';
export {keyValueToConfig} from './kvp-to-config';
export {pkgToConfig} from './pkg-to-config';
export * from './initializers';
export * from './process-initializers';
export {makeConfig} from './setup';

export {merge as lodashMerge, cloneDeep as lodashCloneDeep} from 'lodash';
