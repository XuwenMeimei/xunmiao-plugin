import fs from 'node:fs'

logger.info('---------^_^---------')
logger.info('主人！寻喵酱打卡上班啦！')
logger.info('---------------------')

if (!fs.existsSync('user_data.yaml')) {
  fs.copyFileSync('user_data.template.yaml', 'user_data.yaml')
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