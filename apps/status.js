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
        let BotQQ = e.bot_id;
        let BotName = e.bot_name;

        return e.reply('当前登录',BotQQ,'\n','账号名称',BotName,false,{at: true})
    }
}