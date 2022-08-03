import glob from '@actions/glob'

const globber = await glob.create('**')

for await (const file of globber.globGenerator()) {
  console.log(file)
}
