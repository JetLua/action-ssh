import glob from '@actions/glob'
import core from '@actions/core'

const globber = await glob.create([
  '**',
  '!node_modules/*',
  '!.git/*'
].join('\n'))

const accessKey = core.getInput('access_key')
const secretKey = core.getInput('secret_key')
const bucket = core.getInput('bucket')

console.log(bucket)

for await (const file of globber.globGenerator()) {
  console.log(file)
}
