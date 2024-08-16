import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs';
import yaml from 'yaml';

const _path = process.cwd().replace(/\\/g, "/");
const dataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;

let Savecoins = 0;
let Takecoins = 0;

export class duel extends plugin {
  constructor() {
    super({
      name: '寻喵决斗',
      dsc: '寻喵决斗功能',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#存钱(.*)$',
          fnc: 'save'
        },
        {
        reg: '^#取钱(.*)$',
        fnc: 'take'
        }
      ]
    })
  }
  async save(e) {
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        let userData = yaml.parse(fileContent) || {};

        if (!userData[e.user_id]) {
            userData[e.user_id] = {
              coins: 0,
              bank: 0
            };
        }

        const { coins: coins_id1 } = userData[e.user_id];
        
        const regex = /#存钱\s*(\d+)$/;
        const match = e.msg.match(regex);

        if (match) {
            Savecoins = parseInt(match[1], 10);
    
            if (Savecoins > coins_id1) {
              return e.reply('你没有那么多喵喵币存入哦~', false, { at: true });
            }

            userData[e.user_id].bank += Savecoins;
            userData[e.user_id].coins -= Savecoins;
            
            return e.reply(`你成功存入了${Savecoins}个喵喵币哦~
你还剩${UserData[e.user_id].coins}个喵喵币
银行存款有${userData[e.user_id].bank}个喵喵币 `, false, { at: true });
        }
        fs.writeFileSync(dataPath, yaml.stringify(userData));
    }

    async take(e) {
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        let userData = yaml.parse(fileContent) || {};

        if (!userData[e.user_id]) {
            userData[e.user_id] = {
              coins: 0,
              bank: 0
            };
        }

        const { coins: coins_id1 } = userData[e.user_id];
        
        const regex = /#取钱\s*(\d+)$/;
        const match = e.msg.match(regex);

        if (match) {
            Takecoins = parseInt(match[1], 10);
    
            if (Takecoins > coins_id1) {
              return e.reply('你没有那么多喵喵币取出哦~', false, { at: true });
            }

            userData[e.user_id].bank -= Takecoins;
            userData[e.user_id].coins += Takecoins;
            
            return e.reply(`你成功存入了${Takecoins}个喵喵币哦~
你还剩${UserData[e.user_id].coins}个喵喵币
银行存款有${userData[e.user_id].bank}个喵喵币 `, false, { at: true });
        }
        fs.writeFileSync(dataPath, yaml.stringify(userData));
    }
}