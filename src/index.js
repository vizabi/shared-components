
import * as _Icons from "./icons/iconset";
import * as _Utils from "./utils";
import * as _LegacyUtils from "./legacy/base/utils";
import _axisSmart from "./legacy/helpers/d3.axisWithLabelPicker";
import _collisionResolver from "./legacy/helpers/d3.collisionResolver";
import _TextEllipsis from "./legacy/helpers/textEllipsis";

import { onLongTap, onTap } from "./legacy/helpers/d3.touchEvents";
d3.selection.prototype.onTap = onTap;
d3.selection.prototype.onLongTap = onLongTap;

export const versionInfo = {version: __VERSION, build: __BUILD, package: __PACKAGE_JSON_FIELDS};
export const Icons = _Icons;
export const Utils = _Utils;
export const LegacyUtils = _LegacyUtils;
export const axisSmart = _axisSmart;
export const collisionResolver = _collisionResolver;
export const TextEllipsis = _TextEllipsis;