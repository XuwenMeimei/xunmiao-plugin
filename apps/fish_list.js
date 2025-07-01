import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'

const _path = process.cwd().replace(/\\/g, "/");
const fishTypesPath = `${_path}/plugins/xunmiao-plugin/config/fish_types.yaml`;

function getFishTypes() {
  if (!fs.existsSync(fishTypesPath)) return [];
  const content = fs.readFileSync(fishTypesPath, 'utf8');
  return yaml.parse(content) || [];
}

export class fish_list extends plugin {
  constructor() {
    super({
      name: '鱼类图鉴',
      dsc: '列出所有鱼的种类',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#鱼图鉴$',
          fnc: 'showFishList'
        }
      ]
    })
  }

  async showFishList(e) {
    const fishTypes = getFishTypes();
    if (!fishTypes.length) return e.reply('暂无鱼类数据~', false, { at: true });

    // 计算总权重
    const totalWeight = fishTypes.reduce((sum, f) => sum + (f.weight || 1), 0);

    // 整理数据并排序
    const fishList = fishTypes.map(f => ({
      name: f.name,
      len: `${f.minLen}~${f.maxLen}cm`,
      weight: `${f.minW}~${f.maxW}kg`,
      probValue: (f.weight || 1) / totalWeight,
      prob: ((f.weight || 1) / totalWeight * 100).toFixed(2) + '%',
      price: `x${f.priceRate}`,
      priceValue: f.priceRate,
      rare: f.normal ? '普通' : '稀有'
    }))
    .sort((a, b) => b.probValue - a.probValue || b.priceValue - a.priceValue);

    const base64 = await puppeteer.screenshot('xunmiao-plugin', {
      saveId: 'fish_list',
      imgType: 'png',
      tplFile: `${_path}/plugins/xunmiao-plugin/res/fish_list/fish_list.html`,
      pluginResources: `${_path}/plugins/xunmiao-plugin/res/fish_list/fish_list.css`,
      data: { fishList }
    });

    return e.reply(base64, false, { at: true });
  }
}