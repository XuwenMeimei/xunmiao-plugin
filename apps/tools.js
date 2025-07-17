import plugin from '../../../lib/plugins/plugin.js'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'

export class tools extends plugin {
  constructor() {
    super({
      name: '寻喵工具',
      dsc: '寻喵工具相关功能',
      event: 'message',
      priority: 0,
      rule: [
        {
          reg: '^#网页截图\\s*(https?://\\S+)$',
          fnc: 'webScreenshot'
        }
      ]
    })
  }

  async webScreenshot(e) {
    const match = e.msg.match(/^#网页截图\s*(https?:\/\/\S+)$/)
    if (!match) {
      return e.reply('请发送 #网页截图 <网址>，如 #网页截图 https://www.example.com', false, { at: true })
    }
    const url = match[1]
    try {
      const browser = await puppeteer.launch({ headless: 'new' })
      const page = await browser.newPage()
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 })
      await page.setViewport({ width: 1280, height: 800 })
      const image = await page.screenshot({ type: 'png', fullPage: true })
      await browser.close()
      return e.reply(image)
    } catch (err) {
      console.error('网页截图失败:', err)
      return e.reply('网页截图失败，请检查网址是否正确或稍后再试。', false, { at: true })
    }
  }
}