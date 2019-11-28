// import Vizabi from "vizabi-reactive";
// import BarrankChart from "./tools/barrankchart.js";
// import LocaleService from "./services/locale.js";
// import LayoutService from "./services/layout.js";

// window.Vizabi = Vizabi;
// window.BarrankChart = BarrankChart;
// window.LocaleService = LocaleService;
// window.LayoutService = LayoutService;


import * as _Icons from "./icons/iconset";
import * as _Utils from "./utils";
import * as _LegacyUtils from "./legacy/base/utils";
import _axisSmart from "./legacy/helpers/d3.axisWithLabelPicker";
import _collisionResolver from "./legacy/helpers/d3.collisionResolver";

export const Icons = _Icons;
export const Utils = _Utils;
export const LegacyUtils = _LegacyUtils;
export const axisSmart = _axisSmart;
export const collisionResolver = _collisionResolver;