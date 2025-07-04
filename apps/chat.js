export class duel extends plugin {
  constructor() {
    super({
      name: '寻喵聊天',
      dsc: '寻喵聊天功能',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '[\s\S]*',
          fnc: 'chat'
        }
      ]
    })
  }

    async chat(e) {
    const msg = e.msg;
        console.log(msg);
    }
}