import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

console.log('当前工作目录 process.cwd():', process.cwd())
const __dirname = path.dirname(fileURLToPath(import.meta.url))
console.log('当前脚本所在目录 __dirname:', __dirname)

logger.info('---------^_^---------')
logger.info('主人！寻喵酱打卡上班啦！')
logger.info('---------------------')

if (!fs.existsSync('./data/user_data.yaml')) {
  fs.copyFileSync('./data/user_data.template.yaml', './data/user_data.yaml')
}

const files = fs.readdirSync('./plugins/xunmiao-plugin/apps').filter(file => file.endsWith('.js'))

let ret = []

files.forEach((file) => {
    ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')

  if (ret[i].status != 'fulfilled') {
    logger.error(`载入插件时错误`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}
export { apps }