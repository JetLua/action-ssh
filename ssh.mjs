import {env} from 'node:process'
import {relative} from 'node:path'
import {stat} from 'node:fs/promises'

import 'dotenv/config'
import {Client} from 'ssh2'
import core from '@actions/core'
import glob from '@actions/glob'


export default function() {
  const SOURCE_DIR = core.getInput('SOURCE_DIR')
  const SSH_KEY = core.getInput('SSH_KEY')
  const SSH_HOST = core.getInput('SSH_HOST')
  const SSH_PORT = core.getInput('SSH_PORT')
  const SSH_USER = core.getInput('SSH_USER')
  const SSH_DIR = core.getInput('SSH_DIR')

  // const SOURCE_DIR = env.SOURCE_DIR
  // const SSH_KEY = env.SSH_KEY
  // const SSH_HOST = env.SSH_HOST
  // const SSH_PORT = env.SSH_PORT
  // const SSH_USER = env.SSH_USER
  // const SSH_DIR = env.SSH_DIR

  const client = new Client()


  /**
   * @type {import('ssh2').SFTPWrapper}
   */
  const sftp = await new Promise((resolve, reject) => {
    client.connect({
      privateKey: SSH_KEY,
      port: SSH_PORT,
      host: SSH_HOST,
      username: SSH_USER
    }).on('ready', () => {
      client.sftp((err, sftp) => {
        if (err) reject(err)
        resolve(sftp)
      })
    })
  })


  const globber = await glob.create([
    '.next/**/*',
    'public/**/*',
    'next.config.js',
    'next-env.d.ts',
  ].join('\n'))

  await new Promise(resolve => {
    client.exec(`rm -fr ${SSH_DIR}`, (err, steam) => {
      resolve()
    })
  })

  await mkdir([
    SSH_DIR
  ])

  for await (const file of globber.globGenerator()) {
    const stats = await stat(file)
    const path = `${SSH_DIR}/${relative(SOURCE_DIR, file)}`
    if (stats.isDirectory()) {
      await new Promise(resolve => {
        sftp.stat(path, (err, stats) => {
          if (!stats) sftp.mkdir(path, resolve)
        })
      })
    } else {
      await new Promise(resolve => {
        sftp.fastPut(
          file,
          path,
          resolve
        )
      })
    }
  }

  console.log('upload: done')

  client.exec(`cd ${SSH_DIR} && npm i && service website restart`, (err, steam) => {
    steam.on('data', data => {
      console.log(data.toString())
    })
  })

  /**
   *
   * @param {Array<string>} dirs
   */
  async function mkdir(dirs) {
    await Promise.all(dirs.map(dir => {
      return new Promise(resolve => {
        sftp.stat(dir, (err, stats) => {
          if (!stats) sftp.mkdir(dir, resolve)
        })
      })
    }))
  }
}
