const Service = require('egg').Service;

const util = require('util');
const osUtils = require('os-utils');
const http = require("./http")
const genshin = require("./genshin")


class DataService extends Service {
    constructor(ctx) {
        super(ctx);
    }

    // 疫情数据
    async getOnsInfo() {
        const onsData = await http.get('https://view.inews.qq.com/g2/getOnsInfo?name=disease_h5').then(body => {
            const { data } = JSON.parse(body);
            const onsInfo = JSON.parse(data.split('}')[0] + "}}");
            const { localConfirm } = onsInfo.chinaTotal;
            console.log("现有本土确诊", localConfirm);
            return localConfirm;
        });
        return onsData;
    }

    // Bilibili
    async getBiliData() {
        const biliData = http.get('https://api.bilibili.com/x/relation/stat?vmid=242649949').then(body => {
            const UP = JSON.parse(body);
            console.log("UP主粉丝数", UP.data.follower);
            return UP.data.follower;
        });
        return biliData;
    }

    // 原神
    async getGenshinData() {
        const youganyouke = await genshin.getGachaData().then((data) => {
            console.log("Genshin", data);
            return data;
        })
        return youganyouke;
    }

    // 股市/上证指数
    async getMarketData() {
        const marketData = http.get('https://qt.gtimg.cn/q=sh000001').then(body => {
            const sh000001 = body.split('~');
            console.log("上证指数", sh000001[3]);
            return  sh000001[3];
        });
        return marketData;
    }

    // 天气
    async getWeatherData() {
        const weatherInfo = await http.get('http://www.weather.com.cn/data/sk/101120101.html').then(body => {
            const { weatherinfo } = JSON.parse(body);
            console.log(weatherinfo);
            return weatherinfo;
        });
        const { temp, SD } = weatherInfo;
        return { temp, SD };
    }

    // 系统时间
    getCurrentTime() {
        const current = new Date();
        const currentTime = { current, H: current.getHours(), M: current.getMinutes(), S: current.getSeconds() }
        console.log(currentTime);
        return currentTime;
    }

    // CPU、内存占用
    async getComputerStatus() {
        const getCpuUsage = util.promisify(osUtils.cpuUsage);
        const cpuUsage = await getCpuUsage().then(v => {
            return Math.round(100 * v)
        }).catch(err => {
            return Math.round(100 * err)

        });
        const memUsage = Math.round(100 * (osUtils.totalmem() - osUtils.freemem()) / osUtils.totalmem());
        console.log('CPU Usage (%): ', cpuUsage);
        console.log("内存使用率", memUsage);
        return { cpuUsage, memUsage };
    }

    async getData() {
        return {
            currentTime: this.getCurrentTime(),
            computerStatus: await this.getComputerStatus(),
            weatherInfo: await this.getWeatherData(),
            marketData: await this.getMarketData(),
            genshin: await this.getGenshinData(),
            onsData: await this.getOnsInfo(),
            bilibili: await this.getBiliData(),
        };
    }

}

module.exports = DataService;