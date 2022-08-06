import glob from '@actions/glob'
import {stat} from 'node:fs/promises'
import {relative, resolve} from 'node:path'


const globber = await glob.create([
  '.next/**/*',
  'public/**/*',
  'next.config.js',
  'next-env.d.ts',
].join('\n'))

const SSH_DIR = '/root'

for await (const file of globber.globGenerator()) {
  const stats = await stat(file)
  const path = `${SSH_DIR}/${relative('.', file)}`
  console.log(path)
}
