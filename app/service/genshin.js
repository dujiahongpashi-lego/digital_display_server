/**
 * 从PC版本机原神游戏运行日志里获取历史记录查询链接（主要是为了拿TOKEN）（感谢项目赐予灵感：https://github.com/sunfkny/genshin-gacha-export）
 * GET到数据后，计算上距离上次出金又过了多少发了
 */
const genshinLogFile = 'C:/Users/sduwo/AppData/LocalLow/miHoYo/原神/output_log.txt'
const CHANGZHU_GACHA = 200 // 常驻祈愿
const CHAR_UP_GACHA = 301 // 角色活动(UP)祈愿

function sleepPromise(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const toApi = (url) => {
    spliturl = url.split("?")
    return "https://hk4e-api.mihoyo.com/event/gacha_info/api/getGachaLog" + "?" + spliturl[1] + "&size=20&gacha_type=" + CHAR_UP_GACHA
}

const getUrl = () => {
    const fs = require('fs');
    try {
        const data = fs.readFileSync(genshinLogFile, 'UTF-8');
        const lines = data.split(/\r?\n/);
        const line = lines.find((l) => l.startsWith("OnGetWebViewPageFinish:") && l.endsWith("#/log"))
        const url = line.replace("OnGetWebViewPageFinish:", "").replace("#/log", "")
        const apiUrl = toApi(url)
        return apiUrl
    } catch (err) {
        console.error(err);
    }
}

const http = require("./http")
const badLuckTimes = async (baseUrl) => {
    let counter = 0;
    let endId = 0;
    for (let i = 1; i <= 5; i++) {
        const url = baseUrl + '&page=' + i + "&end_id=" + endId
        res = await http.get(baseUrl + '&page=' + i + "&end_id=" + endId)
        console.log('Genshin Data ', url)
        console.log(res)
        const gachaData =  JSON.parse(res).data
        if (gachaData == null || gachaData == undefined || gachaData == 'null'){
            return -1;
        }
        gachaList = gachaData.list
        const fiveStar = gachaList.find(item => {
            counter++
            return item.rank_type == 5
        })
        if (fiveStar) {
            counter--
            break;
        }
        endId = gachaList[gachaList.length - 1].id
        await sleepPromise(500)
    }
    return counter
}
async function getGachaData() {
    const url = getUrl()
    return await badLuckTimes(url)
}

module.exports = { getGachaData }