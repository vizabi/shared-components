/* eslint-disable no-undef */
import * as meta from "./package.json";

import babel from "rollup-plugin-babel";
import {eslint} from "rollup-plugin-eslint";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import replace from "rollup-plugin-replace";
import {terser} from "rollup-plugin-terser";
import sass from "rollup-plugin-sass";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";
import json from "rollup-plugin-json";
import visualizer from "rollup-plugin-visualizer";
import trash from "rollup-plugin-delete";
import copy from "rollup-plugin-copy";

const copyright = `// ${meta.homepage} v${meta.version} Copyright ${(new Date).getFullYear()} ${meta.author.name}`;

export default {
  input: "src/index.js",
  output: {
    file: "build/bundle.js",
    format: "umd",
    banner: copyright,
    sourcemap: "inline"
  },
  plugins: [
    trash({
      targets: ['build/*']
    }),
    copy({
      targets: [{
        src: ["index.html", "main.js", "index.css"],
        dest: "build"
      },{
        src: ["src/assets","lib","data"],
        dest: "build"
      }]
    }),
    sass({
      output: "build/bundle.css",
    }),
    json(),
    resolve(),
    (process.env.NODE_ENV === "production" && eslint()),
    babel({
      exclude: "node_modules/**"
    }),
    commonjs(),
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
};
