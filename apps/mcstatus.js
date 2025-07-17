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
          reg: '^#服务器状态(.*)$',
          fnc: 'mcstatus'
        }
      ]
    });
  }

  async mcstatus(e) {
  const input = e.msg.match(/^#服务器状态\s*(.*)$/)?.[1].trim();
    if (!input) return e.reply('请提供服务器地址，例如：#服务器状态 mc.hypixel.net');

    const [host, port] = input.includes(':') ? input.split(':') : [input, '25565'];

    let ping_cn = null;
    try {
        const url = `http://106.14.14.210:52001/?url=${encodeURIComponent(host + ':' + port)}`;
        const res = await fetch(url, { timeout: 5000 });
        if (res.ok) {
        const data = await res.json();
        ping_cn = data.latency_ms;
        }
    } catch (err) {
    console.error('error:', err);
    }

  try {
    const result = await status(host, parseInt(port), { timeout: 5000, enableSRV: true });

    const data = {
      favicon: result.favicon,
      address: `${host}:${port}`,
      version: result.version.name,
      players: `${result.players.online} / ${result.players.max}`,
      motd: result.motd.html,
      protocol: result.version.protocol,
      ping_us: result.roundTripLatency !== null ? result.roundTripLatency : 'N/A',
      ping_cn: ping_cn !== null ? ping_cn : 'N/A',
    };

    console.log(data);

    const base64 = await puppeteer.screenshot('xunmiao-plugin', {
      saveId: 'mcstatus',
      imgType: 'png',
      tplFile: `${_path}/plugins/xunmiao-plugin/res/mcstatus/mcstatus.html`,
      pluginResources: `${_path}/plugins/xunmiao-plugin/res/mcstatus/mcstatus.css`,
      data
    });

    return e.reply(base64);
  } catch (err) {
    console.error('获取服务器状态时出错:', err);
    return e.reply('无法获取服务器状态，请确认地址是否正确或服务器是否在线。');
  }
}
}