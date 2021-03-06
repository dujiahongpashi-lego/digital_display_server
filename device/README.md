# HUB乐高主控代码说明

`./device/hub.py`为乐高代码，在 LEGO MINDSTORMS APP中新建python项目并全部复制粘贴进去后执行。
`./device/数显-电机归零器.lms`可帮助调节和重置电机归位

拼搭要点：
- 所有电机回到初始位
- 电机在初始位时，尽可能保证数字显示“0000”。不必非常精确，可以在`hub.py`代码中，通过调节参数`【自定义，微调】校准值`，以保证运行启动后初始化时能准确显示“0000”
- 更多细节读源码即可

`./drawing/`中的图纸，前面板部分有些反牛顿。如果按我的拼搭，可能会稍微少一些零件，部分面板拼不上。因为我最后这块也没有设计的很完美，实际拼搭效果有些面板不是特别牢固，如果牢固就需要阻碍转动。所以没有把我的不成熟方案放出来，我也没有继续优化调整。
拿到图纸后，建议在实拼前，注意一下前面板部分。你如果有更好的拼搭方案，也可以分享出来。