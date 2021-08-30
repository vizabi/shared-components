/* eslint-disable no-undef */
const path = require("path");
const meta = require("./package.json");
const fs = require("fs");

const postcss = require("postcss");
const {eslint} = require("rollup-plugin-eslint");
const resolve = require("@rollup/plugin-node-resolve").default;
const commonjs = require("@rollup/plugin-commonjs");
const replace = require("@rollup/plugin-replace");
const scss = require("rollup-plugin-scss");
const json = require("@rollup/plugin-json");
const trash = require("rollup-plugin-delete");
const copy = require("rollup-plugin-copy");
const multiEntry = require("@rollup/plugin-multi-entry");
import {visualizer} from "rollup-plugin-visualizer";

const timestamp = new Date();
const copyright = `// ${meta.homepage} v${meta.version} build ${+timestamp} Copyright ${timestamp.getFullYear()} ${meta.author.name} and contributors`;

export default {
  input: {
    include: [path.resolve(__dirname,"src/index.js"), path.resolve(__dirname,"src/components/**/*.js"), path.resolve(__dirname,"src/services/**/*.js")],
    exclude: [path.resolve(__dirname,"src/**/config.js")]
  },
  output: {
    name: "VizabiSharedComponents",
    file: "build/VizabiSharedComponents.js",
    format: "umd",
    banner: copyright,
    sourcemap: true,
    globals: {
      "mobx": "mobx"
    }
  },
  external: ["mobx"],
  plugins: [
    trash({
      targets: ["build/*"]
    }),
    copy({
      targets: [{
        src: [path.resolve(__dirname,"src/assets")],
        dest: "build"
      }]
    }),
    multiEntry(),
    resolve(),
    (process.env.NODE_ENV === "production" && eslint()),
    commonjs(),
    scss({
      include: path.resolve(__dirname,"src/**/*.scss"),
      //output: "build/VizabiSharedComponents.css",
      output(styles) {
        //console.log(styles);
        postcss([require("cssnano")]).process(styles)
          .then(result => {
            fs.writeFileSync("build/VizabiSharedComponents.css", result.css);
          });
      }
    }),
    json(),
    replace({
      preventAssignment: true,
      values: {
        ENV: JSON.stringify(process.env.NODE_ENV || "development"),
        __VERSION: JSON.stringify(meta.version),
        __BUILD: +timestamp,
        __PACKAGE_JSON_FIELDS: JSON.stringify({
          contributors: meta.contributors,
          author: meta.author,
          homepage: meta.homepage,
          name: meta.name,
          description: meta.description
        })
      }
    }),
    visualizer({
      filename: "./build/stats.html"
    }),
  ]
};
