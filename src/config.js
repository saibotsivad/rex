import { join } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import dlv from 'dlv'
import { dset } from 'dset'
import envPaths from 'env-paths'

const { config: configPath } = envPaths('rex')

const filepath = join(configPath, 'config.json')
const read = () => {
	try {
		return JSON.parse(readFileSync(filepath, 'utf8'))
	} catch (error) {
		if (error.code === 'ENOENT') return {}
		else throw error
	}
}
const write = data => {
	mkdirSync(configPath, { recursive: true })
	writeFileSync(filepath, JSON.stringify(data, undefined, 4), 'utf8')
}

export const config = {
	get: keypath => {
		const data = read()
		return dlv(data, keypath)
	},
	set: (keypath, value) => {
		const data = read()
		dset(data, keypath, value)
		write(data)
		return data
	},
	unset: keypath => {
		const data = read()
		dset(data, keypath, undefined)
		write(data)
		return data
	},
	path: () => filepath,
}
