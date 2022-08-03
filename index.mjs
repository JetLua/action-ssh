import glob from '@actions/glob'
import core from '@actions/core'


const accessKey = core.getInput('access_key')
const secretKey = core.getInput('secret_key')
const bucket = core.getInput('bucket')
const srcDir = core.getInput('source_dir')
const dest_dir = core.getInput('dest_dir')

const globber = await glob.create([
  `${srcDir}/**/*`,
].join('\n'))



for await (const file of globber.globGenerator()) {
  console.log(file)
}
