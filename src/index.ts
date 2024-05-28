import {cloneDeep, merge} from 'lodash';

export const ConfigMarkerPrefix = '__conf_';
export const RegisterConfigMarker = `${ConfigMarkerPrefix}register`;
export const InitializeMarker = `${ConfigMarkerPrefix}init`;

export * from './initializers';
export {merge as lodashMerge, cloneDeep as lodashCloneDeep};
