/* eslint-disable no-undef */
const path = require('path');
const meta = require("./package.json");
const fs = require('fs');

const postcss = require("postcss");
const babel = require("rollup-plugin-babel");
const {eslint} = require("rollup-plugin-eslint");
const resolve = require("rollup-plugin-node-resolve");
const commonjs = require("rollup-plugin-commonjs");
const replace = require("rollup-plugin-replace");
const {terser} = require("rollup-plugin-terser");
const sass = require("rollup-plugin-sass");
const json = require("rollup-plugin-json");
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
    sourcemap: true,
    globals: {
      "mobx": "mobx"
    }
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
      //output: (dir || "build") + "/VizabiSharedComponents.css",
      output(styles, styleNodes) {
        //console.log(styles);
        postcss([require("cssnano")]).process(styles)
          .then(result => {
            fs.writeFileSync((dir || "build") + "/VizabiSharedComponents.css", result.css);
          })
      }
    }),
    json(),
    replace({
      ENV: JSON.stringify(process.env.NODE_ENV || "development")
    }),
    (process.env.NODE_ENV === "production" && terser({output: {preamble: copyright}})),
  ]
});
