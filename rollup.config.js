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
    sourceMap: "inline"
  },
  plugins: [
    trash({
      targets: ['build/bundle.js', 'build/bundle.css', 'build/stats.html']
    }),
    sass({
      output: "build/bundle.css",
    }),
    json(),
    resolve(),
    eslint(),
    babel({
      exclude: "node_modules/**"
    }),
    commonjs(),
    replace({
      ENV: JSON.stringify(process.env.NODE_ENV || "development")
    }),
    copy({
      targets: {
        "src/assets": "build/assets"
      }
    }),
    (process.env.NODE_ENV === "production" && terser({output: {preamble: copyright}})),
    (process.env.NODE_ENV === "devserver" && serve("build")),
    (process.env.NODE_ENV === "devserver" && livereload("build")), 
    visualizer({
      filename: "./build/stats.html"
    }),       
  ],
};