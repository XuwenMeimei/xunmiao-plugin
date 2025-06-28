import fs from 'fs';
import yaml from 'yaml';

const _path = process.cwd().replace(/\\/g, "/");
const dataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;

// 获取并初始化用户数据
export function getUserData(userId) {
  let userData = {};
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, yaml.stringify({}));
  }
  const fileContent = fs.readFileSync(dataPath, 'utf8');
  userData = yaml.parse(fileContent) || {};

  if (!userData[userId]) {
    userData[userId] = {
      coins: 0,
      favorability: 0,
      bank: 0,
      totalSignCount: 0,
      continueSignCount: 0
    };
  }
  if (typeof userData[userId].coins === 'undefined' || isNaN(userData[userId].coins)) userData[userId].coins = 0;
  if (typeof userData[userId].favorability === 'undefined' || isNaN(userData[userId].favorability)) userData[userId].favorability = 0;
  if (typeof userData[userId].bank === 'undefined' || isNaN(userData[userId].bank)) userData[userId].bank = 0;
  if (typeof userData[userId].totalSignCount === 'undefined' || isNaN(userData[userId].totalSignCount)) userData[userId].totalSignCount = 0;
  if (typeof userData[userId].continueSignCount === 'undefined' || isNaN(userData[userId].continueSignCount)) userData[userId].continueSignCount = 0;

  return userData;
}

// 只写入当前用户和 dailySignOrder
export function saveUserData(userData, userId) {
  let fileUserData = {};
  if (fs.existsSync(dataPath)) {
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    fileUserData = yaml.parse(fileContent) || {};
  }
  fileUserData[userId] = userData[userId];
  if (userData.dailySignOrder) fileUserData.dailySignOrder = userData.dailySignOrder;
  fs.writeFileSync(dataPath, yaml.stringify(fileUserData));
}

// 获取数据文件路径（如有需要）
export function getDataPath() {
  return dataPath;
}