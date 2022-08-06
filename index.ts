import {relative} from 'node:path'
import {stat} from 'node:fs/promises'
import {createReadStream} from 'node:fs'

import 'dotenv/config'
import qiniu from 'qiniu'
import glob from '@actions/glob'
import core from '@actions/core'

const accessKey = core.getInput('ACCESS_KEY')
const secretKey = core.getInput('SECRET_KEY')
const bucket = core.getInput('BUCKET')
const sourceDir = core.getInput('SOURCE_DIR')
const destDir = core.getInput('DEST_DIR')
const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
const uploader = new qiniu.form_up.FormUploader()

!async function() {
  const globber = await glob.create([
    `${sourceDir}/*`
  ].join('\n'))



  for await (const file of globber.globGenerator()) {
    const stats = await stat(file)
    if (stats.isDirectory()) continue
    await upload(file)
  }
}()


async function upload(file: string) {
  await new Promise<void>(resolve => {
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
