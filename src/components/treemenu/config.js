export const INDICATOR = "which";
export const SCALETYPE = "scaleType";
export const MODELTYPE_COLOR = "color";
export const MENU_HORIZONTAL = 1;
export const MENU_VERTICAL = 2;

//css custom classes
export const css = {
  wrapper: "vzb-treemenu-wrap",
  wrapper_header: "vzb-treemenu-wrap-header",
  wrapper_outer: "vzb-treemenu-wrap-outer",
  background: "vzb-treemenu-background",
  close: "vzb-treemenu-close",
  search: "vzb-treemenu-search",
  list: "vzb-treemenu-list",
  list_outer: "vzb-treemenu-list-outer",
  list_item: "vzb-treemenu-list-item",
  list_item_leaf: "vzb-treemenu-list-item-leaf",
  leaf: "vzb-treemenu-leaf",
  leaf_content: "vzb-treemenu-leaf-content",
  leaf_content_item: "vzb-treemenu-leaf-content-item",
  leaf_content_item_title: "vzb-treemenu-leaf-content-item-title",
  leaf_content_item_datasources: "vzb-treemenu-leaf-content-item-datasources",
  leaf_content_item_space: "vzb-treemenu-leaf-content-item-space",
  leaf_content_item_descr: "vzb-treemenu-leaf-content-item-descr",
  leaf_content_item_helptranslate: "vzb-treemenu-leaf-content-item-helptranslate",
  hasChild: "vzb-treemenu-list-item-children",
  list_item_label: "vzb-treemenu-list-item-label",
  list_top_level: "vzb-treemenu-list-top",
  search_wrap: "vzb-treemenu-search-wrap",
  isSpecial: "vzb-treemenu-list-item-special",
  hidden: "vzb-hidden",
  title: "vzb-treemenu-title",
  scaletypes: "vzb-treemenu-scaletypes",
  scaletypesDisabled: "vzb-treemenu-scaletypes-disabled",
  scaletypesActive: "vzb-treemenu-scaletypes-active",
  alignYt: "vzb-align-y-top",
  alignYb: "vzb-align-y-bottom",
  alignXl: "vzb-align-x-left",
  alignXr: "vzb-align-x-right",
  alignXc: "vzb-align-x-center",
  menuHorizontal: "vzb-treemenu-horizontal",
  menuVertical: "vzb-treemenu-vertical",
  absPosVert: "vzb-treemenu-abs-pos-vert",
  absPosHoriz: "vzb-treemenu-abs-pos-horiz",
  menuOpenLeftSide: "vzb-treemenu-open-left-side",
  noTransition: "notransition"
};

//options and globals
export const OPTIONS = {
  MOUSE_LOCS: [], //contains last locations of mouse
  MOUSE_LOCS_TRACKED: 3, //max number of locations of mouse
  DELAY: 200, //amazons multilevel delay
  TOLERANCE: 150, //this parameter is used for controlling the angle of multilevel dropdown
  LAST_DELAY_LOC: null, //this is cached location of mouse, when was a delay
  TIMEOUT: null, //timeout id
  SEARCH_PROPERTY: "id", //property in input data we we'll search by
  SUBMENUS: "children", //property for submenus (used by search)
  SEARCH_MIN_STR: 1, //minimal length of query string to start searching
  RESIZE_TIMEOUT: null, //container resize timeout
  MOBILE_BREAKPOINT: 400, //mobile breakpoint
  CURRENT_PATH: [], //current active path
  MIN_COL_WIDTH: 60, //minimal column size
  MENU_DIRECTION: MENU_HORIZONTAL,
  MAX_MENU_WIDTH: 320,
  MENU_OPEN_LEFTSIDE: false
};