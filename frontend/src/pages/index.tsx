import styles from './index.less';
import { getData } from '@/pages/api';

const SERVICE_UUID = '9b8fb33d-0988-40ea-b242-2a0f8cfcf6c1';
const CHARACTERISTIC_UUIDS = ['9b8fb33d-0988-40ea-b242-2a0f8cfcf6c2', '9b8fb33d-0988-40ea-b242-2a0f8cfcf6c3'];

// 字符串转为ArrayBuffer对象，参数为字符串
function str2ab(str: string) {
  var buf = new ArrayBuffer(str.length);
  var bufView = new Uint8Array(buf);
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

export default function IndexPage() {
  let data = {
    "currentTime": { "H": 23, "M": 59, "S": 59 },
    "computerStatus": { "cpuUsage": 99, "memUsage": 99 },
    "weatherInfo": { "temp": "50", "SD": "50%" },
    "marketData": "5000.99",
    "genshin": -100,
    "onsData": 0,
    "bilibili": 9999
  }
  let legoDevice = {}
  let isConneted = false;
  const initBluetooth = async () => {
    console.log('trying connect...')
    if (!window.navigator) {
      throw new Error('window.navigator is not accesible. Maybe you\'re running Node.js?');
    }

    if (!window.navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not accesible');
    }
    const device = await window.navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID],
    });

    console.log('connecting.......')
    const server = await device.gatt.connect();
    console.log('connecting..', server)
    const service = await server.getPrimaryService(SERVICE_UUID);
    console.log('connecting...', service)
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUIDS[1]);
    console.log('connecting....', characteristic)
    console.log('connection complate.');
    const sendData = str2ab(JSON.stringify(data));
    await characteristic.writeValueWithoutResponse(sendData);
    console.log('Send Data', sendData)
    legoDevice = characteristic;
    isConneted = true;
  }

  const sendData = (data: any) => {
    if (isConneted) {
      legoDevice.writeValueWithoutResponse(str2ab(JSON.stringify(data)))
    }
  }

  setInterval(async () => {
    data = await getData();
    if (isConneted){
      legoDevice.writeValueWithoutResponse('data');
    }
  }, 5000) // 5000 / 10000

  const refresh = async () => {
    data = await getData();
    console.log(data)
    sendData(data)
  }
  return (
    <div>
      <h1 className={styles.title}><button onClick={() => initBluetooth()}>开始</button> <button onClick={() => refresh()}>手动刷新</button> </h1>
    </div>
  );
}
