import * as path from 'node:path'

import glob from 'glob'
import core from '@actions/core'
import github from '@actions/github'

async function run() {
  await new Promise(resolve => {
    const base = path.resolve('.')
    glob(`${base}/**/*`, (err, files) => {
      core.setOutput('files', files.join(''))
      core.info('files', files.join(''))
      resolve()
    })
  })
}

run()
