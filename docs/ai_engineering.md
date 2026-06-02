# AI 工程化说明

本项目提供可复用模型配置页面。AI Agent 修改时要确认改动属于页面交互、样式、接口契约还是接入说明。

## 默认流程

1. 阅读 `AGENTS.md`、`README.md` 和 `api-contract.md`。
2. 修改静态资产或契约文档。
3. 运行 `make check`。
4. 如接口字段变化，同步更新接入说明。

## 高风险区域

- `model-config.js`
- `api-contract.md`
- `model-config.css`

不要让页面依赖某个项目的专有存储逻辑。
