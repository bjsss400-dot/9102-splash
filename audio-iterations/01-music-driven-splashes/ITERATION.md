# Iteration 1 — Music-driven splashes / 音乐响度驱动水花

Contributor: Zihuai Liu  
Source: user-supplied `bigger-splash-audio 2` folder. Archived unchanged on 2026-10-23.

## 实现内容

- 使用 `p5.Amplitude` 测量背景音乐的实际响度。
- 用快速平滑和慢速平均值，识别高于音乐基线的短波峰。
- 根据波峰与平均值的差距，将水花分成小、中、大三档。
- 加入启动学习时间、触发间隔和回落检测，减少重复触发。
- 提供音乐播放/暂停、响度历史显示，以及配套的原创演示曲。

## 文件

`audio-mechanic.js` 和 `assets/poolside-study.wav` 是该版音频实现与配乐；`tests/audio.test.cjs` 为原始行为测试；`tools/make-demo-music.py` 为原始配乐生成工具。原始 README 和使用说明一并保留，描述的是第一版的功能与整合方法，并不代表当前根目录的实现。

## 与第二版的区别

第一版着重让音乐产生不同大小的水花，尚未包含后来制作的跳板挤压声、回弹声和用户提供的真实落水录音。第二版转向音乐驱动跳板，以及与空格跳水同步的声音反馈。

## 查看与测试

本目录是音频模块历史归档，没有复制组员的整套画面文件。测试可在本目录执行 `node tests/audio.test.cjs`。若需运行第一版画面，请在项目副本中按原始使用说明整合；不要用旧版覆盖组员当前文件。

## 记录说明

此次提交是补充归档此前已存在的第一版源文件，不是声称该版本刚刚开发完成。保留原文件中的 AI 协助说明；没有改写现有 Git 提交时间或历史。
