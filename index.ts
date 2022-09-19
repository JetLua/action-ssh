import axios from 'axios'
import {stat, open, readFile} from 'node:fs/promises'
import {read} from 'node:fs'
import * as FormData from 'form-data'
import * as core from '@actions/core'
import {spawn} from 'node:child_process'

const URL = core.getInput('URL')
const DIR = core.getInput('DIR')
const TOKEN = core.getInput('TOKEN')

const cmd = spawn('zip -qr dist.zip .next/**/* public/**/* next.config.js next-env.d.ts package.json', {shell: true})

cmd.on('close', async code => {
  if (code) return console.error(code)

  const {ok, data, msg} = await axios.get(`${URL}/upload`).then(async ({data}) => data)

  if (!ok) return console.error(msg)

  const info = await stat('dist.zip')
  const size = info.size
  const id = data.id
  const maxFileSize = data.maxFileSize
  const fd = await open('dist.zip')

  let resolve: Function
  const p = new Promise<string>(_resolve => resolve = _resolve)

  if (size > maxFileSize) {
    const n = size / maxFileSize | 0
    const m = size - n * maxFileSize
    const total = n + (m > 0 ? 1 : 0)

    for (let i = 0; i < total; i++) {
      const buf = Buffer.alloc(i < n ? maxFileSize : m)

      read(fd.fd, {buffer: buf, position: i * maxFileSize}, (err) => {
        const formData = new FormData()
        formData.append('block', buf)
        formData.append('id', id)
        formData.append('index', i)
        formData.append('total', total)

        axios(`${URL}/upload`, {
          method: 'PUT',
          data: formData
        }).then(({data: {ok, data}}) => {
          if (ok && data.done) resolve(data.file)
          else if (!ok) resolve()
        }).catch(() => {})
      })
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
      if (ok && data.done) resolve(data.file)
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
