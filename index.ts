import {relative} from 'node:path'
import {readFile, stat, writeFile} from 'node:fs/promises'

import axios from 'axios'
import * as FormData from 'form-data'
import * as JSZip from 'jszip'
import * as core from '@actions/core'
import * as glob from '@actions/glob'

const URL = core.getInput('URL')
const DIR = core.getInput('DIR')


!async function() {
  const globber = await glob.create([
    '.next/**/*',
    'public/**/*',
    'next.config.js',
    'next-env.d.ts',
  ].join('\n'))

  const zip = new JSZip()

  for await (const file of globber.globGenerator()) {
    const stats = await stat(file)
    const rPath = relative('.', file)
    if (stats.isDirectory()) {
      zip.folder(rPath)
    } else {
      zip.file(rPath, await readFile(file))
    }
  }

  const data = await zip.generateAsync({type: 'arraybuffer'})

  const formData = new FormData()
  formData.append('file', Buffer.from(data), 'dist.zip')
  formData.append('dir', DIR)
  console.log('upload: start')
  axios.post(URL, formData, {
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  }).then(() => {
    console.log('upload: done')
  }).catch(err => {
    console.log('upload: failed')
    console.error(err)
  })
}()
