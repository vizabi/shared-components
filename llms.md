# Vizabi Shared Components — LLM Context

## Overview

`@vizabi/shared-components` (v1.56.7) is the UI component library for the Vizabi visualization framework by Gapminder Foundation. It provides the reusable controls, dialogs, axes, legends, sliders, and layout services that surround every Vizabi chart (bubblechart, linechart, mountainchart, etc.). The library is consumed as a UMD bundle (`VizabiSharedComponents.js`) alongside a CSS file.

**Not a chart renderer** — this library contains everything *around* the chart: toolbars, time sliders, color legends, dialogs, tree menus, faceting, labels, and more. Individual chart types (bubblechart, linechart, etc.) live in separate repos and extend the `Chart` base class exported here.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Reactivity | MobX 5 (`observable`, `computed`, `autorun`, `reaction`, `decorate`) — **not** MobX 6+ |
| DOM | D3 v6 — used as a general DOM library, not just for SVG |
| Styles | SCSS (Bourbon mixins), CSS Grid layout |
| Build | Rollup 2, UMD output, sourcemaps |
| Icons | Inline SVG strings (Font Awesome conversions) |
| i18n | JSON locale files loaded at runtime |
| Peer deps | `mobx ^5.15.7`, `d3 ^6.7.0` (external, not bundled) |

## Project Structure

```
shared-components/
├── package.json                    # @vizabi/shared-components, main: ./build/VizabiSharedComponents.js
├── rollup.config.js                # UMD bundle, multi-entry glob, SCSS pipeline
├── build/                          # Compiled output (committed)
│   ├── VizabiSharedComponents.js   # UMD bundle
│   ├── VizabiSharedComponents.css  # Compiled SCSS
│   └── assets/locale/              # Copied locale JSON files
└── src/
    ├── index.js                    # Main entry: exports + d3 prototype extensions
    ├── ui.js                       # MobX observable UI config cascade system
    ├── utils.js                    # STATUS enum, deep object helpers
    ├── components/                 # All UI components (24 directories)
    │   ├── base-component.js       # BaseComponent — the root class everything extends
    │   ├── addgeo/                 # "Add geo entities" UI
    │   ├── brushslider/            # Base slider + variants (bubble-size, single-handle, size)
    │   ├── buttonlist/             # Toolbar button strip with icon buttons
    │   ├── chart/                  # Chart registry base class (CollectionMixin)
    │   ├── colorlegend/            # Color legend: categorical list, rainbow gradient, minimap
    │   ├── datanotes/              # Indicator metadata popover
    │   ├── datawarning/            # Data quality warning overlay
    │   ├── datetime-background/    # Date axis background bars
    │   ├── dialogs/                # Dialog system (18 dialog types)
    │   │   ├── dialog.js           # Base Dialog class (CollectionMixin, drag, pin)
    │   │   ├── dialogs.js          # Dialog container — mounts dialogs from UI config
    │   │   ├── about/              # About dialog
    │   │   ├── axes/               # Axis configuration
    │   │   ├── colors/             # Color encoding settings
    │   │   ├── find/               # Entity search/filter
    │   │   ├── label/              # Label configuration
    │   │   ├── markercontrols/     # Marker settings
    │   │   ├── moreoptions/        # Accordion container for other dialogs
    │   │   ├── opacity/            # Opacity slider
    │   │   ├── presentation/       # Projector mode toggle
    │   │   ├── repeat/             # Facet repeat configuration
    │   │   ├── size/               # Size encoding
    │   │   ├── speed/              # Animation speed
    │   │   ├── technical/          # Debug/technical info
    │   │   ├── timedisplay/        # Time display settings
    │   │   └── zoom/               # Zoom controls
    │   ├── errormessage/           # Error display overlay
    │   ├── facet/                  # Small-multiples faceting (CSS Grid)
    │   ├── indicatorpicker/        # Click-to-open indicator selector (opens TreeMenu)
    │   ├── label-size-helper/      # Helper to calculate label font sizes
    │   ├── labels/                 # Entity labels with drag, leash lines, collision
    │   ├── marker-contextmenu/     # Right-click context menu for markers
    │   ├── minmaxinputs/           # Min/max number inputs
    │   ├── repeater/               # CSS Grid repeater for faceting
    │   ├── simplecheckbox/         # Simple checkbox toggle
    │   ├── spaceconfig/            # Data space configuration UI
    │   ├── stepped-slider/         # Discrete-step slider
    │   ├── time-slider/            # Time axis slider with play button
    │   ├── treemenu/               # Hierarchical indicator/dataset picker
    │   └── zoombuttonlist/         # Zoom in/out/reset buttons
    ├── services/
    │   ├── base-service.js         # Minimal BaseService (setup/deconstruct)
    │   ├── capitalVizabi.js        # Holds reference to root Vizabi instance
    │   ├── layout.js               # LayoutService: responsive profiles, resize, projector mode
    │   └── locale.js               # LocaleService: i18n, number/date formatters
    ├── styles/
    │   ├── common.scss             # Root import: bourbon + legacy + layout
    │   ├── _layout.scss            # CSS Grid layout for tool chrome
    │   └── vizabi-old/             # Legacy style partials (_chart, _common, _mixins, _reset)
    ├── legacy/
    │   ├── base/
    │   │   └── utils.js            # Type checkers, deepExtend, merge, forEach, DOM helpers
    │   └── helpers/
    │       ├── d3.axisWithLabelPicker.js  # Smart axis with collision-aware label placement
    │       ├── d3.collisionResolver.js    # Label collision detection and repositioning
    │       ├── d3.touchEvents.js          # Tap/long-tap gesture detection for d3 selections
    │       └── textEllipsis.js            # Text truncation with tooltip support
    ├── icons/
    │   └── iconset.js              # 40+ SVG icon strings (search, gear, paintbrush, etc.)
    └── assets/
        └── locale/                 # en.json, ar-SA.json, ru-RU.json
```

## Architecture & Core Patterns

### BaseComponent (the foundation)

Every UI component extends `BaseComponent` (`src/components/base-component.js`). It provides:

```
constructor({placeholder, model, services, subcomponents, template, ui, default_ui, state, options})
```

**Lifecycle methods** (override in subclasses):
- `setup(options)` — one-time initialization after DOM is ready
- `draw()` — called reactively when status reaches READY (via MobX autorun)
- `loading()` — called reactively when status is PENDING
- `resize()` — called reactively when layout.size changes

**Component tree**: `subcomponents` array defines children that are mounted into placeholder selectors within the parent's template. The tree is built recursively in the constructor.

**Reaction management**: Components register MobX reactions via `addReaction(fn, options)`. All reactions are auto-disposed on `deconstruct()`. Options include `{ignoreStatus: true}` to run before data is ready, and `{throttle_ms: N}` for throttled reactions.

**Status computation**: `status` is a MobX `computed` that returns the minimum status across all services, child components, and the model. Values from `STATUS` enum: `INIT → PENDING → READY`, or `ERROR`.

**DOM pattern**: Components store D3 selections in `this.DOM = {}` during `setup()`, then manipulate them in `draw()`.

**MobX decorators** are applied via `decorate()` (MobX 5 style):
```js
decorate(MyComponent, {
  "MDL": computed,
  "status": computed
});
```

### UI Config Cascade (`src/ui.js`)

The `ui()` function creates a MobX observable proxy with a 3-layer config cascade:

```
defaults → config → baseConfig
```

- **Getter**: returns first defined value in chain (config → baseConfig → defaults)
- **Setter**: writes to `config`; if value matches the default, deletes the key instead (keeps config minimal)

Components declare `DEFAULT_UI` as a static property. The UI system merges defaults with runtime config automatically.

### CollectionMixin (Registry Pattern)

`Chart` and `Dialog` use a `CollectionMixin` that provides static `add(name, cls)` / `get(name)` methods. Chart types and dialog types register themselves:

```js
Chart.add("BubbleChart", BubbleChart);
Dialog.add("colors", ColorsDialog);
```

This enables declarative configuration: the `Dialogs` container reads dialog names from `ui.dialogs.sidebar` / `ui.dialogs.popup` and looks them up via `Dialog.get(name)`.

### Responsive Profile Constants

Components define breakpoint-specific constants:

```js
const PROFILE_CONSTANTS = {
  SMALL:  { margin: { top: 7, ... }, radius: 8 },
  MEDIUM: { margin: { top: 0, ... }, radius: 9 },
  LARGE:  { margin: { top: -5, ... }, radius: 11 }
};
const PROFILE_CONSTANTS_FOR_PROJECTOR = { ... };
```

The `LayoutService` determines the current profile (SMALL/MEDIUM/LARGE) from container dimensions. Components call `this.services.layout.getProfileConstants(normal, projector)` to get merged constants for the active profile.

### Services

**LayoutService** (`services/layout.js`):
- Watches container resize events, updates `width`, `height`, `profile`, `size`
- Classifies layout: SMALL (<600px or <400px height), MEDIUM, LARGE (≥900px and ≥520px)
- Toggles CSS classes: `vzb-small`, `vzb-medium`, `vzb-large`, `vzb-landscape`, `vzb-portrait`, `vzb-presentation`
- Provides `hGrid` for horizontal grid coordination
- All properties are MobX observables

**LocaleService** (`services/locale.js`):
- Loads JSON locale files (with fallback to English)
- Provides formatters: `shortNumberF` (smart SI suffixes: k, M, B, TR), `longNumberF` (space-separated thousands), `dateF` (year/month/day/week/quarter), `stringF` (dictionary lookup)
- `auto()` returns a universal formatter that detects type (number → shortNumberF, Date → dateF, string → stringF)
- Handles RTL layout via CSS class
- Supports share/percent formatting modes

**CapitalVizabiService** (`services/capitalVizabi.js`):
- Holds a reference to the root `Vizabi` instance for cross-component access to stores, data sources

### Legacy Utilities

**`legacy/base/utils.js`**: Type checkers (`isArray`, `isObject`, `isDate`, etc.), `deepExtend()` for deep merging, `forEach()` for objects/arrays, `uniqueId()`, `getViewportPosition()`.

**`legacy/helpers/d3.axisWithLabelPicker.js`**: Enhanced D3 axis (`axisSmart()`) with intelligent label placement. Uses priority-based grouping (4 levels) and two-pass fitting (pessimistic then optimistic). Handles log/linear/time scales, pivot detection for rotated labels.

**`legacy/helpers/d3.collisionResolver.js`**: Resolves overlapping labels by vertical redistribution with 300ms transitions.

**`legacy/helpers/d3.touchEvents.js`**: `onTap` / `onLongTap` gesture detection (movement <5px, tap <500ms, long-tap >500ms). Patched onto `d3.selection.prototype` in `index.js`.

**`legacy/helpers/textEllipsis.js`**: Binary-search text truncation with `…` suffix and tooltip on hover.

## Key Components Reference

### Layout & Structure
| Component | Purpose |
|-----------|---------|
| **Facet** | Small-multiples via CSS Grid, splits data by facet encoding |
| **Repeater** | CSS Grid repeater for configurable row×column layouts |
| **ButtonList** | Toolbar strip of icon buttons, manages expanded/collapsed state |
| **Dialogs** | Container that instantiates dialog components from UI config |

### Controls & Interaction
| Component | Purpose |
|-----------|---------|
| **TimeSlider** | SVG time axis with draggable handle, play button, forecast boundary |
| **PlayButton** | Play/pause animation toggle (sub of TimeSlider) |
| **TreeMenu** | Hierarchical indicator/dataset picker with search, scale type selector |
| **IndicatorPicker** | Clickable label that opens TreeMenu for an encoding |
| **BrushSlider** | Base slider with D3 brush; extended by BubbleSize, SizeSlider, SingleHandle |
| **SteppedSlider** | Discrete-step slider for dialog controls |
| **ZoomButtonList** | Zoom +/−/reset buttons |
| **SimpleCheckbox** | Toggle checkbox |
| **MinMaxInputs** | Numeric min/max input fields |
| **SpaceConfig** | Data space (dimensions) configuration |
| **AddGeo** | UI for adding geographic entities |

### Data Display
| Component | Purpose |
|-----------|---------|
| **ColorLegend** | Categorical color list, continuous rainbow gradient (canvas), minimap |
| **Labels** | Entity labels with drag repositioning, leash lines, collision resolution, close button |
| **DataNotes** | Indicator metadata popover (description, source) |
| **DataWarning** | Data quality warning overlay |
| **DateTimeBackground** | Background bars for date axis |
| **ErrorMessage** | Error display overlay |
| **MarkerContextMenu** | Right-click context menu for data markers |

### Dialog Types
`about`, `axes`, `colors`, `find`, `label`, `markercontrols`, `moreoptions` (accordion), `opacity`, `presentation`, `repeat`, `size`, `speed`, `technical`, `timedisplay`, `zoom`

Each dialog extends the base `Dialog` class which provides: modal container, drag-to-reposition, pin toggle, open/close transitions, z-index management.

## Build System

**Rollup** config (`rollup.config.js`):
- **Input**: Multi-entry glob — `src/index.js` + `src/components/**/*.js` + `src/services/**/*.js`
- **Output**: `build/VizabiSharedComponents.js` (UMD format, name `VizabiSharedComponents`)
- **Externals**: `mobx`, `d3` (provided by host application at runtime)
- **Plugins**: trash (clean), copy (assets), multiEntry, resolve, eslint (prod), commonjs, scss (cssnano), json, replace (version/build metadata), visualizer (stats.html)
- **SCSS**: Compiled and concatenated into `build/VizabiSharedComponents.css`

**Commands**:
```bash
npm start          # Dev build with watch (rollup -c)
npm run build      # Production build (NODE_ENV=production rollup -c)
```

## Styling Architecture

- **CSS Grid layout** (`_layout.scss`): 3×2 grid for desktop — chart area + sidebar (dialogs + buttonlist) + bottom animation strip (timeslider + speedslider)
- **Responsive**: `.vzb-small` (portrait/landscape), `.vzb-medium`, `.vzb-large` breakpoints toggle grid templates
- **Projector mode**: `.vzb-presentation` class increases font sizes and UI element dimensions
- **CSS class convention**: All classes prefixed `vzb-` (e.g., `vzb-dialog-modal`, `vzb-ts-slider`, `vzb-cl-rainbow`)
- **Legacy styles**: `vizabi-old/` contains chart, common, mixins, reset partials
- **Bourbon**: SCSS mixin library for vendor prefixes and utilities

## Important Conventions

1. **D3 as DOM library**: All DOM manipulation uses `d3.select()` / `d3.selectAll()`. Templates are HTML strings passed to the constructor, not JSX or template literals with bindings.

2. **MobX 5 `decorate()` pattern**: Decorators are applied externally after class definition:
   ```js
   export const MyComp = decorate(_MyComp, { "MDL": computed, "status": computed });
   ```

3. **`MDL` getter**: Components expose a `get MDL()` computed property that destructures the model into convenient local names:
   ```js
   get MDL() {
     return { frame: this.model.encoding.frame, color: this.model.encoding.color };
   }
   ```

4. **`this.DOM` pattern**: D3 selections cached in `setup()` for reuse in `draw()`:
   ```js
   setup() { this.DOM = { axis: this.element.select(".vzb-axis"), ... }; }
   ```

5. **Status-gated drawing**: `draw()` only runs when aggregated status is READY. Use `addReaction(fn, {ignoreStatus: true})` to react earlier.

6. **Profile constants**: UI dimensions are never hardcoded — they come from PROFILE_CONSTANTS keyed by SMALL/MEDIUM/LARGE.

7. **Symbol keys**: Data rows use `Symbol.for("key")` for unique identification and `Symbol.for("trailHeadKey")` for trail detection.

8. **Component registration**: Charts register via `Chart.add("name", Class)`, dialogs via `Dialog.add("name", Class)`. This is how the host app's config maps to actual component classes.

9. **Subcomponent mounting**: Parent declares `subcomponents: [{ type: ChildClass, placeholder: ".css-selector" }]` in the constructor config. BaseComponent handles instantiation and lifecycle.

10. **Locale auto-formatter**: `this.localise = this.services.locale.auto()` returns a function that formats numbers, dates, or translates strings based on argument type.
