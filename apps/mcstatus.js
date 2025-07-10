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

    function motdJsonToHtml(motdRaw) {
      if (!motdRaw || !Array.isArray(motdRaw)) return '';
      return motdRaw.map(part => {
        let color = part.color || 'white';
        return `<span style="color:${color}">${part.text || ''}</span>`;
      }).join('');
    }

    const motdHtml = motdJsonToHtml(result.motd.raw);
    const faviconBase64 = result.favicon || null;

    const data = {
      address: `${host}:${port}`,
      version: result.version.name,
      players: `${result.players.online} / ${result.players.max}`,
      motdHtml,
      motd: result.motd.clean,
      ping_us: result.roundTripLatency,
      ping_cn: ping_cn !== null ? ping_cn : 'N/A',
      faviconBase64
    };

    const base64 = await puppeteer.screenshot('xunmiao-plugin', {
      saveId: 'mcstatus',
      imgType: 'png',
      tplFile: `${_path}/plugins/xunmiao-plugin/res/mcstatus/mcstatus.html`,
      pluginResources: `${_path}/plugins/xunmiao-plugin/res/mcstatus/mcstatus.css`,
      data
    });

    return e.reply(base64);
  } catch (err) {
  console.error('status() 错误：', err);
  return e.reply('无法获取服务器状态，请确认地址是否正确或服务器是否在线。');
  }
}
}