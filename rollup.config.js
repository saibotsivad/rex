import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import replace from '@rollup/plugin-replace'


import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync } from 'node:fs'
const __dirname = dirname(fileURLToPath(import.meta.url))
const { version } = JSON.parse(readFileSync(join(__dirname, './package.json'), 'utf8'))

export default {
	input: 'src/index.js',
	output: {
		format: 'cjs',
		file: 'build/index.cjs',
	},
	external: [
		'aws-sdk',
	],
	plugins: [
		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration -
		// consult the documentation for details:
		// https://github.com/rollup/plugins/tree/master/packages/commonjs
		resolve({
			browser: false,
			preferBuiltins: true,
		}),
		commonjs(),
		json(),
		replace({
			preventAssignment: true,
			values: {
				'__VERSION__': version,
			},
		}),
	],
}
