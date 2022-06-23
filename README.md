## 拼搭图纸和源码全部开源
- 图纸在./device/drawing/下，文件格式.io，用Studio 2.0打开。
- 乐高代码在./device/下
- 前端代码在./frontend/下
- 其他为PC端代码

# PC_lego_digital_display_server
- `npm run dev`启动PC服务端
- `./device/hub.py`为乐高代码，在 LEGO MINDSTORMS APP中新建python项目并全部复制粘贴进去后执行。
-  `./device/数显-电机归零器.lms`可帮助调节和重置电机归位
- 如需更新前端代码，可以进入`./frontend/`写代码并调试后，执行`npm run build`进行发布（到`app/controller/public`静态资源目录）
- 更多功能请参考原视频

### 使用姿势
- 按照图纸完成搭建
- 将拼搭好的“乐高显示终端初始化”， 初始化要求电机归位时字框内出现数字0（无需严格对齐）
- 可以手动扭动电机归位，或者使用`./device/数显-电机归零器.lms`
- 乐高HUB程序启动后，按需调整`./device/hub.py`的参数，详见`./device/README.md`
- 启动PC服务端，在chrome中访问前端，并手动建立蓝牙连接
- 端口7001，前端单独启动时，端口8000
- 如需使用原神功能，需要进入游戏一次，并看一下自己的历史抽卡界面（官方TOKEN有效期时间挺长的，目测几个小时应该没问题）
- HUB右按钮也能完成功能切换

### 本来一个Nodejs或者Python的常驻服务就可以搞定的问题，本应用不了几行代码，但我为啥最后却搞成了用上了UMI、EGG这样的前后端框架？

没办法，只因为Chrome的WebBluetooth太香了！

首先，Node和Python在Windows上调用蓝牙实在太费劲了。（所以我要是有个Linux，这个事就简单了，然而并没有）

然后，使用纯前端模式，JS运行在浏览器中，再进行独立的HTTP请求（天气、股市、原神、B站数据等等）以及获取任何电脑内部信息（如内存CPU等等），就非常的不伦不类。

于是就想到了前后端分离模式，蓝牙连接和获取信息各司其职。

这个“前端”虽然运行在浏览器上，但目的却是调用Chrome的WebBluetooth连接乐高Hub。而这个“后端”的意义就是灵活地为“前端”提供各种数据。

那为什么不用EGG+REACT+SSR这种前后端整合框架？用一套代码不就完事了？这是因为这并不能减少开发工作量，而且集成度越高越容易出问题。不如分别用UMI和EGG这样成熟的框架单独做前后端，开发时独立，发布时可以整合到一起。

虽然看上去是用了框架，不吹，都赶上中小型的企业级应用的架构了，但是得益于框架的集成度和成熟度，开发起来其实反倒是高效的。

万万没想到的是，这样还能带来额外的好处：

- 可以常驻运行。因为这个框架天然就支持常规WEB程序的各种特性，所以如果有个服务器，可以非常方便地直接扔到服务器上，7x24小时运行。使用时，只需在本地打开浏览器即可。
- 可以有界面了。在Chrome端可以利用React什么的做个界面出来，当然这次是没做啦。蓝牙连接部分也是用的Chrome的原生界面。并且可以利用Chrome强大的F12调试功能。

当然了，也有局限：

- 有点太重了。
- 如果是纯前端实现，我可以找免费的静态资源托管服务，直接扔上去。但是用纯前端实现这个功能就又要搞跨域，又要突破浏览器的权限。。。反正问题一堆，还是算了。

### 说来说去啰嗦了一堆，就是为了说本项目基于Egg。前端已经编译整合成静态资源，可以直接用。前端源码请移步`./frontend/`


## QuickStart

<!-- add docs here for user -->

see [egg docs][egg] for more detail.

### Development

```bash
$ npm i
$ npm run dev
$ open http://localhost:7001/
```

### Deploy

```bash
$ npm start
$ npm stop
```

### npm scripts

- Use `npm run lint` to check code style.
- Use `npm test` to run unit test.
- Use `npm run autod` to auto detect dependencies upgrade, see [autod](https://www.npmjs.com/package/autod) for more detail.


[egg]: https://eggjs.org