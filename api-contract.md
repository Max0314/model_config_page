# 模型配置页面 API 契约

默认前缀为：

```text
/api/model-config
```

前端可通过 `ModelConfigPage.mount(..., { apiBase: '/your/api' })` 修改。

## 1. 获取配置

```http
GET /api/model-config
```

响应：

```json
{
  "providers": [
    {
      "value": "qwen",
      "label": "Qwen",
      "defaultApiBase": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "defaultModel": "qwen3.6-plus",
      "defaultVisionModel": "qwen-vl-plus",
      "defaultModels": ["qwen3.6-plus", "qwen3.6-plus-2026-04-02"],
      "defaultVisionModels": ["qwen-vl-plus"],
      "modelSourceNote": "使用内置模型候选列表"
    }
  ],
  "capabilities": {
    "enabled": true,
    "timeout": true,
    "visionModel": true,
    "history": true,
    "testConnection": true,
    "clearApiKey": true,
    "dingtalkApp": true,
    "environmentTabs": false
  },
  "environments": [
    {
      "id": "default",
      "label": "默认环境",
      "sourceLabel": "数据库运行时配置",
      "updatedAt": "2026-04-28T10:00:00+08:00",
      "status": {
        "online": true,
        "message": "保存后立即作用于新请求"
      },
      "config": {
        "enabled": true,
        "provider": "qwen",
        "apiBase": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "model": "qwen3.6-plus",
        "visionModel": "qwen-vl-plus",
        "timeoutSeconds": 30,
        "hasApiKey": true,
        "apiKeyMasked": "sk-****abcd"
      },
      "history": [
        {
          "id": "history-1",
          "provider": "qwen",
          "apiBase": "https://dashscope.aliyuncs.com/compatible-mode/v1",
          "model": "qwen3.6-plus",
          "visionModel": "qwen-vl-plus",
          "hasApiKey": true,
          "apiKeyMasked": "sk-****abcd",
          "updatedAt": "2026-04-28T10:00:00+08:00",
          "deletable": false
        }
      ]
    }
  ],
  "dingtalkApp": {
    "config": {
      "corpId": "dingb7b711325c4be8aa35c2f4657eb6378f",
      "appId": "5dc7724f-9bcd-4817-a008-7640526ef20f",
      "agentId": "4524617888",
      "clientId": "ding8q6n4keutpmuqost",
      "hasClientSecret": true,
      "clientSecretMasked": "hDoOja3Q1_****syfV9Otqok",
      "sourceLabel": "环境变量或数据库配置",
      "updatedAt": "2026-04-28T10:00:00+08:00",
      "status": {
        "ok": true,
        "message": "应用凭证字段已配置"
      }
    }
  }
}
```

兼容包装：

```json
{ "success": true, "data": { "...": "上面的响应体" } }
```

页面会自动解包 `data`。

历史配置会按 `provider + apiBase + model + visionModel + API Key 状态/脱敏值` 去重，保留返回顺序中的第一条；如果重复项包含 `deletable: false` 的当前配置，则以不可删除项为准。建议后端按更新时间倒序返回，前端会保留最新配置。

## 2. 保存配置

```http
PUT /api/model-config/{environmentId}
Content-Type: application/json
```

请求：

```json
{
  "enabled": true,
  "provider": "qwen",
  "apiBase": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "model": "qwen3.6-plus",
  "visionModel": "qwen-vl-plus",
  "timeoutSeconds": 30,
  "apiKey": "sk-xxx",
  "clearApiKey": false
}
```

字段规则：

- `apiKey` 为空或缺失：保留当前已保存 Key。
- `apiKey` 非空：替换当前 Key。
- `clearApiKey: true`：清空当前 Key。
- 不支持视觉模型的系统可以忽略 `visionModel`。

响应可以返回完整 `GET` 响应，也可以只返回更新后的环境对象：

```json
{
  "environment": {
    "id": "default",
    "label": "默认环境",
    "config": {
      "provider": "qwen",
      "apiBase": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "model": "qwen3.6-plus",
      "hasApiKey": true,
      "apiKeyMasked": "sk-****abcd"
    }
  },
  "message": "模型配置已保存"
}
```

## 3. 测试连接

```http
POST /api/model-config/{environmentId}/test
Content-Type: application/json
```

请求体与保存配置相同。后端应使用“页面输入 + 已保存 Key”的合并结果测试连接。

响应：

```json
{
  "ok": true,
  "message": "模型连接成功",
  "provider": "qwen",
  "model": "qwen3.6-plus",
  "status": "completed",
  "responseId": "chatcmpl-xxx",
  "outputPreview": "{\"ok\":true}"
}
```

## 4. 获取历史配置

```http
GET /api/model-config/{environmentId}/history/{historyId}
```

响应：

```json
{
  "id": "history-1",
  "provider": "qwen",
  "apiBase": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "model": "qwen3.6-plus",
  "visionModel": "qwen-vl-plus",
  "updatedAt": "2026-04-28T10:00:00+08:00"
}
```

## 5. 删除历史配置

```http
DELETE /api/model-config/{environmentId}/history/{historyId}
```

响应：

```json
{
  "history": []
}
```

当前配置建议返回 400 或 409：

```json
{
  "error": "当前模型配置不可删除"
}
```

## 6. 保存钉钉第三方应用

```http
PUT /api/model-config/dingtalk-app
Content-Type: application/json
```

请求：

```json
{
  "corpId": "dingb7b711325c4be8aa35c2f4657eb6378f",
  "appId": "5dc7724f-9bcd-4817-a008-7640526ef20f",
  "agentId": "4524617888",
  "clientId": "ding8q6n4keutpmuqost",
  "clientSecret": "<new-client-secret>",
  "clearClientSecret": false
}
```

字段规则：

- `corpId`：钉钉企业 CorpId，默认示例值为 `dingb7b711325c4be8aa35c2f4657eb6378f`。
- `appId`：钉钉开放平台应用凭证里的 App ID。
- `agentId`：原企业内部应用 AgentId。
- `clientId`：Client ID，钉钉页面说明为“原 AppKey 和 SuiteKey”。
- `clientSecret`：Client Secret，钉钉页面说明为“原 AppSecret 和 SuiteSecret”。
- `clientSecret` 为空或缺失：保留当前 Client Secret。
- `clearClientSecret: true`：清空当前 Client Secret。
- 页面不配置回调地址。回调地址应由登录服务、网关或部署配置决定。
- 通用页面不提供钉钉测试按钮；是否能真实校验依赖具体后端能否安全调用钉钉开放平台，因此不放入通用契约。

响应：

```json
{
  "dingtalkApp": {
    "config": {
      "corpId": "dingb7b711325c4be8aa35c2f4657eb6378f",
      "appId": "5dc7724f-9bcd-4817-a008-7640526ef20f",
      "agentId": "4524617888",
      "clientId": "ding8q6n4keutpmuqost",
      "hasClientSecret": true,
      "clientSecretMasked": "hDoOja3Q1_****syfV9Otqok",
      "sourceLabel": "数据库运行时配置",
      "updatedAt": "2026-04-28T10:00:00+08:00",
      "status": {
        "ok": true,
        "message": "应用凭证字段已保存"
      }
    }
  },
  "message": "钉钉第三方应用配置已保存"
}
```
