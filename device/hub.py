import bluetooth
import json
from mindstorms import Motor, DistanceSensor
from mindstorms.control import Timer
from time import sleep_ms
from hub import button, port, display, Image
from micropython import const

# 【自定义】初始化器件端口
ones_motor = port.B.motor
tens_motor = port.D.motor
hundreds_motor = port.A.motor
thousands_motor = port.C.motor
Motors = [Motor('A'), Motor('B'), Motor('C'), Motor('D')]
distance = DistanceSensor('F')

# 【自定义，微调】校准值
ones_initial = 960# 数越小越靠下
tens_initial = -940# 绝对值越小越靠下
hundreds_initial = 950# 数越小越靠下
thousands_initial = -960# 绝对值越小越靠下

# 【自定义】校准观察时间
CALIBRATE_TIME_MS = 10000

# 【无需蓝牙】秒表玩法(优先级1)
is_stopwatch_mode = False

# 【无需蓝牙】伪时钟玩法，需手动自定义开始时间(优先级2)
is_localclock_mode = False
localclock_init_time = 1138# 11点38分

# 【无需蓝牙】允许伪数据(优先级3)
allow_mock = True

# 预留（数字切换的）运转时间。取决于电机速度和数字更新频率
MOVING_TIME_MS = 200

_IRQ_CENTRAL_CONNECT = 1
_IRQ_CENTRAL_DISCONNECT = 2

if 'FLAG_INDICATE' in dir(bluetooth):
    # We're on MINDSTORMS Robot Inventor
    # New version of bluetooth
    _IRQ_GATTS_WRITE = 3
else:
    # We're probably on SPIKE Prime
    _IRQ_GATTS_WRITE = 1 << 2

_FLAG_READ = const(0x0002)
_FLAG_WRITE_NO_RESPONSE = const(0x0004)
_FLAG_WRITE = const(0x0008)
_FLAG_NOTIFY = const(0x0010)
_UART_UUID = bluetooth.UUID("9b8fb33d-0988-40ea-b242-2a0f8cfcf6c1")
_UART_TX = (
    bluetooth.UUID("9b8fb33d-0988-40ea-b242-2a0f8cfcf6c2"),
    _FLAG_READ | _FLAG_NOTIFY,
)
_UART_RX = (
    bluetooth.UUID("9b8fb33d-0988-40ea-b242-2a0f8cfcf6c3"),
    _FLAG_WRITE | _FLAG_WRITE_NO_RESPONSE,
)
_UART_SERVICE = (
    _UART_UUID,
    (_UART_TX, _UART_RX),
)

# 基于平均最短路径的转动方式的数字顺号
digits_position = [0, 3, 7, 11, 1, 6, 8, 2, 9, 10]


def set_digit_one(digit):
    ones_motor.run_to_position(
        digits_position[digit] * 72 + ones_initial)


def set_digit_ten(digit):
    tens_motor.run_to_position(
        digits_position[digit] * -72 + tens_initial)


def set_digit_hundreds(digit):
    hundreds_motor.run_to_position(
        digits_position[digit] * 72 + hundreds_initial)


def set_digit_thousands(digit):
    thousands_motor.run_to_position(
        digits_position[digit] * -72 + thousands_initial)


def motors_return_to_zero():
    # 电机转回0点
    ones_motor.run_to_position(0)
    tens_motor.run_to_position(0)
    hundreds_motor.run_to_position(0)
    thousands_motor.run_to_position(0)
    sleep_ms(3000)


def reset_motors():
    # 电机重置 位置回正并重设位置0点
    Motors[0].run_to_position(0)
    Motors[1].run_to_position(0)
    Motors[2].run_to_position(0)
    Motors[3].run_to_position(0)
    print('---check motors---')
    print('-Before-')
    speed, relative_degrees, absolute_degrees, pwm = ones_motor.get()
    print('ones_motor position', relative_degrees, absolute_degrees)
    speed, relative_degrees, absolute_degrees, pwm = tens_motor.get()
    print('tens_motor position', relative_degrees, absolute_degrees)
    speed, relative_degrees, absolute_degrees, pwm = hundreds_motor.get()
    print('hundreds_motor position', relative_degrees, absolute_degrees)
    speed, relative_degrees, absolute_degrees, pwm = thousands_motor.get()
    print('thousands_motor position', relative_degrees, absolute_degrees)
    ones_motor.preset(0)
    tens_motor.preset(0)
    hundreds_motor.preset(0)
    thousands_motor.preset(0)
    print('-After-')
    speed, relative_degrees, absolute_degrees_0, pwm = ones_motor.get()
    print('ones_motor position', relative_degrees, absolute_degrees_0)
    speed, relative_degrees, absolute_degrees_00, pwm = tens_motor.get()
    print('tens_motor position', relative_degrees, absolute_degrees_00)
    speed, relative_degrees, absolute_degrees_000, pwm = hundreds_motor.get()
    print('hundreds_motor position', relative_degrees, absolute_degrees_000)
    speed, relative_degrees, absolute_degrees_0000, pwm = thousands_motor.get()
    print('thousands_motor position', relative_degrees, absolute_degrees_0000)
    ones_motor.preset(absolute_degrees_0)
    tens_motor.preset(absolute_degrees_00)
    hundreds_motor.preset(absolute_degrees_000)
    thousands_motor.preset(absolute_degrees_0000)


def init_digital_motors():
    # 设备初始化，并进入校准观察（持续时间CALIBRATE_TIME_MS）
    reset_motors()
    sleep_ms(3000)
    set_digit_one(0)
    set_digit_ten(0)
    set_digit_hundreds(0)
    set_digit_thousands(0)
    sleep_ms(CALIBRATE_TIME_MS)


def set_digit(num):
    one = num % 10# 个位
    ten = num//10 % 10# 十位
    hundred = num//100 % 10# 百位
    thousand = num//1000 % 10# 千位
    print(thousand, hundred, ten, one)
    set_digit_one(one)
    set_digit_ten(ten)
    set_digit_hundreds(hundred)
    set_digit_thousands(thousand)
    sleep_ms(MOVING_TIME_MS)


class DigitalDisplay():
    class Mode():
        CLOCK = 1
        COMPUTER_STATUS = 2
        WEATHER = 3
        MARKET = 4
        GENSHIN = 5
        ONS = 6
        BILIBILI = 7

    def __init__(self):
        # 建立蓝牙连接
        self.is_bluetooth_connected = False
        self.mode = 0
        self.digit = 0
        self.changed = False
        self.timer = Timer()
        # 初始化数据。假数据，蓝牙未连接时按此显示
        self.remote_data = {
            "currentTime": {"current": "2022-05-12T02:56:09.885Z", "H": 10, "M": 56, "S": 9},
            "computerStatus": {"cpuUsage": 75, "memUsage": 70},
            "weatherInfo": {"temp": "25", "SD": "48%"},
            "marketData": "3049.71",
            "genshin": 75,
            "onsData": 7058,
            "bilibili": 6409
        }

    def prepare_connect(self):
        self._ble = bluetooth.BLE()
        self._ble.active(True)
        self._ble.irq(self._irq)
        ((self._handle_tx, self._handle_rx),
        ) = self._ble.gatts_register_services((_UART_SERVICE,))
        self._ble.gatts_set_buffer(self._handle_rx, 256)
        self._advertise()

    def disconnect(self):
        try:
            if not self._conn_handle:
                return
        except AttributeError:
            return
        self._ble.gap_disconnect(self._conn_handle)
        sleep_ms(500)

    def is_connected(self):
        return self.is_bluetooth_connected

    def _irq(self, event, data):
        if event == _IRQ_CENTRAL_CONNECT:
            conn_handle, _, _ = data
            print("New connection", conn_handle, data)
            self._conn_handle = conn_handle
            self.is_bluetooth_connected = True
            self.mode = DigitalDisplay.Mode.CLOCK

        elif event == _IRQ_CENTRAL_DISCONNECT:
            conn_handle, _, _ = data
            print("Disconnected", conn_handle, data)
            self._conn_handle = None
            self.is_bluetooth_connected = False
            self._advertise()
        elif event == _IRQ_GATTS_WRITE:
            conn_handle, value_handle = data
            value = self._ble.gatts_read(value_handle)
            if value_handle == self._handle_rx:
                self.on_write(value)

    def _advertise(self, interval_us=100000):
        print("Starting bluetooth advertising")
        self._ble.gap_advertise(interval_us)

    def on_write(self, data):
        print('on recive', self.timer.now(), data)
        self.remote_data = json.loads(data)
        self._update_digit()

    def get_digit(self):
        return self.digit

    def was_changed(self):
        if self.changed:
            self.changed = False
            return True
        return False

    def set_mode(self, mode):
        if self.mode == mode:
            return
        self.mode = mode
        self._update_digit()

    def _update_digit(self):
        info_digit = self._get_info()
        if self.digit != info_digit:
            self.changed = True
            self.digit = info_digit

    def _get_info(self):
        if self.mode == DigitalDisplay.Mode.CLOCK:
            current_time = self.remote_data['currentTime']
            return current_time['H']*100 + current_time['M']
        elif self.mode == DigitalDisplay.Mode.COMPUTER_STATUS:
            computerStatus = self.remote_data['computerStatus']
            cpu = computerStatus['cpuUsage']
            mem = computerStatus['memUsage']
            if cpu == 100:
                cpu = 99
            if mem == 100:
                mem = 99
            return mem * 100 + cpu
        elif self.mode == DigitalDisplay.Mode.WEATHER:
            weatherInfo = self.remote_data['weatherInfo']
            temp = int(weatherInfo['temp'])
            sd = int(weatherInfo['SD']. replace('%', ''))
            return sd * 100 + temp
        elif self.mode == DigitalDisplay.Mode.MARKET:
            marketData = self.remote_data['marketData']
            return int(float(marketData))
        elif self.mode == DigitalDisplay.Mode.GENSHIN:
            genshin = self.remote_data['genshin']
            if genshin == -1:
                return 2367
            return (90 - genshin) * 100 + genshin
        elif self.mode == DigitalDisplay.Mode.ONS:
            return self.remote_data['onsData']
        elif self.mode == DigitalDisplay.Mode.BILIBILI:
            return self.remote_data['bilibili']
        else:
            return 9527


# 废弃
MODE_COLOR_DICT = {
    'red': DigitalDisplay.Mode.CLOCK,
    'green': DigitalDisplay.Mode.COMPUTER_STATUS,
    'yellow': DigitalDisplay.Mode.WEATHER,
    'blue': DigitalDisplay.Mode.MARKET,
    'white': DigitalDisplay.Mode.GENSHIN,
    'orange': DigitalDisplay.Mode.ONS,
    'purple': DigitalDisplay.Mode.BILIBILI,
}

MODE_LIST = [
    DigitalDisplay.Mode.CLOCK,
    DigitalDisplay.Mode.COMPUTER_STATUS,
    DigitalDisplay.Mode.WEATHER,
    DigitalDisplay.Mode.MARKET,
    DigitalDisplay.Mode.GENSHIN,
    DigitalDisplay.Mode.ONS,
    DigitalDisplay.Mode.BILIBILI,
]

sensor_data = 0
mode_index = 0
mode_current = DigitalDisplay.Mode.CLOCK


def check_mode():
    global sensor_data
    global mode_current
    global mode_index
    # current_distance = distance.get_distance_cm(True) # 可以
    # current_distance = distance.get_distance_cm() # 可以
    # current_distance = distance.get_distance_percentage() # 精度差劲
    current_distance = distance.get_distance_percentage(True)# 还行
    # print('Distance:', current_distance)

    if current_distance == None or current_distance > 40:
        # 未放置卡片
        return mode_current

    if current_distance == sensor_data:
        # 稳定态
        return mode_current
    else:
        # 10次检测一样，说明新状态稳定了
        for i in range(10):
            sleep_ms(100)
            if current_distance != distance.get_distance_percentage(True):
                return mode_current

    sensor_data = current_distance
    print('sensor_data:', sensor_data)

    if sensor_data > 30:# 6
        mode_current = DigitalDisplay.Mode.ONS
    elif sensor_data > 25 and sensor_data <= 30:# 5
        mode_current = DigitalDisplay.Mode.GENSHIN
    elif sensor_data > 20 and sensor_data <= 25:# 4
        mode_current = DigitalDisplay.Mode.MARKET
    elif sensor_data > 16 and sensor_data <= 20:# 3
        mode_current = DigitalDisplay.Mode.WEATHER
    elif sensor_data > 12 and sensor_data <= 16:# 2
        mode_current = DigitalDisplay.Mode.COMPUTER_STATUS
    elif sensor_data > 10 and sensor_data <= 12:# 1
        mode_current = DigitalDisplay.Mode.CLOCK
    else:# 异常
        mode_current = DigitalDisplay.Mode.CLOCK

    mode_index = MODE_LIST.index(mode_current)

    return mode_current


def next_mode():
    global mode_index
    global mode_current
    mode_index += 1
    if mode_index == len(MODE_LIST):
        mode_index = 0
    mode = MODE_LIST[mode_index]
    mode_current = mode
    print('Next mode:', mode)
    return mode


display_mode = DigitalDisplay.Mode.CLOCK


def set_display(mode):
    global display_mode
    if mode == display_mode:
        return
    display_mode = mode
    if mode == DigitalDisplay.Mode.CLOCK:
        _images = [
            Image('00009:00030:00000:00000:00000'),
            # Image('00000:00009:00000:00000:00000'),
            Image('00000:00000:00039:00000:00000'),
            # Image('00000:00000:00000:00009:00000'),
            Image('00000:00000:00000:00030:00009'),
            # Image('00000:00000:00000:00000:00090'),
            Image('00000:00000:00000:00300:00900'),
            # Image('00000:00000:00000:00000:09000'),
            Image('00000:00000:00000:03000:90000'),
            # Image('00000:00000:00000:90000:00000'),
            Image('00000:00000:93000:00000:00000'),
            # Image('00000:90000:00000:00000:00000'),
            Image('90000:03000:00000:00000:00000'),
            # Image('09000:00000:00000:00000:00000'),
            Image('00900:00300:00000:00000:00000'),
            # Image('00090:00000:00000:00000:00000'),
        ]
        _center_img = Image("00000:05550:05850:05550:00000")
        CLOCK_ANIMATION = [img + _center_img for img in _images]
        display.show(CLOCK_ANIMATION, delay=1000, wait=False, loop=True)
    elif mode == DigitalDisplay.Mode.COMPUTER_STATUS:
        display.show(Image('99999:90009:99999:00900:09990'))
    elif mode == DigitalDisplay.Mode.WEATHER:
        _center_img = Image("00990:09999:99999:00000:00000")
        _images = [
            Image('00000:00000:00000:90009:00900'),
            Image('00000:00000:00000:00900:90009')
        ]
        _ANIMATION = [img + _center_img for img in _images]
        display.show(_ANIMATION, delay=500, wait=False, loop=True)
    elif mode == DigitalDisplay.Mode.MARKET:
        _images = [
            Image('00000:00000:00000:00000:90000'),
            Image('00000:00000:00000:09000:99000'),
            Image('00000:00000:00900:09900:99900'),
            Image('00000:00090:00990:09990:99990'),
            Image('00009:00099:00999:09999:99999'),
            Image('00009:00099:00999:09999:99999'),
            Image('00009:00099:00999:09999:99999')
        ]
        display.show(_images, delay=300, wait=False, loop=True)
    elif mode == DigitalDisplay.Mode.GENSHIN:
        _images = [
            Image('00900:07970:99999:07970:00900'),
            Image('00900:07970:99999:07970:00900'),
            Image('00900:07970:99999:07970:00900'),
            Image('00900:05950:99999:05950:00900'),
            Image('00900:06960:99999:06960:00900')
        ]
        display.show(_images, delay=200, wait=False, loop=True)
    elif mode == DigitalDisplay.Mode.ONS:
        display.show(Image('09090:99999:99999:09990:00900'))
    elif mode == DigitalDisplay.Mode.BILIBILI:
        _images = [
            Image('00900:90998:99999:99999:90998'),
            Image('59995:50905:99999:90909:55955')
        ]
        display.show(_images, delay=5000, wait=False, loop=True)
    else:
        display.show(Image('99999:90009:90909:90009:99999'))


try:
    timer = Timer()
    # 初始化校准
    init_digital_motors()

    # set_digit(1024)
    # sleep_ms(3000)

    digitalDisplay = DigitalDisplay()
    digitalDisplay.prepare_connect()

    while True:
        sleep_ms(50)
        # 按下中间按钮，退出程序
        if button.center.is_pressed():
            break
        # 左按钮
        if button.left.was_pressed():
            motors_return_to_zero()
            is_localclock_mode = False
            is_stopwatch_mode = False
            continue
        # 秒表模式
        if is_stopwatch_mode:
            set_digit(timer.now())
            set_display(DigitalDisplay.Mode.CLOCK)
            continue
        # 伪时钟模式
        if is_localclock_mode:
            set_digit(timer.now()//60 + localclock_init_time)
            set_display(DigitalDisplay.Mode.CLOCK)
            continue
        # 模式按钮检测输入
        mode = check_mode()
        # mode = mode_current
        # 右按钮
        if button.right.was_pressed():
            mode = next_mode()
        if mode:
            digitalDisplay.set_mode(mode)
            set_display(mode)
        # 蓝牙连接模式
        if not digitalDisplay.is_connected() and not allow_mock:
            continue
        if digitalDisplay.was_changed():
            set_digit(digitalDisplay.get_digit())

except Exception as e:
    print('Got Exception :::', e)

# 断开蓝牙
digitalDisplay.disconnect()
del(digitalDisplay)
motors_return_to_zero()

# 抛异常以强制结束程序
raise SystemExit
