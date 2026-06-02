(function () {
  'use strict';

  const DEFAULT_PROVIDERS = [
    {
      value: 'qwen',
      label: 'Qwen',
      defaultApiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      defaultModel: 'qwen3.6-plus',
      defaultVisionModel: 'qwen-vl-plus',
      defaultModels: ['qwen3.6-plus', 'qwen3.6-plus-2026-04-02', 'qwen3.5-plus', 'qwen3-coder-plus'],
      defaultVisionModels: ['qwen-vl-plus', 'qwen-vl-max'],
      modelSourceNote: '使用 OpenAI-compatible 地址，模型列表默认来自内置候选。'
    },
    {
      value: 'openai',
      label: 'OpenAI',
      defaultApiBase: 'https://api.openai.com/v1',
      defaultModel: 'gpt-5.1-mini',
      defaultVisionModel: 'gpt-5.1-mini',
      defaultModels: ['gpt-5.1-mini', 'gpt-5-mini', 'gpt-4.1-mini'],
      defaultVisionModels: ['gpt-5.1-mini', 'gpt-5-mini', 'gpt-4.1-mini'],
      modelSourceNote: '可由后端适配器接入 /models 获取实时模型列表。'
    },
    {
      value: 'custom',
      label: '自定义兼容接口',
      defaultApiBase: '',
      defaultModel: '',
      defaultVisionModel: '',
      defaultModels: [],
      defaultVisionModels: [],
      modelSourceNote: '适用于兼容 OpenAI Chat Completions 的私有网关。'
    }
  ];

  const DEFAULT_CAPABILITIES = {
    enabled: true,
    timeout: true,
    visionModel: true,
    history: true,
    testConnection: true,
    clearApiKey: true,
    dingtalkApp: true,
    environmentTabs: false
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function unwrap(payload) {
    if (payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object') {
      return payload.data;
    }
    return payload || {};
  }

  function normalizeProvider(item) {
    return {
      value: String(item.value || 'custom'),
      label: String(item.label || item.value || '自定义兼容接口'),
      defaultApiBase: String(item.defaultApiBase || item.default_api_base || ''),
      defaultModel: String(item.defaultModel || item.default_model || ''),
      defaultVisionModel: String(item.defaultVisionModel || item.default_vision_model || ''),
      defaultModels: Array.isArray(item.defaultModels) ? item.defaultModels : (item.default_models || []),
      defaultVisionModels: Array.isArray(item.defaultVisionModels) ? item.defaultVisionModels : (item.default_vision_models || []),
      modelSourceNote: String(item.modelSourceNote || item.model_source_note || '')
    };
  }

  function normalizeConfig(config) {
    const source = config || {};
    return {
      enabled: source.enabled !== false,
      provider: String(source.provider || 'qwen'),
      apiBase: String(source.apiBase || source.api_base || ''),
      model: String(source.model || ''),
      visionModel: String(source.visionModel || source.vision_model || ''),
      timeoutSeconds: Number(source.timeoutSeconds || source.timeout_seconds || 30),
      hasApiKey: Boolean(source.hasApiKey || source.has_api_key),
      apiKeyMasked: String(source.apiKeyMasked || source.api_key_masked || '未配置')
    };
  }

  function normalizeHistory(item) {
    return {
      id: String(item.id || ''),
      provider: String(item.provider || ''),
      apiBase: String(item.apiBase || item.api_base || ''),
      model: String(item.model || ''),
      visionModel: String(item.visionModel || item.vision_model || ''),
      hasApiKey: Boolean(item.hasApiKey || item.has_api_key),
      apiKeyMasked: String(item.apiKeyMasked || item.api_key_masked || '未配置'),
      updatedAt: String(item.updatedAt || item.updated_at || ''),
      deletable: item.deletable !== false
    };
  }

  function historyIdentity(item) {
    return [
      String(item.provider || '').trim().toLowerCase(),
      String(item.apiBase || '').trim(),
      String(item.model || '').trim(),
      String(item.visionModel || '').trim(),
      item.hasApiKey ? 'has-key' : 'no-key',
      String(item.apiKeyMasked || '').trim()
    ].join('\u0001');
  }

  function dedupeHistory(items) {
    const indexes = new Map();
    const result = [];
    (Array.isArray(items) ? items : [])
      .map(normalizeHistory)
      .forEach((item) => {
        const key = historyIdentity(item);
        if (!indexes.has(key)) {
          indexes.set(key, result.length);
          result.push(item);
          return;
        }
        if (item.deletable === false) {
          result[indexes.get(key)] = item;
        }
      });
    return result;
  }

  function normalizeEnvironment(item, providers) {
    const env = item || {};
    const config = normalizeConfig(env.config || env);
    const providerMeta = providers.find((provider) => provider.value === config.provider) || providers[0] || DEFAULT_PROVIDERS[0];
    if (!config.apiBase) config.apiBase = providerMeta.defaultApiBase || '';
    if (!config.model) config.model = providerMeta.defaultModel || '';
    if (!config.visionModel) config.visionModel = providerMeta.defaultVisionModel || '';
    return {
      id: String(env.id || env.env || 'default'),
      label: String(env.label || env.name || '默认环境'),
      restartRequired: Boolean(env.restartRequired || env.restart_required),
      sourceLabel: String(env.sourceLabel || env.source_label || '运行时配置'),
      updatedAt: String(env.updatedAt || env.updated_at || ''),
      status: env.status && typeof env.status === 'object' ? env.status : {},
      config,
      history: dedupeHistory(env.history)
    };
  }

  function splitList(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item || '').trim()).filter(Boolean);
    }
    return String(value || '')
      .split(/[\n,，;；]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeDingTalkAppConfig(payload) {
    const source = payload || {};
    return {
      corpId: String(source.corpId || source.corp_id || 'dingb7b711325c4be8aa35c2f4657eb6378f'),
      appId: String(source.appId || source.app_id || ''),
      agentId: String(source.agentId || source.agent_id || ''),
      clientId: String(source.clientId || source.client_id || source.appKey || source.app_key || source.suiteKey || source.suite_key || ''),
      hasAppSecret: Boolean(source.hasAppSecret || source.has_app_secret || source.hasClientSecret || source.has_client_secret),
      appSecretMasked: String(source.appSecretMasked || source.app_secret_masked || source.clientSecretMasked || source.client_secret_masked || source.clientSecret || source.client_secret || '未配置'),
      sourceLabel: String(source.sourceLabel || source.source_label || '运行时配置'),
      updatedAt: String(source.updatedAt || source.updated_at || ''),
      status: source.status && typeof source.status === 'object' ? source.status : {}
    };
  }

  function normalizeDingTalkApp(payload) {
    const source = payload || {};
    const config = normalizeDingTalkAppConfig(source.config || source);
    return {
      config,
      message: String(source.message || ''),
      testResult: source.testResult || source.test_result || null
    };
  }

  function normalizePageData(payload) {
    const data = unwrap(payload);
    const providers = (Array.isArray(data.providers) && data.providers.length ? data.providers : DEFAULT_PROVIDERS).map(normalizeProvider);
    const rawEnvironments = Array.isArray(data.environments) && data.environments.length
      ? data.environments
      : [{ id: 'default', label: '默认环境', config: data.config || data }];
    const rawDingTalkApp = data.dingtalkApp || data.dingtalk_app || data.dingtalk || (data.integrations && data.integrations.dingtalk) || {};
    return {
      providers,
      capabilities: Object.assign({}, DEFAULT_CAPABILITIES, data.capabilities || {}),
      environments: rawEnvironments.map((env) => normalizeEnvironment(env, providers)),
      dingtalkApp: normalizeDingTalkApp(rawDingTalkApp),
      message: String(data.message || '')
    };
  }

  function mockPageData() {
    return normalizePageData({
      providers: DEFAULT_PROVIDERS,
      capabilities: DEFAULT_CAPABILITIES,
      dingtalkApp: {
        config: {
          corpId: 'dingb7b711325c4be8aa35c2f4657eb6378f',
          appId: '5dc7724f-9bcd-4817-a008-7640526ef20f',
          agentId: '4524617888',
          clientId: 'ding8q6n4keutpmuqost',
          hasClientSecret: true,
          clientSecretMasked: 'hDoOja3Q1_****syfV9Otqok',
          sourceLabel: '环境变量或数据库配置',
          updatedAt: nowIso(),
          status: { ok: true, message: '应用凭证字段已配置' }
        }
      },
      environments: [
        {
          id: 'default',
          label: '默认环境',
          sourceLabel: '运行时配置',
          updatedAt: nowIso(),
          status: { online: true, message: '保存后作用于新的模型请求' },
          config: {
            enabled: true,
            provider: 'openai',
            apiBase: 'https://api.openai.com/v1',
            model: 'gpt-5.1-mini',
            visionModel: 'gpt-5.1-mini',
            timeoutSeconds: 30,
            hasApiKey: true,
            apiKeyMasked: 'sk-****9a2c'
          },
          history: [
            {
              id: 'history-openai',
              provider: 'openai',
              apiBase: 'https://api.openai.com/v1',
              model: 'gpt-5.1-mini',
              visionModel: 'gpt-5.1-mini',
              hasApiKey: true,
              apiKeyMasked: 'sk-****9a2c',
              updatedAt: nowIso(),
              deletable: false
            },
            {
              id: 'history-qwen',
              provider: 'qwen',
              apiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
              model: 'qwen3.6-plus',
              visionModel: 'qwen-vl-plus',
              hasApiKey: true,
              apiKeyMasked: 'sk-****1bc8',
              updatedAt: '2026-04-20T09:30:00+08:00',
              deletable: true
            }
          ]
        }
      ]
    });
  }

  class Page {
    constructor(root, options) {
      this.root = root;
      this.options = Object.assign({
        mock: true,
        apiBase: '/api/model-config',
        title: '模型配置页面',
        subtitle: '配置模型调用和钉钉第三方应用配置所需的运行时参数。'
      }, options || {});
      this.state = {
        loading: true,
        saving: false,
        testing: false,
        dingtalkSaving: false,
        deletingHistoryId: '',
        activeEnvId: '',
        providers: DEFAULT_PROVIDERS.map(normalizeProvider),
        capabilities: Object.assign({}, DEFAULT_CAPABILITIES),
        environments: [],
        forms: {},
        dingtalkApp: normalizeDingTalkApp({}),
        dingtalkForm: null,
        message: null,
        testResult: null
      };
    }

    async mount() {
      this.render();
      await this.load();
      this.bind();
    }

    bind() {
      this.root.addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]');
        if (!action) return;
        const name = action.getAttribute('data-action');
        const value = action.getAttribute('data-value') || '';
        if (name === 'reload') this.load(true);
        if (name === 'env') this.setActiveEnv(value);
        if (name === 'save') this.save();
        if (name === 'test') this.testConnection();
        if (name === 'clear-key') this.toggleClearKey(true);
        if (name === 'cancel-clear-key') this.toggleClearKey(false);
        if (name === 'fill-history') this.fillHistory(value);
        if (name === 'delete-history') this.deleteHistory(value);
        if (name === 'save-dingtalk') this.saveDingTalkApp();
        if (name === 'clear-dingtalk-app-secret') this.toggleDingTalkSecret('app', true);
        if (name === 'cancel-clear-dingtalk-app-secret') this.toggleDingTalkSecret('app', false);
      });

      this.root.addEventListener('input', (event) => {
        const dingtalkField = event.target.getAttribute('data-dingtalk-field');
        if (dingtalkField) {
          const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
          this.updateDingTalkField(dingtalkField, value);
          return;
        }
        const field = event.target.getAttribute('data-field');
        if (!field) return;
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        this.updateField(field, value);
      });

      this.root.addEventListener('change', (event) => {
        const field = event.target.getAttribute('data-field');
        if (field === 'provider') {
          this.changeProvider(event.target.value);
        }
      });
    }

    async request(path, options) {
      if (this.options.mock) {
        return this.mockRequest(path, options || {});
      }
      const response = await fetch(`${this.options.apiBase}${path}`, Object.assign({
        headers: { 'Content-Type': 'application/json' }
      }, options || {}));
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.message || `HTTP ${response.status}`);
      }
      return payload;
    }

    async mockRequest(path, options) {
      await new Promise((resolve) => setTimeout(resolve, 180));
      if (!this._mockData) this._mockData = mockPageData();
      if (path === '' || path === '/') return clone(this._mockData);

      const parts = path.split('/').filter(Boolean);
      if (parts[0] === 'dingtalk-app') {
        if (options.method === 'PUT') {
          const body = JSON.parse(options.body || '{}');
          const config = this._mockData.dingtalkApp.config;
          config.corpId = String(body.corpId || body.corp_id || '');
          config.appId = String(body.appId || body.app_id || '');
          config.agentId = String(body.agentId || body.agent_id || '');
          config.clientId = String(body.clientId || body.client_id || body.appKey || body.app_key || '');
          const clearClientSecret = Boolean(body.clearClientSecret || body.clear_client_secret || body.clearAppSecret || body.clear_app_secret);
          config.hasAppSecret = clearClientSecret ? false : Boolean(body.clientSecret || body.client_secret || body.appSecret || body.app_secret || config.hasAppSecret);
          config.appSecretMasked = clearClientSecret ? '未配置' : (body.clientSecret || body.client_secret || body.appSecret || body.app_secret ? 'secret-****mock' : config.appSecretMasked);
          config.updatedAt = nowIso();
          config.status = { ok: true, message: '应用凭证字段已保存' };
          return clone({ dingtalkApp: this._mockData.dingtalkApp, message: '钉钉第三方应用配置已保存。' });
        }
      }

      const envId = decodeURIComponent(parts[0] || '');
      const env = this._mockData.environments.find((item) => item.id === envId) || this._mockData.environments[0];

      if (options.method === 'PUT') {
        const body = JSON.parse(options.body || '{}');
        env.config = Object.assign({}, env.config, {
          enabled: body.enabled !== false,
          provider: body.provider || env.config.provider,
          apiBase: body.apiBase || body.api_base || env.config.apiBase,
          model: body.model || env.config.model,
          visionModel: body.visionModel || body.vision_model || env.config.visionModel,
          timeoutSeconds: Number(body.timeoutSeconds || body.timeout_seconds || env.config.timeoutSeconds || 30),
          hasApiKey: body.clearApiKey ? false : Boolean(body.apiKey || body.api_key || env.config.hasApiKey),
          apiKeyMasked: body.clearApiKey ? '未配置' : (body.apiKey || body.api_key ? 'sk-****mock' : env.config.apiKeyMasked)
        });
        env.updatedAt = nowIso();
        env.history = dedupeHistory([
          {
            id: `history-${Date.now()}`,
            provider: env.config.provider,
            apiBase: env.config.apiBase,
            model: env.config.model,
            visionModel: env.config.visionModel,
            hasApiKey: env.config.hasApiKey,
            apiKeyMasked: env.config.apiKeyMasked,
            updatedAt: env.updatedAt,
            deletable: false
          }
        ].concat(env.history.map((item) => Object.assign({}, item, { deletable: true })))).slice(0, 8);
        return clone({ environment: env, message: '配置已保存。' });
      }

      if (parts[1] === 'test') {
        return {
          ok: true,
          message: '模型连接成功',
          provider: env.config.provider,
          model: env.config.model,
          status: 'completed',
          responseId: 'mock-response-id',
          outputPreview: '{"ok":true}'
        };
      }

      if (parts[1] === 'history' && parts[2] && options.method === 'DELETE') {
        env.history = dedupeHistory(env.history.filter((item) => item.id !== decodeURIComponent(parts[2])));
        return clone({ history: env.history });
      }

      if (parts[1] === 'history' && parts[2]) {
        const history = env.history.find((item) => item.id === decodeURIComponent(parts[2]));
        if (!history) throw new Error('历史配置不存在');
        return clone(history);
      }

      return clone(this._mockData);
    }

    async load(force) {
      if (this.state.loading && !force) {
        this.render();
      }
      this.state.loading = true;
      this.state.message = null;
      this.render();
      try {
        const data = normalizePageData(await this.request('', { method: 'GET' }));
        this.state.providers = data.providers;
        this.state.capabilities = data.capabilities;
        this.state.environments = data.environments;
        this.state.dingtalkApp = data.dingtalkApp;
        if (!this.state.activeEnvId || !this.getEnv(this.state.activeEnvId)) {
          this.state.activeEnvId = data.environments[0] ? data.environments[0].id : 'default';
        }
        this.state.forms = {};
        this.state.dingtalkForm = null;
        this.state.message = data.message ? { type: 'ok', text: data.message } : null;
      } catch (error) {
        this.state.message = { type: 'error', text: error.message || '配置加载失败' };
      } finally {
        this.state.loading = false;
        this.render();
      }
    }

    getEnv(id) {
      return this.state.environments.find((item) => item.id === id);
    }

    activeEnv() {
      return this.getEnv(this.state.activeEnvId) || this.state.environments[0] || null;
    }

    providerMeta(provider) {
      return this.state.providers.find((item) => item.value === provider) || this.state.providers[0] || DEFAULT_PROVIDERS[0];
    }

    form(envId) {
      const env = this.getEnv(envId) || this.activeEnv();
      const id = env ? env.id : 'default';
      if (!this.state.forms[id]) {
        const config = env ? env.config : normalizeConfig({});
        this.state.forms[id] = {
          enabled: config.enabled !== false,
          provider: config.provider,
          apiBase: config.apiBase,
          model: config.model,
          visionModel: config.visionModel,
          timeoutSeconds: config.timeoutSeconds,
          apiKey: '',
          clearApiKey: false
        };
      }
      return this.state.forms[id];
    }

    dingtalkForm() {
      if (!this.state.dingtalkForm) {
        const config = this.state.dingtalkApp.config || normalizeDingTalkAppConfig({});
        this.state.dingtalkForm = {
          corpId: config.corpId,
          appId: config.appId,
          agentId: config.agentId,
          clientId: config.clientId,
          appSecret: '',
          clearAppSecret: false
        };
      }
      return this.state.dingtalkForm;
    }

    setActiveEnv(envId) {
      if (!this.getEnv(envId)) return;
      this.state.activeEnvId = envId;
      this.state.message = null;
      this.state.testResult = null;
      this.render();
    }

    updateField(field, value) {
      const env = this.activeEnv();
      if (!env) return;
      const form = this.form(env.id);
      if (field === 'enabled') form.enabled = Boolean(value);
      if (field === 'apiBase') form.apiBase = String(value || '');
      if (field === 'model') form.model = String(value || '');
      if (field === 'visionModel') form.visionModel = String(value || '');
      if (field === 'timeoutSeconds') form.timeoutSeconds = Number(value || 30);
      if (field === 'apiKey') form.apiKey = String(value || '');
      this.state.testResult = null;
    }

    updateDingTalkField(field, value) {
      const form = this.dingtalkForm();
      if (field === 'corpId') form.corpId = String(value || '');
      if (field === 'appId') form.appId = String(value || '');
      if (field === 'agentId') form.agentId = String(value || '');
      if (field === 'clientId') form.clientId = String(value || '');
      if (field === 'appSecret') form.appSecret = String(value || '');
    }

    changeProvider(provider) {
      const env = this.activeEnv();
      if (!env) return;
      const form = this.form(env.id);
      const meta = this.providerMeta(provider);
      form.provider = meta.value;
      form.apiBase = meta.defaultApiBase || form.apiBase;
      form.model = meta.defaultModel || form.model;
      form.visionModel = meta.defaultVisionModel || form.visionModel;
      this.state.testResult = null;
      this.render();
    }

    toggleClearKey(value) {
      const env = this.activeEnv();
      if (!env) return;
      const form = this.form(env.id);
      form.clearApiKey = Boolean(value);
      if (form.clearApiKey) form.apiKey = '';
      this.render();
    }

    toggleDingTalkSecret(kind, value) {
      const form = this.dingtalkForm();
      if (kind === 'app') {
        form.clearAppSecret = Boolean(value);
        if (form.clearAppSecret) form.appSecret = '';
      }
      this.render();
    }

    payload() {
      const env = this.activeEnv();
      const form = this.form(env.id);
      const payload = {
        enabled: form.enabled,
        provider: form.provider,
        apiBase: String(form.apiBase || '').trim(),
        model: String(form.model || '').trim(),
        timeoutSeconds: Number(form.timeoutSeconds || 30),
        clearApiKey: Boolean(form.clearApiKey)
      };
      if (this.state.capabilities.visionModel) payload.visionModel = String(form.visionModel || '').trim();
      if (String(form.apiKey || '').trim()) payload.apiKey = String(form.apiKey || '').trim();
      return payload;
    }

    dingtalkPayload() {
      const form = this.dingtalkForm();
      const payload = {
        corpId: String(form.corpId || '').trim(),
        appId: String(form.appId || '').trim(),
        agentId: String(form.agentId || '').trim(),
        clientId: String(form.clientId || '').trim(),
        clearClientSecret: Boolean(form.clearAppSecret)
      };
      if (String(form.appSecret || '').trim()) payload.clientSecret = String(form.appSecret || '').trim();
      return payload;
    }

    async save() {
      const env = this.activeEnv();
      if (!env) return;
      this.state.saving = true;
      this.state.message = null;
      this.render();
      try {
        const result = unwrap(await this.request(`/${encodeURIComponent(env.id)}`, {
          method: 'PUT',
          body: JSON.stringify(this.payload())
        }));
        if (result.environments) {
          const data = normalizePageData(result);
          this.state.environments = data.environments;
          this.state.providers = data.providers;
          this.state.capabilities = data.capabilities;
        } else if (result.environment) {
          const normalized = normalizeEnvironment(result.environment, this.state.providers);
          this.state.environments = this.state.environments.map((item) => item.id === normalized.id ? normalized : item);
        } else {
          await this.load(true);
        }
        this.state.forms = {};
        this.state.message = { type: 'ok', text: result.message || '模型配置已保存' };
      } catch (error) {
        this.state.message = { type: 'error', text: error.message || '模型配置保存失败' };
      } finally {
        this.state.saving = false;
        this.render();
      }
    }

    async testConnection() {
      const env = this.activeEnv();
      if (!env) return;
      this.state.testing = true;
      this.state.testResult = null;
      this.state.message = null;
      this.render();
      try {
        this.state.testResult = unwrap(await this.request(`/${encodeURIComponent(env.id)}/test`, {
          method: 'POST',
          body: JSON.stringify(this.payload())
        }));
      } catch (error) {
        this.state.testResult = { ok: false, message: error.message || '模型连通性测试失败', status: 'failed' };
      } finally {
        this.state.testing = false;
        this.render();
      }
    }

    async saveDingTalkApp() {
      this.state.dingtalkSaving = true;
      this.state.message = null;
      this.render();
      try {
        const result = unwrap(await this.request('/dingtalk-app', {
          method: 'PUT',
          body: JSON.stringify(this.dingtalkPayload())
        }));
        if (result.dingtalkApp || result.dingtalk_app || result.dingtalk) {
          this.state.dingtalkApp = normalizeDingTalkApp(result.dingtalkApp || result.dingtalk_app || result.dingtalk);
        } else if (result.config) {
          this.state.dingtalkApp = normalizeDingTalkApp(result);
        } else {
          await this.load(true);
        }
        this.state.dingtalkForm = null;
        this.state.message = { type: 'ok', text: result.message || '钉钉第三方应用配置已保存' };
      } catch (error) {
        this.state.message = { type: 'error', text: error.message || '钉钉第三方应用配置保存失败' };
      } finally {
        this.state.dingtalkSaving = false;
        this.render();
      }
    }

    async fillHistory(historyId) {
      const env = this.activeEnv();
      if (!env || !historyId) return;
      try {
        const data = unwrap(await this.request(`/${encodeURIComponent(env.id)}/history/${encodeURIComponent(historyId)}`, { method: 'GET' }));
        const form = this.form(env.id);
        form.provider = data.provider || form.provider;
        form.apiBase = data.apiBase || data.api_base || form.apiBase;
        form.model = data.model || form.model;
        form.visionModel = data.visionModel || data.vision_model || form.visionModel;
        form.apiKey = '';
        form.clearApiKey = false;
        this.state.message = { type: 'ok', text: '已回填历史配置，API Key 将继续保留当前已保存值。' };
      } catch (error) {
        this.state.message = { type: 'error', text: error.message || '历史配置加载失败' };
      }
      this.render();
    }

    async deleteHistory(historyId) {
      const env = this.activeEnv();
      if (!env || !historyId) return;
      if (!window.confirm('确认删除这条历史模型配置吗？')) return;
      this.state.deletingHistoryId = historyId;
      this.render();
      try {
        const data = unwrap(await this.request(`/${encodeURIComponent(env.id)}/history/${encodeURIComponent(historyId)}`, { method: 'DELETE' }));
        if (Array.isArray(data.history)) {
          env.history = dedupeHistory(data.history);
        } else {
          env.history = dedupeHistory(env.history.filter((item) => item.id !== historyId));
        }
        this.state.message = { type: 'ok', text: '历史模型配置已删除。' };
      } catch (error) {
        this.state.message = { type: 'error', text: error.message || '历史配置删除失败' };
      } finally {
        this.state.deletingHistoryId = '';
        this.render();
      }
    }

    render() {
      if (!this.root) return;
      if (this.state.loading && !this.state.environments.length) {
        this.root.innerHTML = this.renderFrame('<div class="mcfg-loading">正在加载模型配置...</div>');
        return;
      }
      const env = this.activeEnv();
      this.root.innerHTML = this.renderFrame(env ? this.renderContent(env) : '<div class="mcfg-loading">未找到可用配置环境。</div>');
    }

    renderFrame(content) {
      return `
        <div class="mcfg-page">
          <div class="mcfg-shell">
            <header class="mcfg-header">
              <div>
                <h1 class="mcfg-title">${escapeHtml(this.options.title)}</h1>
                <p class="mcfg-subtitle">${escapeHtml(this.options.subtitle)}</p>
              </div>
              <button type="button" class="mcfg-button" data-action="reload" ${this.state.loading ? 'disabled' : ''}>刷新配置</button>
            </header>
            ${this.renderTabs()}
            ${this.state.message ? this.renderMessage(this.state.message) : ''}
            ${content}
          </div>
        </div>
      `;
    }

    renderTabs() {
      if (!this.state.capabilities.environmentTabs || this.state.environments.length <= 1) return '';
      return `
        <nav class="mcfg-tabs" aria-label="模型配置环境">
          ${this.state.environments.map((env) => `
            <button type="button" class="mcfg-tab ${env.id === this.state.activeEnvId ? 'is-active' : ''}" data-action="env" data-value="${escapeHtml(env.id)}">
              ${escapeHtml(env.label)}
            </button>
          `).join('')}
        </nav>
      `;
    }

    renderContent(env) {
      return `
        <div class="mcfg-grid">
          ${this.renderForm(env)}
          ${this.renderSide(env)}
        </div>
        ${this.state.capabilities.dingtalkApp ? this.renderDingTalkApp() : ''}
      `;
    }

    renderForm(env) {
      const form = this.form(env.id);
      const meta = this.providerMeta(form.provider);
      const busy = this.state.saving || this.state.testing;
      const caps = this.state.capabilities;
      const keyText = env.config.hasApiKey ? env.config.apiKeyMasked : '未配置';
      return `
        <section class="mcfg-panel">
          <div class="mcfg-panel-head">
            <div>
              <h2 class="mcfg-panel-title">模型配置</h2>
              <div class="mcfg-panel-note">${escapeHtml(meta.modelSourceNote || '选择 Provider 后会填入推荐 Base URL 和默认模型。')}</div>
            </div>
            ${caps.enabled ? `
              <label class="mcfg-check">
                <input type="checkbox" data-field="enabled" ${form.enabled ? 'checked' : ''} ${busy ? 'disabled' : ''}>
                <span>启用模型调用</span>
              </label>
            ` : ''}
          </div>
          <div class="mcfg-body">
            <div class="mcfg-form-grid">
              <label class="mcfg-field">
                <span class="mcfg-label">Provider</span>
                <select class="mcfg-select" data-field="provider" ${busy ? 'disabled' : ''}>
                  ${this.state.providers.map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === form.provider ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}
                </select>
              </label>
              <label class="mcfg-field">
                <span class="mcfg-label">文本模型</span>
                <input class="mcfg-input" list="mcfg-models" data-field="model" value="${escapeHtml(form.model)}" placeholder="${escapeHtml(meta.defaultModel || 'model-name')}" ${busy ? 'disabled' : ''}>
                <datalist id="mcfg-models">${this.renderOptions([form.model].concat(meta.defaultModels || []))}</datalist>
              </label>
              ${caps.visionModel ? `
                <label class="mcfg-field">
                  <span class="mcfg-label">视觉模型</span>
                  <input class="mcfg-input" list="mcfg-vision-models" data-field="visionModel" value="${escapeHtml(form.visionModel)}" placeholder="${escapeHtml(meta.defaultVisionModel || 'vision-model')}" ${busy ? 'disabled' : ''}>
                  <datalist id="mcfg-vision-models">${this.renderOptions([form.visionModel].concat(meta.defaultVisionModels || []))}</datalist>
                </label>
              ` : ''}
              <label class="mcfg-field is-wide">
                <span class="mcfg-label">API Base</span>
                <input class="mcfg-input" data-field="apiBase" value="${escapeHtml(form.apiBase)}" placeholder="${escapeHtml(meta.defaultApiBase || 'https://example.com/v1')}" ${busy ? 'disabled' : ''}>
              </label>
              ${caps.timeout ? `
                <label class="mcfg-field">
                  <span class="mcfg-label">超时时间</span>
                  <input class="mcfg-input" type="number" min="5" max="300" data-field="timeoutSeconds" value="${escapeHtml(form.timeoutSeconds)}" ${busy ? 'disabled' : ''}>
                </label>
              ` : ''}
              <label class="mcfg-field ${caps.timeout ? '' : 'is-wide'}">
                <span class="mcfg-label">API Key</span>
                <input class="mcfg-input" type="password" data-field="apiKey" value="${escapeHtml(form.apiKey)}" placeholder="留空则保留当前 Key" ${form.clearApiKey || busy ? 'disabled' : ''}>
                <span class="mcfg-help">当前 Key：${escapeHtml(keyText)}</span>
              </label>
            </div>
            <div class="mcfg-actions">
              <button type="button" class="mcfg-button is-primary" data-action="save" ${busy ? 'disabled' : ''}>${this.state.saving ? '保存中...' : '保存配置'}</button>
              ${caps.testConnection ? `<button type="button" class="mcfg-button" data-action="test" ${busy ? 'disabled' : ''}>${this.state.testing ? '测试中...' : '测试连接'}</button>` : ''}
              ${caps.clearApiKey && !form.clearApiKey ? `<button type="button" class="mcfg-button is-danger" data-action="clear-key" ${busy ? 'disabled' : ''}>清空已保存 Key</button>` : ''}
              ${caps.clearApiKey && form.clearApiKey ? `<button type="button" class="mcfg-button" data-action="cancel-clear-key" ${busy ? 'disabled' : ''}>取消清空 Key</button>` : ''}
            </div>
            ${form.clearApiKey ? this.renderMessage({ type: 'warn', text: '保存后会清空当前环境已保存的 API Key。' }) : ''}
            ${this.state.testResult ? this.renderTestResult(this.state.testResult) : ''}
          </div>
        </section>
      `;
    }

    renderOptions(values) {
      return Array.from(new Set((values || []).filter(Boolean))).map((item) => `<option value="${escapeHtml(item)}"></option>`).join('');
    }

    renderSide(env) {
      return `
        <aside class="mcfg-panel">
          <div class="mcfg-panel-head">
            <div>
              <h2 class="mcfg-panel-title">环境信息</h2>
              <div class="mcfg-panel-note">${escapeHtml(env.label)}</div>
            </div>
          </div>
          <div class="mcfg-body">
            ${this.renderMeta(env)}
            ${this.state.capabilities.history ? this.renderHistory(env) : ''}
          </div>
        </aside>
      `;
    }

    renderDingTalkApp() {
      const config = this.state.dingtalkApp.config || normalizeDingTalkAppConfig({});
      const form = this.dingtalkForm();
      const busy = this.state.dingtalkSaving;
      const appSecretText = config.hasAppSecret ? config.appSecretMasked : '未配置';
      return `
        <section class="mcfg-panel mcfg-section">
          <div class="mcfg-panel-head">
            <div>
              <h2 class="mcfg-panel-title">钉钉第三方应用配置</h2>
              <div class="mcfg-panel-note">按钉钉开放平台“应用凭证”填写。Client Secret 默认只支持替换、保留或清空。</div>
            </div>
            <div class="mcfg-panel-note">${escapeHtml(config.sourceLabel || '运行时配置')}</div>
          </div>
          <div class="mcfg-body">
            <div class="mcfg-form-grid mcfg-dingtalk-grid">
              <label class="mcfg-field is-wide">
                <span class="mcfg-label">CorpId</span>
                <input class="mcfg-input" data-dingtalk-field="corpId" value="${escapeHtml(form.corpId)}" placeholder="钉钉企业 CorpId" ${busy ? 'disabled' : ''}>
              </label>
              <label class="mcfg-field">
                <span class="mcfg-label">App ID</span>
                <input class="mcfg-input" data-dingtalk-field="appId" value="${escapeHtml(form.appId)}" placeholder="钉钉应用 App ID" ${busy ? 'disabled' : ''}>
              </label>
              <label class="mcfg-field">
                <span class="mcfg-label">原企业内部应用 AgentId</span>
                <input class="mcfg-input" data-dingtalk-field="agentId" value="${escapeHtml(form.agentId)}" placeholder="原企业内部应用 AgentId" ${busy ? 'disabled' : ''}>
              </label>
              <label class="mcfg-field">
                <span class="mcfg-label">Client ID（原 AppKey 和 SuiteKey）</span>
                <input class="mcfg-input" data-dingtalk-field="clientId" value="${escapeHtml(form.clientId)}" placeholder="Client ID" ${busy ? 'disabled' : ''}>
              </label>
              <label class="mcfg-field">
                <span class="mcfg-label">Client Secret（原 AppSecret 和 SuiteSecret）</span>
                <input class="mcfg-input" type="password" data-dingtalk-field="appSecret" value="${escapeHtml(form.appSecret)}" placeholder="留空则保留当前 Secret" ${form.clearAppSecret || busy ? 'disabled' : ''}>
                <span class="mcfg-help">当前 Secret：${escapeHtml(appSecretText)}</span>
              </label>
            </div>
            <div class="mcfg-actions">
              <button type="button" class="mcfg-button is-primary" data-action="save-dingtalk" ${busy ? 'disabled' : ''}>${this.state.dingtalkSaving ? '保存中...' : '保存钉钉配置'}</button>
              ${!form.clearAppSecret ? `<button type="button" class="mcfg-button is-danger" data-action="clear-dingtalk-app-secret" ${busy ? 'disabled' : ''}>清空 Client Secret</button>` : `<button type="button" class="mcfg-button" data-action="cancel-clear-dingtalk-app-secret" ${busy ? 'disabled' : ''}>取消清空 Client Secret</button>`}
            </div>
            ${form.clearAppSecret ? this.renderMessage({ type: 'warn', text: '保存后会清空当前 Client Secret。' }) : ''}
            ${this.renderDingTalkStatus(config)}
          </div>
        </section>
      `;
    }

    renderDingTalkStatus(config) {
      return `
        <div class="mcfg-result is-warn">
          <strong>当前状态</strong>
          <div>更新时间：${escapeHtml(config.updatedAt || '--')}</div>
          <div>配置说明：${escapeHtml((config.status && config.status.message) || '--')}</div>
        </div>
      `;
    }

    renderMeta(env) {
      return `
        <div class="mcfg-meta-list">
          <div class="mcfg-meta-row"><div class="mcfg-meta-key">配置来源</div><div class="mcfg-meta-value">${escapeHtml(env.sourceLabel || '--')}</div></div>
          <div class="mcfg-meta-row"><div class="mcfg-meta-key">更新时间</div><div class="mcfg-meta-value">${escapeHtml(env.updatedAt || '--')}</div></div>
          <div class="mcfg-meta-row"><div class="mcfg-meta-key">运行状态</div><div class="mcfg-meta-value">${escapeHtml(env.status.message || (env.status.online ? 'online' : '--'))}</div></div>
        </div>
      `;
    }

    renderHistory(env) {
      const rows = dedupeHistory(env.history || []);
      return `
        <div style="height:16px"></div>
        <h3 class="mcfg-panel-title" style="font-size:15px">历史配置</h3>
        <div style="height:10px"></div>
        ${rows.length ? `<div class="mcfg-history">${rows.map((item) => this.renderHistoryItem(item)).join('')}</div>` : '<div class="mcfg-empty">暂无历史模型配置</div>'}
      `;
    }

    renderHistoryItem(item) {
      const deleting = this.state.deletingHistoryId === item.id;
      return `
        <div class="mcfg-history-item">
          <div class="mcfg-history-main">
            <div>
              <p class="mcfg-history-title">${escapeHtml(String(item.provider || '--').toUpperCase())} / ${escapeHtml(item.model || '--')}</p>
              <div class="mcfg-history-sub">Key: ${escapeHtml(item.apiKeyMasked || '未配置')}<br>${escapeHtml(item.apiBase || '--')}<br>${escapeHtml(item.updatedAt || '--')}</div>
            </div>
            <div class="mcfg-history-actions">
              <button type="button" class="mcfg-icon-button" title="回填历史配置" data-action="fill-history" data-value="${escapeHtml(item.id)}">↩</button>
              <button type="button" class="mcfg-icon-button" title="${item.deletable ? '删除历史配置' : '当前配置不可删除'}" data-action="delete-history" data-value="${escapeHtml(item.id)}" ${(deleting || !item.deletable) ? 'disabled' : ''}>×</button>
            </div>
          </div>
        </div>
      `;
    }

    renderMessage(message) {
      const type = message.type === 'error' ? 'is-error' : message.type === 'warn' ? 'is-warn' : 'is-ok';
      return `<div class="mcfg-message ${type}">${escapeHtml(message.text || '')}</div>`;
    }

    renderTestResult(result) {
      const ok = Boolean(result.ok);
      return `
        <div class="mcfg-result ${ok ? 'is-ok' : 'is-error'}">
          <strong>${ok ? '连接成功' : '连接失败'}</strong>
          <div>${escapeHtml(result.message || '--')}</div>
          <div>模型：${escapeHtml(result.model || '--')}</div>
          <div>状态：${escapeHtml(result.status || '--')}</div>
          ${result.responseId ? `<div>响应 ID：${escapeHtml(result.responseId)}</div>` : ''}
          ${result.outputPreview ? `<div>输出预览：${escapeHtml(result.outputPreview)}</div>` : ''}
        </div>
      `;
    }

  }

  window.ModelConfigPage = {
    mount(selector, options) {
      const root = typeof selector === 'string' ? document.querySelector(selector) : selector;
      if (!root) throw new Error('ModelConfigPage root not found');
      const page = new Page(root, options || {});
      page.mount();
      return page;
    },
    normalizePageData,
    DEFAULT_PROVIDERS
  };
})();
