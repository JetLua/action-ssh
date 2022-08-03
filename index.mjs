import * as path from 'node:path'

import glob from 'glob'
import core from '@actions/core'
import github from '@actions/github'

glob('*', (err, files) => {
  core.setOutput(files.join(''))
})
