import axios from 'axios'
import {stat, open, readFile} from 'node:fs/promises'
import {read, createReadStream} from 'node:fs'
import * as FormData from 'form-data'
import * as core from '@actions/core'
import {spawn} from 'node:child_process'
import {BADFLAGS} from 'node:dns'

const URL = core.getInput('URL')
const DIR = core.getInput('DIR')
const TOKEN = core.getInput('TOKEN')

const cmd = spawn('zip -qr dist.zip .next/* public/* next.config.js next-env.d.ts package.json', {shell: true})
// const cmd = spawn('zip -qr dist.zip *', {shell: true})

cmd.on('exit', async code => {

  if (code) return console.error(code)

  const {ok, data, msg} = await axios.get(`${URL}/upload`).then(async ({data}) => data).catch(() => ({}))

  if (!ok) return console.error(msg)

  const info = await stat('dist.zip')
  const size = info.size
  const id = data.id
  const maxFileSize = data.maxFileSize

  let resolve: Function

  const p = new Promise(_resolve => resolve = _resolve)

  if (size > maxFileSize) {
    const n = size / maxFileSize | 0
    const m = size - n * maxFileSize
    const total = n + (m > 0 ? 1 : 0)
    const fd = await open('dist.zip')

    for (let i = 0; i < total; i++) {
      const buf = Buffer.alloc(i < n ? maxFileSize : m)

      await new Promise<void>(resolve => {
        read(fd.fd, {buffer: buf}, (err, num, buf) => {
          console.log(`num: ${num}`)
          resolve()
        })
      })

      const formData = new FormData()

      formData.append('block', buf)
      formData.append('id', id)
      formData.append('index', i)
      formData.append('total', total)

      axios(`${URL}/upload`, {
        method: 'PUT',
        data: formData
      }).then(({data: {ok, data, msg}}) => {
        console.log(`ok: ${ok}`, `msg: ${msg}`)
        if (ok && data.done) resolve(data.filePath)
        else if (!ok) resolve()
      }).catch(() => {})
    }
  } else {
    const formData = new FormData()
    formData.append('block', await readFile('dist.zip'))
    formData.append('total', 1)
    formData.append('index', 0)
    formData.append('id', id)
    axios(`${URL}/upload`, {
      method: 'PUT',
      data: formData
    }).then(({data: {ok, data}}) => {
      console.log(`ok: ${ok}`, `msg: ${msg}`)
      if (ok && data.done) resolve(data.filePath)
      else if (!ok) resolve()
    })
  }

  const filePath = await p

  if (!filePath) return console.log('部署失败')

  axios.post(`${URL}`, {
    id,
    dir: DIR,
    token: TOKEN,
    cmd: 'cd /root/workspace/website && npm i && service website restart'
  }).then(res => {
    console.log(res.data)
  })
})
