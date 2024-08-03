import plugin from '../../../lib/plugins/plugin.js'
import { segment } from 'oicq'
import fs from 'fs'
import yaml from 'yaml'
import cfg from '../../../lib/config/config.js'

const _path = process.cwd().replace(/\\/g, "/");
const dataPath = `${_path}/plugins/xunmiao-plugin/data/br_data.yaml`;

if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, yaml.stringify({ gameInProgress: false, invites: {} }));
}

export class br extends plugin {
    constructor() {
        super({
            name: '恶魔轮盘赌',
            dsc: '寻喵恶魔轮盘赌功能',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#恶魔轮盘赌(.*)$',
                    fnc: 'invite'
                },
                {
                    reg: '^#加入游戏$',
                    fnc: 'joinGame'
                },
                {
                    reg: '^#拒绝游戏$',
                    fnc: 'rejectGame'
                },
                {
                    reg: '^#强制结束$',
                    fnc: 'forceEnd'
                },
                {
                    reg: '^#debug日志$',
                    fnc: 'debugLog'
                }
            ]
        });
        this.inviteTimers = {};
    }

    async invite(e) {
        if (e.isGroup) {
            const player1 = e.user_id;
            const player2 = e.at;

            if (!player2) {
                return e.reply('请@你想要邀请的人哦~', false, { at: true });
            } else {
                let brData = yaml.parse(fs.readFileSync(dataPath, 'utf8'));
                
                if (!brData) {
                    brData = { gameInProgress: false, invites: {} };
                }
                    
                if (brData.gameInProgress) {
                    return e.reply('当前已有游戏进行中，无法发起新的邀请哦~', false, { at: true });
                }

                brData.invites[player2] = { invitedBy: player1, timestamp: Date.now() };
                brData.gameInProgress = true;

                fs.writeFileSync(dataPath, yaml.stringify(brData));

                this.inviteTimers[player2] = setTimeout(() => {
                    this.clearInvite(e, player2, player1, true);
                }, 30000);

                return e.reply([segment.at(player2), ' 有人邀请你加入恶魔轮盘赌小游戏哦~\n发送"#加入游戏"加入\n发送"#拒绝游戏"拒绝\n邀请有效时间30秒']);
            }
        }
    }

    async joinGame(e) {
        const player2 = e.user_id;

        let brData = yaml.parse(fs.readFileSync(dataPath, 'utf8'));

        if (brData.invites[player2] && (Date.now() - brData.invites[player2].timestamp <= 30000)) {
            const player1 = brData.invites[player2].invitedBy;

            return e.reply([segment.at(player1),' ', segment.at(player2), ' 游戏要开始了哦~']);
        } else {
            return e.reply('啊嘞？好像没有人邀请你或者已经过期了哦~', false, { at:true });
        }
    }

    async rejectGame(e) {
        const player2 = e.user_id;

        let brData = yaml.parse(fs.readFileSync(dataPath, 'utf8'));

        if (brData.invites[player2] && (Date.now() - brData.invites[player2].timestamp <= 30000)) {
            const player1 = brData.invites[player2].invitedBy;

            await this.clearInvite(e, player2, player1, false);

            return e.reply([segment.at(player2), ' 拒绝了你的邀请~', false, { at:true }]);
        } else {
            return e.reply('啊嘞？好像没有人邀请你或者已经过期了哦~', false, { at:true });
        }
    }

    async forceEnd(e) {
        const player = e.user_id;

        if (!cfg.masterQQ.includes(player)) {
            return e.reply('只有我的主人才能强制结束游戏哦~', false, { at:true });
        }

        let brData = yaml.parse(fs.readFileSync(dataPath, 'utf8'));

        if (brData.gameInProgress) {
            for (const player2 in brData.invites) {
                await this.clearInvite(e, player2, brData.invites[player2].invitedBy, false);
            }
            return e.reply('恶魔轮盘赌已经被我强制结束掉啦~', false, { at:true });
        } else {
            return e.reply('当前没有进行中的恶魔轮盘赌哦~', false, { at:true });
        }
    }

    async debugLog(e) {
        const player = e.user_id;

        if (!cfg.masterQQ.includes(player)) {
            return e.reply('只有我的主人才能查看调试日志哦~', false, { at:true });
        }

        let brData = yaml.parse(fs.readFileSync(dataPath, 'utf8'));
        const dataText = yaml.stringify(brData);

        return e.reply(`当前的游戏数据如下：\n${dataText}`, false, { at:true });
    }

    async clearInvite(e, player2, player1, timeout) {
        let brData = yaml.parse(fs.readFileSync(dataPath, 'utf8'));

        if (brData.invites[player2]) {
            delete brData.invites[player2];
            brData.gameInProgress = false;
            fs.writeFileSync(dataPath, yaml.stringify(brData));

            clearTimeout(this.inviteTimers[player2]);
            delete this.inviteTimers[player2];

            if (timeout) {
                e.reply([segment.at(player1), ' QAQ...对方好像没有理你哦~']);
            }
        }
    }
}
