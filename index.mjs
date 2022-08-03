import * as path from 'node:path'

import glob from 'glob'
import core from '@actions/core'
import github from '@actions/github'

async function run() {
  await new Promise(resolve => {
    const base = path.resolve(process.cwd())
    glob(`${base}/*`, {dot: true}, (err, files) => {
      console.log('base', base)
      core.info('files', files)
      console.log(files.length, files.join('\n'))
      resolve()
    })
  })
}

run()
