import plugin from '../../../lib/plugins/plugin.js';
import puppeteer from '../../../lib/puppeteer/puppeteer.js';
import { status } from 'minecraft-server-util';
import { execFile } from 'child_process';
import util from 'util';

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
    // const result = await status(host, parseInt(port), { timeout: 5000, enableSRV: true });
    // 用python获取motd
    const motdJson = await getMotdJson(host, port);
    let motd = '未知';
    if (motdJson) motd = motdJsonToHtml(motdJson);

    // 其他信息还是用js库
    const result = await status(host, parseInt(port), { timeout: 5000, enableSRV: true });

    const data = {
      favicon: result.favicon,
      address: `${host}:${port}`,
      version: result.version.name,
      players: `${result.players.online} / ${result.players.max}`,
      motd: motd,
      protocol: result.version.protocol,
      ping_us: result.roundTripLatency !== null ? result.roundTripLatency : 'N/A',
      ping_cn: ping_cn !== null ? ping_cn : 'N/A',
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
    console.error('获取服务器状态时出错:', err);
    return e.reply('无法获取服务器状态，请确认地址是否正确或服务器是否在线。');
  }
}
}

// Minecraft颜色代码映射
const mcColorMap = {
  '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
  '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
  '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
  'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF',
  'l': 'font-weight: bold;', 'm': 'text-decoration: line-through;',
  'n': 'text-decoration: underline;', 'o': 'font-style: italic;', 'r': 'reset'
};

// 解析motd为带颜色的HTML
function parseMotdToHtml(motd) {
  let html = '';
  let i = 0;
  let color = '#FFFFFF';
  let extraStyle = '';
  let openTags = [];

  while (i < motd.length) {
    if (motd[i] === '§') {
      // 检查是否为渐变色（§x§R§R§G§G§B§B）
      if (motd[i + 1] === 'x' && i + 13 <= motd.length) {
        let hex = '#' + motd[i + 3] + motd[i + 5] + motd[i + 7] + motd[i + 9] + motd[i + 11] + motd[i + 13];
        color = hex;
        i += 14;
        html += `<span style="color: ${color};${extraStyle}">`;
        openTags.push('</span>');
        continue;
      }
      let code = motd[i + 1]?.toLowerCase();
      if (mcColorMap[code]) {
        if (code === 'r') {
          // 重置
          while (openTags.length) html += openTags.pop();
          color = '#FFFFFF';
          extraStyle = '';
        } else if (['l', 'm', 'n', 'o'].includes(code)) {
          extraStyle += mcColorMap[code];
          html += `<span style="${extraStyle}">`;
          openTags.push('</span>');
        } else {
          // 普通颜色
          color = mcColorMap[code];
          html += `<span style="color: ${color};${extraStyle}">`;
          openTags.push('</span>');
        }
      }
      // 无论是否识别，遇到§都跳过2位，防止原样输出
      i += 2;
      continue;
    }
    // 转义HTML
    if (motd[i] === '<') html += '&lt;';
    else if (motd[i] === '>') html += '&gt;';
    else if (motd[i] === '\n') html += '<br>';
    else html += motd[i];
    i++;
  }
  // 关闭所有未闭合标签
  while (openTags.length) html += openTags.pop();
  return html;
}

// 获取motd JSON（通过python脚本）
async function getMotdJson(host, port) {
  const execFilePromise = util.promisify(execFile);
  try {
    const { stdout } = await execFilePromise('python3', [
      `${_path}/plugins/xunmiao-plugin/apps/motd_json.py`, host, port
    ]);
    return JSON.parse(stdout);
  } catch (err) {
    console.error('motd获取失败:', err);
    return null;
  }
}

// 递归解析motd JSON为HTML（支持渐变色）
function motdJsonToHtml(motdObj) {
  if (typeof motdObj === 'string') return motdObj;
  let html = '';
  let style = '';
  if (motdObj.color) {
    // 处理标准颜色和16进制
    if (motdObj.color.startsWith('#')) style += `color:${motdObj.color};`;
    else if (mcColorMap[motdObj.color]) style += `color:${mcColorMap[motdObj.color]};`;
  }
  if (motdObj.bold) style += 'font-weight:bold;';
  if (motdObj.italic) style += 'font-style:italic;';
  if (motdObj.underlined) style += 'text-decoration:underline;';
  if (motdObj.strikethrough) style += 'text-decoration:line-through;';
  if (motdObj.obfuscated) style += 'filter: blur(2px);';
  if (motdObj.text) html += `<span style="${style}">${motdObj.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
  if (motdObj.extra) html += motdObj.extra.map(motdJsonToHtml).join('');
  return html;
}