import {env} from 'node:process'
import {relative} from 'node:path'
import {stat} from 'node:fs/promises'
import {createReadStream} from 'node:fs'

import 'dotenv/config'
import qiniu from 'qiniu'
import glob from '@actions/glob'
import core from '@actions/core'

import ssh from './ssh.mjs'

const accessKey = core.getInput('access_key') ?? env.ACCESS_KEY
const secretKey = core.getInput('secret_key') ?? env.SECRET_KEY
const bucket = core.getInput('bucket') ?? env.BUCKET
const sourceDir = core.getInput('source_dir') ?? env.SOURCE_DIR
const destDir = core.getInput('dest_dir') ?? env.DEST_DIR

const globber = await glob.create([
  `${srcDir}/*`
].join('\n'))

const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
const uploader = new qiniu.form_up.FormUploader()


for await (const file of globber.globGenerator()) {
  const stats = await stat(file)
  if (stats.isDirectory()) continue
  await upload(file)
}

ssh()

async function upload(file) {
  await new Promise(resolve => {
    const key = `${destDir}/${relative(sourceDir, file)}`

    const policy = new qiniu.rs.PutPolicy({
      scope: `${bucket}:${key}`,
    })

    const token = policy.uploadToken(mac)

    uploader.putStream(token, key, createReadStream(file), null, (err) => {
      resolve()
      if (err) console.log(err.message)
      console.log(`ok: ${key}`)
    })
  })
}
