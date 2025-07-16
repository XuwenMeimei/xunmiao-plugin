import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs';
import yaml from 'yaml';

const _path = process.cwd().replace(/\\/g, "/");
const BotPath = `${_path}/plugins/xunmiao-plugin/config/bot.yaml`;

function getBotData() {
    if (!fs.existsSync(BotPath)) fs.writeFileSync(BotPath, yaml.stringify({}));
    return yaml.parse(fs.readFileSync(BotPath, 'utf8')) || {};
}

const BotData = getBotData();
const BotQQ = BotData.BotQQ;

export class nekopoke extends plugin {
    constructor() {
        super({
            name: '寻喵戳一戳',
            dsc: '寻喵戳一戳功能',
            event: 'notice.group.poke',
            priority: -1,
            rule: [
                {
                    reg: '.*',
                    fnc: 'nekopoke'
                }
            ]
        });
    } 

    async nekopoke(e) {
        const botqq = BotQQ;
        console.log(e.target_id);
        console.log(botqq);
        if (e.target_id == botqq) {
            const shouldReply = Math.random() < 0.5 ;
            if (shouldReply) {
                const replies = ['别戳了~', '要戳坏掉了~', '你欺负人，呜呜~', '别戳了!!!', '不准戳了！！！', '再戳就坏了~'];  
                const randomReply = replies[Math.floor(Math.random() * replies.length)];
                return this.reply(randomReply, false, { at: false });
            }
        }
    }
}
