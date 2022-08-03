import * as path from 'node:path'

import glob from 'glob'
import core from '@actions/core'
import github from '@actions/github'

async function run() {
  await new Promise(resolve => {
    glob('*', (err, files) => {
      core.setOutput('files', files.join(''))
      resolve()
    })
  })
}

run()
