import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs';
import yaml from 'yaml';
import cfg from '../../../lib/config/config.js'

const _path = process.cwd().replace(/\\/g, "/");
const dataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;

export class duel extends plugin {
    constructor() {
      super({
        name: '寻喵查询',
        dsc: '寻喵查询功能',
        event: 'message',
        priority: 5000,
        rule: [
          {
            reg: '^#查询(.*)$',
            fnc: 'check'
          }
        ]
      })
    }

    async check(e) {
        if (!cfg.masterQQ.includes(e.user_id)) {
            return e.reply('只有我的主人才能查询哦~', false, { at:true });
        }else{
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        let userData = yaml.parse(fileContent) || {};

        const id = e.at;

        e.reply(`QQ号：${e.at}
上次签到：${userData[id].lastSignIn}
今日人品：${userData[id].luck}
喵喵币：${userData[id].coins}
好感度：${userData[id].favorability}
银行存款：${userData[id].bank}
累计签到：${userData[id].totalSignCount}`)
        }
    }
}