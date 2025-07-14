import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import plugin from '../../lib/plugins/plugin.js'


const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')

const templatePath = path.join(dataDir, 'user_data.template.yaml')
const userDataPath = path.join(dataDir, 'user_data.yaml')

// 新增背包数据文件和模板
const invTemplatePath = path.join(dataDir, 'inv_data.template.yaml')
const invDataPath = path.join(dataDir, 'inv_data.yaml')

const shopTemplatePath = path.join(dataDir, 'shop_stock.template.yaml')
const shopDataPath = path.join(dataDir, 'shop_stock.yaml')

const userBuy = path.join(dataDir, 'user_buy.template.yaml')
const userBuyPath = path.join(dataDir, 'user_buy.yaml')

const userDailyBuy = path.join(dataDir, 'user_daily_buy.template.yaml')
const userDailyBuyPath = path.join(dataDir, 'user_daily_buy.yaml')

const deepseek_config = path.join(__dirname, 'config/deepseek/config.template.yaml')
const deepseek_config_path = path.join(__dirname, 'config/deepseek/config.yaml')

const marry_data = path.join(dataDir, 'marry_data.yaml')
const marry_data_path = path.join(dataDir, 'marry_data.template.yaml')


//初始化 marry_data 配置文件
if (!fs.existsSync(marry_data)) {
  if (fs.existsSync(marry_data_path)) {
    fs.copyFileSync(marry_data_path, marry_data)
    console.log('从模板复制了 marry_data.yaml')
  } else {
    console.warn('未找到模板文件：', marry_data_path)
  }
}

// 初始化 DeepSeek 配置文件
if (!fs.existsSync(deepseek_config_path)) {
  if (fs.existsSync(deepseek_config)) {
    fs.copyFileSync(deepseek_config, deepseek_config_path)
    console.log('从模板复制了 DeepSeek 配置文件')
  } else {
    console.warn('未找到模板文件：', deepseek_config)
  }
}

// 初始化 user_data.yaml
if (!fs.existsSync(userDataPath)) {
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, userDataPath)
    console.log('从模板复制了 user_data.yaml')
  } else {
    console.warn('未找到模板文件：', templatePath)
  }
}

//初始化 shop_stock.yaml
if (!fs.existsSync(shopDataPath)) {
  if (fs.existsSync(shopTemplatePath)) {
    fs.copyFileSync(shopTemplatePath, shopDataPath)
    console.log('从模板复制了 shop_stock.yaml')
  } else {
    // 没有模板则创建空文件
    fs.writeFileSync(shopDataPath, '')
    console.log('创建了空的 shop_stock.yaml')
  }
}

// 初始化 inv_data.yaml
if (!fs.existsSync(invDataPath)) {
  if (fs.existsSync(invTemplatePath)) {
    fs.copyFileSync(invTemplatePath, invDataPath)
    console.log('从模板复制了 inv_data.yaml')
  } else {
    // 没有模板则创建空文件
    fs.writeFileSync(invDataPath, '')
    console.log('创建了空的 inv_data.yaml')
  }
}

//初始化 user_buy.yaml
if (!fs.existsSync(userBuyPath)) {
  if (fs.existsSync(userBuy)) {
    fs.copyFileSync(userBuy, userBuyPath)
    console.log('从模板复制了 user_buy.yaml')
  }
}

//初始化 user_daily_buy.yaml
if (!fs.existsSync(userDailyBuyPath)) {
  if (fs.existsSync(userDailyBuy)) {
    fs.copyFileSync(userDailyBuy, userDailyBuyPath) 
    console.log('从模板复制了 user_daily_buy.yaml')
  }
}

let qq = e.bot

logger.info('---------^_^---------')
logger.info('主人！寻喵酱打卡上班啦！')
logger.info('---------------------')
logger.info('当前连接: ', qq)


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