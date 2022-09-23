import axios from 'axios'
import {stat, open, readFile} from 'node:fs/promises'
import {read} from 'node:fs'
import * as FormData from 'form-data'
import * as core from '@actions/core'
import {spawn} from 'node:child_process'

const URL = core.getInput('URL')
const DIR = core.getInput('DIR')
const CMD = core.getInput('CMD')
const ZIP_CMD = core.getInput('ZIP_CMD')
const TOKEN = core.getInput('TOKEN')

// const URL = 'http://localhost:3001'
// const DIR = '/Users/jetlu/workspace/action-ssh/ok'
// const TOKEN = 'Jenius'

const cmd = spawn(ZIP_CMD, {shell: true})
// const cmd = spawn('zip -qr dist.zip *', {shell: true})

cmd.on('exit', async code => {

  if (code) return console.error(code)

  const {ok, data, msg} = await axios.get(`${URL}`).then(async ({data}) => data).catch(() => ({}))

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

      formData.append('block', buf, {filename: 'block'})
      formData.append('id', id)
      formData.append('index', i)
      formData.append('total', total)

      axios(`${URL}`, {
        method: 'PUT',
        data: formData
      }).then(({data: {ok, data, err}}) => {
        console.log(`ok: ${ok}`, `err: ${err}`)
        if (ok && data.done) resolve(data.done)
        else if (!ok) resolve()
      }).catch(() => {})
    }
  } else {
    const formData = new FormData()
    formData.append('block', await readFile('dist.zip'))
    formData.append('total', 1)
    formData.append('index', 0)
    formData.append('id', id)
    axios(`${URL}`, {
      method: 'PUT',
      data: formData
    }).then(({data: {ok, data, err}}) => {
      console.log(`ok: ${ok}`, `err: ${err}`)
      if (ok && data.done) resolve(data.done)
      else if (!ok) resolve()
    })
  }

  const done = await p

  if (!done) return console.log('部署失败')

  axios.post(`${URL}`, {
    id,
    dir: DIR,
    token: TOKEN,
    cmd: CMD
  }).then(res => {
    console.log(res.data)
  })
})
