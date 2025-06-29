import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'

const _path = process.cwd().replace(/\\/g, "/");
const invDataPath = `${_path}/plugins/xunmiao-plugin/data/inv_data.yaml`;

function getInvData() {
  if (!fs.existsSync(invDataPath)) fs.writeFileSync(invDataPath, yaml.stringify({}));
  return yaml.parse(fs.readFileSync(invDataPath, 'utf8')) || {};
}

export class inv extends plugin {
  constructor() {
    super({
      name: '寻喵背包',
      dsc: '背包系统',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: '^#*背包$', fnc: 'showInv' }
      ]
    })
  }

  async showInv(e) {
    const userId = `${e.user_id}`;
    let invData = getInvData();

    if (!invData[userId] || Object.keys(invData[userId]).length === 0) {
      return e.reply('你的背包是空的哦~', false, { at: true });
    }

    let msg = '【你的背包】\n';
    for (const [item, count] of Object.entries(invData[userId])) {
      msg += `${item} x${count}\n`;
    }
    return e.reply(msg, false, { at: true });
  }
}