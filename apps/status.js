import plugin from '../../../lib/plugins/plugin.js'

export class status extends plugin {
    constructor() {
        super({
            name: '寻喵状态',
            dsc: '寻喵状态查询',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#寻喵状态',
                    fnc: 'nekostatus'
                }
            ]
        })
    }

    async nekostatus(e) {
        let BotQQ = req.sid || 获取失败;
        let BotInfo = BotQQ.getInfo();
        let BotName = BotInfo.nickname || 获取失败;

        if (e.isGroup) {
            return e.reply([segment.at[e.user_id], '\n',
            '寻喵ID: ', BotQQ, '\n',
            '寻喵名称: ', BotName
            ])
        }
        return e.reply([
            '寻喵ID: ', BotQQ, '\n',
            '寻喵名称: ', BotName
        ])
    }
}