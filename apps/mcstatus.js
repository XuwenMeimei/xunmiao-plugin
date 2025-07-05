import plugin from '../../../lib/plugins/plugin.js';
import puppeteer from '../../../lib/puppeteer/puppeteer.js';
import { status } from 'minecraft-server-util';

const _path = process.cwd().replace(/\\/g, "/");

export class mcstatus extends plugin {
  constructor() {
    super({
      name: '寻喵MC',
      dsc: '查询Minecraft服务器状态',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#MC状态(.*)$',
          fnc: 'mcstatus'
        }
      ]
    });
  }

  async mcstatus(e) {
    const input = e.msg.match(/^#MC状态\s*(.*)$/)?.[1].trim();
    if (!input) return e.reply('请提供服务器地址，例如：#MC状态 mc.hypixel.net');

    const [host, port] = input.includes(':') ? input.split(':') : [input, 25565];

    try {
      const result = await status(host, parseInt(port), { timeout: 5000, enableSRV: true });

      const data = {
        address: `${host}:${port}`,
        version: result.version.name,
        players: `${result.players.online} / ${result.players.max}`,
        motd: result.motd.clean,
        ping: result.roundTripLatency
      };

      const base64 = await puppeteer.screenshot('xunmiao-plugin', {
        saveId: 'mcstatus',
        imgType: 'png',
        tplFile: `${_path}/res/mcstatus/mcstatus.html`,
        pluginResources: `${_path}/res/mcstatus/mcstatus.css`,
        data
      });

      return e.reply(base64);
    } catch (err) {
      return e.reply('无法获取服务器状态，请确认地址是否正确或服务器是否在线。');
    }
  }
}
