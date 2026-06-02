# AGENTS.md

本文件是 `tools/model-config-page` 的 AI 工程化约束。Codex 或其他 AI Agent 修改本项目时，应优先读取本文件、`README.md`、`api-contract.md`、`docs/workflow.md` 和对应的 `tasks/*.md`。

## 项目边界

- 本项目是通用模型配置页面资产，GitHub 主分支为 `main`。
- 页面不绑定具体系统的数据库、配置文件或重启方式。
- 其他系统应通过 `api-contract.md` 实现适配器，不要把各项目的存储逻辑写进本页面。
- 不提交真实 API Key、钉钉 secret、生产配置或浏览器缓存。

## 技术栈

- 静态 HTML/CSS/JavaScript。
- 入口：`index.html`。
- 样式：`model-config.css`。
- 逻辑：`model-config.js`。
- 接口契约：`api-contract.md`。

## 编码规则

- 保持无框架、可嵌入、低依赖。
- CSS 使用 `mcfg` 前缀，避免污染宿主页面。
- 接口字段变化必须同步更新 `api-contract.md`。
- 默认 mock 模式不能访问真实后端或保存真实配置。

## 验证规则

默认验证入口：

```bash
make check
```

至少确认静态入口、样式、脚本和接口契约存在。

## Git 规则

- 主分支为 `main`。
- 一个任务一个分支，推荐格式：`feature/task-xxx-short-name` 或 `fix/task-xxx-short-name`。
- 提交前确认没有真实 key、secret、缓存和构建产物进入暂存区。
