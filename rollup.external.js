/* eslint-disable no-undef */
const path = require('path');
const meta = require("./package.json");

const babel = require("rollup-plugin-babel");
const {eslint} = require("rollup-plugin-eslint");
const resolve = require("rollup-plugin-node-resolve");
const commonjs = require("rollup-plugin-commonjs");
const replace = require("rollup-plugin-replace");
const {terser} = require("rollup-plugin-terser");
const sass = require("rollup-plugin-sass");
const serve = require("rollup-plugin-serve");
const livereload = require("rollup-plugin-livereload");
const json = require("rollup-plugin-json");
const visualizer = require("rollup-plugin-visualizer");
const trash = require("rollup-plugin-delete");
const copy = require("rollup-plugin-copy");
const multiEntry = require("rollup-plugin-multi-entry");

const copyright = `// ${meta.homepage} v${meta.version} Copyright ${(new Date).getFullYear()} ${meta.author.name}`;

module.exports = dir => ({
  input: {
    include: [path.resolve(__dirname,'src/index.js'), path.resolve(__dirname,'src/components/**/*.js'), path.resolve(__dirname,'src/services/**/*.js')],
    exclude: [path.resolve(__dirname,'src/**/config.js')]
  },
  output: {
    name: "VizabiSharedComponents",
    file: (dir || "build") + "/VizabiSharedComponents.js",
    format: "umd",
    banner: copyright,
    sourcemap: true
  },
  external: ["mobx"],
  plugins: [
    !dir && trash({
      targets: ['build/*']
    }),
    copy({
      targets: [{
        src: [path.resolve(__dirname,"src/assets")],
        dest: (dir && path.resolve(dir, "..")) || "build"
      }]
    }),
    multiEntry(),
    resolve(),
    (process.env.NODE_ENV === "production" && eslint()),
    // babel({
    //   exclude: "node_modules/**"
    // }),
    commonjs(),
    sass({
      include: path.resolve(__dirname,"src/**/*.scss"),
      output: (dir || "build") + "/VizabiSharedComponents.css",
    }),
    json(),
    replace({
      ENV: JSON.stringify(process.env.NODE_ENV || "development")
    }),
    (process.env.NODE_ENV === "production" && terser({output: {preamble: copyright}})),
    (process.env.NODE_ENV === "devserver" && serve("build")),
    (process.env.NODE_ENV === "devserver" && livereload("build")),
    visualizer({
      filename: "./build/stats.html"
    }),
  ]
});
