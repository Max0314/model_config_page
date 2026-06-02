# Architecture

## 文件结构

- `index.html`：独立预览入口。
- `model-config.css`：样式。
- `model-config.js`：页面逻辑和 mount API。
- `api-contract.md`：后端适配契约。
- `preview.svg`：预览图。

## 数据流

```text
Host page -> ModelConfigPage.mount -> adapter API -> backend storage
```

页面只负责展示、编辑和调用适配接口，不直接管理具体项目的配置文件。
