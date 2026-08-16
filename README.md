# dsh-kgraph-plugin — 项目知识图谱

> DSH（DeepSeek Harness）组合包插件：只读扫描任意项目目录，自动构建**模块级 + 文件级知识图谱**，帮助快速理解项目整体架构与设计思路，为后续进化、优化提供依据。
>
> 按 [DSH 官方发布文档](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish) 打包为标准组合包（bundle），支持 npm / GitHub / tarball 安装。

## 📸 界面预览

![整体知识图谱](asserts/pet-mall-all-kgraph.png)

![后端模块图谱](asserts/pet-mall-backend-kgraph.png)

## ✨ 功能特性

- **只读分析**：全程使用 DSH 的 `fs` 服务，绝不修改被扫描项目
- **多模块识别**：按 manifest（`pom.xml` / `package.json` / `go.mod` / `requirements.txt` / `pyproject.toml` 等）自动拆分模块
- **多语言依赖解析**：Java/Kotlin（类索引）、TS/JS/Vue（别名与相对路径）、Python（点路径）、Go（根相对路径）
- **分层分类**：controller / service / mapper / entity / dto / config / pages / components / router / store / api / util 等
- **图谱输出**：模块依赖图、文件级依赖图、技术栈、入口点、关键文件、架构观察
- **使用入口**：**页面右下角可视化面板**（主入口，输入路径即可扫描）· `project_kgraph` 模型工具（Agent 可读，与面板共享扫描缓存）

## 📦 安装

推荐（显式版本号，避免 pnpm lockfile 缓存旧版本）：

```sh
dsh plugin --profile web add dsh-kgraph-plugin@0.3.0
```

## 🚀 使用

安装启动后，**页面右下角**出现「项目知识图谱」浮动面板：

1. 输入项目路径（如 `X:/xxx/xxx`）→ 点「扫描」
2. 总览：模块卡片、技术栈、模块依赖图、架构观察
3. 点击模块进入**文件级分层图谱**（controller → service → mapper → …），点击节点查看代码详情
4. 大型图谱用 `⛶` 全屏浏览，`—` 折叠面板

Agent 侧可调用 `project_kgraph` 工具（`{ "path": "X:/xxx/xxx" }`）获取完整图谱 JSON，与面板共享同一份扫描缓存。

## 🗂️ 代码结构

```
kgraph-plugin/
├── package.json        # dsh.bundle + dsh.client 声明
├── cordis.patch.yml    # 组合包配置层
├── index.js            # Host: 扫描引擎 + project_kgraph 工具 + /api/kgraph 数据路由
├── lib/client.js       # 浏览器端: 浮动图谱面板 (ModuleLoader 协议)
├── asserts/            # 截图
└── dynamic/            # 动态插件模式源码 (备选)
```

## 📜 版本历史

| 版本 | 说明 |
|---|---|
| 0.1.0 | 打包为标准组合包 |
| 0.1.1 | 修复 `tools` 服务注入 |
| 0.2.x | 新增浏览器 UI 面板、全屏/折叠、缓存共享与多项 UI 修复 |
| **0.3.0** | **当前版本**：移除 `/kgraph` 命令，统一以右下角面板 + `project_kgraph` 工具使用 |

## License

[MIT](LICENSE)
