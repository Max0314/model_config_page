# Git 工作流

`model_config_page` 当前只配置 GitHub remote，因此默认只推 GitHub；后续如新增 GitLab remote，则按总工作区规则一并推送。

## Remote

| remote | 用途 |
| --- | --- |
| `github` | 代码准源：`Max0314/model_config_page` |

## 默认分支

- 主分支：`main`
- 任务分支：`feature/*`、`fix/*`、`codex/*`。

## 提交前

```bash
git status --short --branch
git remote -v
```

确认没有真实 API key、钉钉 secret、生产配置、浏览器缓存或宿主系统私有配置进入暂存区。

## 默认推送

主分支：

```bash
git push github main
```

当前任务分支：

```bash
git push github HEAD
```

如果后续配置 `gitlab-new`，Codex/Claude 完成编码任务后应一并推送 GitLab。

## 部署关系

- Git 推送不等于部署。
- 本项目通常由宿主系统集成发布。
- 静态资源发布和线上验证由 Codex 通过 SSH 到宿主服务器执行。

