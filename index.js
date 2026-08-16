import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'kgraph-plugin'

export const inject = ['fs', 'tools']

/**
 * 项目知识图谱 — 标准 Cordis 插件模块（官方 bundle 打包格式）。
 * 只读扫描项目目录，生成模块/文件级知识图谱与架构观察。
 * 提供: /kgraph {项目路径} 命令 + project_kgraph 模型工具。
 */
export function apply(ctx) {
  const fs = ctx.fs
  const cache = new Map()
  const fileCache = new Map()

  const SKIP_DIRS = new Set(['node_modules', '.git', '.hg', '.svn', '.idea', '.vscode', '.vscode-test', 'target', 'dist', 'build', 'out', 'release', '.next', '.nuxt', '.output', '.turbo', '.cache', '.parcel-cache', '.dart_tool', '.gradle', '.mvn', '.pytest_cache', '.mypy_cache', '__pycache__', '.venv', 'venv', 'coverage', '.nyc_output', 'unpackage', '.umi', '.angular', 'bower_components', 'jspm_packages', 'Pods', '.terraform'])
  const SOURCE_EXT = new Set(['.java', '.kt', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte', '.py', '.go', '.rs', '.c', '.h', '.cpp', '.hpp', '.cs', '.php', '.rb', '.scala', '.swift', '.sh'])
  const CONFIG_EXT = new Set(['.json', '.yaml', '.yml', '.toml', '.xml', '.properties', '.gradle', '.ini', '.conf', '.md'])
  const MANIFEST_NAMES = new Set(['package.json', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle', 'go.mod', 'requirements.txt', 'pyproject.toml', 'Cargo.toml', 'setup.py', 'composer.json', 'Gemfile', 'pubspec.yaml'])
  const DOC_NAMES = new Set(['readme.md', 'dockerfile', 'makefile', 'license', 'changelog.md'])
  const MAX_ENTRIES = 30000
  const MAX_SOURCE = 2000
  const MAX_CONFIG = 300
  const MAX_BYTES = 400000
  const MAX_NODES = 240
  const MAX_EDGES = 900
  const IDENT = '[A-Za-z_$][A-Za-z0-9_$]*'
  const RESOLVE_EXT = ['', '.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte', '.mjs', '.cjs', '.json', '.scss', '.css', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.yml', '.yaml', '.md', '.java', '.py', '.go']
  const TECH_TAGS = ['spring-boot', 'spring', 'mybatis', 'redis', 'mysql', 'postgres', 'mongodb', 'security', 'jwt', 'vue', 'react', 'pinia', 'vuex', 'element-plus', 'ant-design', 'antd', 'tailwind', 'typescript', 'vite', 'webpack', 'next', 'nuxt', 'express', 'nest', 'fastapi', 'flask', 'django', 'axios', 'swagger', 'knife4j', 'minio', 'docker', 'nginx', 'kafka', 'rabbitmq', 'elasticsearch', 'maven', 'gradle', 'node', 'python', 'sqlite', 'caffeine', 'quartz', 'websocket', 'openapi', 'lombok', 'hutool', 'mapstruct', 'h2']

  function norm(p) {
    let s = String(p || '').trim()
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1)
    s = s.replace(/\\/g, '/')
    while (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1)
    return s
  }
  function slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  }
  function extOf(name) {
    const i = name.lastIndexOf('.')
    return i >= 0 ? name.slice(i).toLowerCase() : ''
  }
  function basenameOf(rel) {
    const i = rel.lastIndexOf('/')
    return i >= 0 ? rel.slice(i + 1) : rel
  }
  function dirOf(rel) {
    const i = rel.lastIndexOf('/')
    return i >= 0 ? rel.slice(0, i) : ''
  }
  function isManifestName(name) {
    const n = name.toLowerCase()
    return MANIFEST_NAMES.has(n) || n.endsWith('.csproj')
  }

  function classifyKind(rel, ext) {
    const segs = rel.split('/')
    const s = {}
    for (const seg of segs) s[seg] = true
    const base = basenameOf(rel).toLowerCase()
    if (s.controller || s.controllers) return 'controller'
    if (s.service || s.services || s.serviceimpl || s.servicesimpl) return 'service'
    if (s.mapper || s.mappers || s.dao || s.repository || s.repositories) return 'mapper'
    if (s.entity || s.entities || s.model || s.models || s.pojo || s.pojos) return 'entity'
    if (s.dto || s.dtos) return 'dto'
    if (s.vo || s.vos) return 'vo'
    if (s.input || s.inputs || s.request || s.requests || s.param || s.params || s.query || s.queries) return 'input'
    if (s.domain || s.domains) return 'domain'
    if (s.pages || s.page || s.views || s.view) return 'pages'
    if (s.components || s.component) return 'components'
    if (s.layouts || s.layout) return 'layouts'
    if (s.router || s.routers) return 'router'
    if (s.store || s.stores || s.state || s.states) return 'store'
    if (s.api || s.apis || s.http) return 'api'
    if (s.composables || s.composable || s.hooks) return 'composable'
    if (s.constants || s.constant || s.enums || s.enum) return 'constant'
    if (s.assets || s.static || s.public || s.fonts || s.styles || s.images || s.img || s.icon || s.icons || s.iconfonts) return 'assets'
    if (s.test || s.tests || s.__tests__ || s.spec) return 'test'
    if (s.config || s.configuration || s.settings) return 'config'
    if (s.common || s.base || s.util || s.utils || s.helper || s.helpers || s.support) return 'util'
    if (s.exception || s.exceptions || s.error || s.errors) return 'exception'
    if (base.indexOf('openapi') !== -1) return 'config'
    if (base.indexOf('config') !== -1) return 'config'
    if (ext === '.java' || ext === '.kt') {
      if (base.endsWith('application.java') || base === 'main.java' || base.endsWith('bootstrap.java')) return 'entry'
    }
    if (ext === '.ts' || ext === '.js' || ext === '.tsx' || ext === '.jsx') {
      if (base === 'main.ts' || base === 'main.js' || base === 'main.tsx' || base === 'main.jsx' || base === 'index.ts' || base === 'index.js') return 'entry'
    }
    if (ext === '.vue' && base === 'app.vue') return 'entry'
    if (ext === '.py' && (base === 'main.py' || base === 'app.py' || base === 'manage.py')) return 'entry'
    if (ext === '.go' && base === 'main.go') return 'entry'
    if (ext === '.md' || ext === '.json' || ext === '.yml' || ext === '.yaml' || ext === '.xml' || ext === '.properties' || ext === '.toml' || ext === '.ini' || ext === '.conf' || ext === '.gradle') return 'config'
    return 'other'
  }

  function parseSource(text, ext) {
    const rec = { imports: [], exports: [], annotations: [], fqn: '', className: '', packageName: '', hasDefaultExport: false }
    if (ext === '.java' || ext === '.kt') {
      const pm = text.match(/package[ ]+([A-Za-z0-9_.]+)[ ]*;/)
      if (pm) rec.packageName = pm[1]
      const cm = text.match(new RegExp('(?:public[ ]+)?(?:abstract[ ]+|final[ ]+)?(?:class|interface|enum|record)[ ]+' + IDENT))
      if (cm) {
        const parts = cm[0].split(' ')
        rec.className = parts[parts.length - 1]
      }
      if (rec.packageName && rec.className) rec.fqn = rec.packageName + '.' + rec.className
      const am = text.match(/@[A-Za-z][A-Za-z0-9_]*/g)
      if (am) {
        for (let i = 0; i < am.length && rec.annotations.length < 14; i++) rec.annotations.push(am[i].slice(1))
      }
      const im = text.match(/^[ ]*import[ ]+(?:static[ ]+)?[A-Za-z0-9_.]+[ ]*;/gm)
      if (im) {
        for (let i = 0; i < im.length && rec.imports.length < 200; i++) {
          const spec = im[i].replace(/^[ ]*import[ ]+/, '').replace(/[ ]*;$/, '').replace(/^static[ ]+/, '')
          rec.imports.push({ spec: spec, kind: 'fqcn' })
        }
      }
      const em = text.match(/extends[ ]+([A-Za-z0-9_.]+)/)
      if (em) rec.superType = em[1]
    } else if (ext === '.py') {
      const im = text.match(/^[ ]*(?:from[ ]+[A-Za-z0-9_.]+[ ]+import[ ]+|import[ ]+[A-Za-z0-9_.]+)/gm)
      if (im) {
        for (let i = 0; i < im.length && rec.imports.length < 200; i++) {
          const m = im[i].match(/from[ ]+([A-Za-z0-9_.]+)[ ]+import|import[ ]+([A-Za-z0-9_.]+)/)
          if (m) rec.imports.push({ spec: m[1] || m[2], kind: 'python' })
        }
      }
    } else {
      const im = text.match(/import[ ]+(?:[^'"]+?[ ]+from[ ]+)?['"][^'"]+['"]/g)
      if (im) {
        for (let i = 0; i < im.length && rec.imports.length < 200; i++) {
          const m = im[i].match(/['"][^'"]+['"]/)
          if (m) rec.imports.push({ spec: m[0].slice(1, -1), kind: 'module' })
        }
      }
      const rr = text.match(/require\([ ]*['"][^'"]+['"][ ]*\)/g)
      if (rr) {
        for (let i = 0; i < rr.length && rec.imports.length < 200; i++) {
          const m = rr[i].match(/['"][^'"]+['"]/)
          if (m) rec.imports.push({ spec: m[0].slice(1, -1), kind: 'module' })
        }
      }
      if (text.indexOf('export default') !== -1) rec.hasDefaultExport = true
      const ex = text.match(/^export[ ]+(?:default[ ]+)?(?:function|class|const|let|var)[ ]+[A-Za-z_$][A-Za-z0-9_$]*/gm)
      if (ex) {
        for (let i = 0; i < ex.length && rec.exports.length < 12; i++) {
          const parts = ex[i].split(' ')
          rec.exports.push(parts[parts.length - 1])
        }
      }
    }
    return rec
  }

  function resolveModuleSpec(spec, baseDir, aliasMap) {
    let p = spec
    const q = p.indexOf('?')
    if (q >= 0) p = p.slice(0, q)
    if (p.startsWith('~@/')) {
      const alias = aliasMap['@']
      if (!alias) return null
      p = alias + p.slice(3)
    } else if (p.startsWith('@/') || p.startsWith('~/') || p.startsWith('@@/')) {
      const key = p.startsWith('@@/') ? '@@' : p[0]
      const alias = aliasMap[key]
      if (!alias) return null
      p = alias + p.slice(key.length + 1)
    } else if (p.startsWith('./') || p.startsWith('../')) {
      const parts = baseDir ? baseDir.split('/') : []
      for (const seg of p.split('/')) {
        if (seg === '.' || seg === '') continue
        if (seg === '..') { if (parts.length > 0) parts.pop() } else parts.push(seg)
      }
      p = parts.join('/')
    } else if (p.startsWith('/')) {
      p = p.slice(1)
    } else {
      return null
    }
    return p
  }

  function lookupPath(p, pathSets) {
    const tries = [p]
    for (const e of RESOLVE_EXT) if (e) tries.push(p + e)
    for (const e of ['', '.ts', '.tsx', '.js', '.jsx', '.vue', '.json']) tries.push(p + '/index' + e)
    tries.push(p + '/__init__.py')
    for (const cand of tries) {
      const c = cand.toLowerCase()
      for (const ps of pathSets) {
        const hit = ps.lowerMap.get(c)
        if (hit) return { moduleId: ps.moduleId, rel: hit }
      }
    }
    return null
  }

  async function walkDir(dirTarget, dirPath, limits, out) {
    let entries
    try { entries = await fs.listDir(dirTarget) } catch { return }
    for (const entry of entries) {
      if (out.entries >= limits.maxEntries) { out.truncated = true; return }
      out.entries = out.entries + 1
      const childPath = dirPath + '/' + entry.name
      if (entry.type === 'directory') {
        if (SKIP_DIRS.has(entry.name)) { out.skipped = out.skipped + 1; continue }
        await walkDir(entry.target, childPath, limits, out)
      } else if (entry.type === 'file') {
        const ext = extOf(entry.name)
        if (SOURCE_EXT.has(ext)) {
          if (out.sourceFiles.length >= limits.maxSource) { out.truncated = true; continue }
          out.sourceFiles.push({ path: childPath, name: entry.name, target: entry.target, size: entry.size || 0 })
        } else if (CONFIG_EXT.has(ext) || isManifestName(entry.name)) {
          if (out.configFiles.length < limits.maxConfig) out.configFiles.push({ path: childPath, name: entry.name, target: entry.target, size: entry.size || 0 })
        } else {
          out.otherFiles = out.otherFiles + 1
        }
      }
    }
  }

  async function readSource(entry, rel) {
    if (entry.size > MAX_BYTES) return null
    let text
    try { text = await fs.readText(entry.target) } catch { return null }
    if (text.length > MAX_BYTES) return null
    const ext = extOf(entry.name)
    return {
      rel: rel, dir: dirOf(rel), base: basenameOf(rel), ext: ext,
      kind: classifyKind(rel, ext), rec: parseSource(text, ext), size: text.length
    }
  }

  function summarizeManifests(mod) {
    const summary = { name: '', description: '', deps: [], scripts: [], readme: '', dockerFrom: '', javaVersion: '' }
    for (const m of mod.manifests) {
      const n = m.name.toLowerCase()
      if (n === 'package.json') {
        try {
          const j = JSON.parse(m.text)
          if (j.name) summary.name = j.name
          if (j.description) summary.description = j.description
          const deps = Object.keys(j.dependencies || {})
          for (const d of deps) summary.deps.push(d)
          for (const d of Object.keys(j.devDependencies || {})) summary.deps.push(d)
          const scripts = Object.keys(j.scripts || {})
          for (let i = 0; i < scripts.length && i < 16; i++) {
            summary.scripts.push(scripts[i] + ': ' + String(j.scripts[scripts[i]]).slice(0, 60))
          }
        } catch { /* ignore */ }
      } else if (n === 'pom.xml') {
        const arts = []
        const re = /<artifactId>([^<]+)<\/artifactId>/g
        let a
        while ((a = re.exec(m.text)) && arts.length < 40) arts.push(a[1])
        if (arts.length > 0 && !summary.name) summary.name = arts[0]
        for (let i = 1; i < arts.length; i++) summary.deps.push(arts[i])
        const jv = m.text.match(/<java.version>([^<]+)<\/java.version>/)
        if (jv) summary.javaVersion = jv[1]
      } else if (n === 'readme.md') {
        const lines = m.text.split('\n').map(function (s) { return s.trim() }).filter(Boolean)
        summary.readme = lines.slice(0, 10).join(' | ').slice(0, 500)
      } else if (n === 'dockerfile') {
        const fm = m.text.match(/FROM[ ]+([A-Za-z0-9._:/@-]+)/)
        if (fm) summary.dockerFrom = fm[1]
      } else if (n === 'go.mod') {
        const gm = m.text.match(/^module[ ]+([A-Za-z0-9._/-]+)/m)
        if (gm) summary.name = gm[1]
        const dm = m.text.match(/^[ ]*([A-Za-z0-9._/-]+)[ ]+v[0-9]/gm)
        if (dm) {
          for (let i = 0; i < dm.length && summary.deps.length < 40; i++) {
            summary.deps.push(dm[i].trim().split(' ')[0])
          }
        }
      } else if (n === 'requirements.txt' || n === 'pyproject.toml') {
        const dm = m.text.match(/^[ ]*([A-Za-z0-9_.-]+)[=<>!~]/gm)
        if (dm) {
          for (let i = 0; i < dm.length && summary.deps.length < 40; i++) {
            summary.deps.push(dm[i].trim().replace(/[=<>!~].*$/, ''))
          }
        }
      }
    }
    const seen = {}
    const deps = []
    for (const d of summary.deps) {
      if (!seen[d] && deps.length < 80) { seen[d] = true; deps.push(d) }
    }
    summary.deps = deps
    return summary
  }

  function tagsOf(summary) {
    const blob = (summary.deps || []).join(' ') + ' ' + (summary.scripts || []).join(' ') + ' ' + (summary.name || '') + ' ' + (summary.javaVersion || '') + ' ' + (summary.dockerFrom || '')
    const lower = blob.toLowerCase()
    const tags = []
    for (const t of TECH_TAGS) {
      if (lower.indexOf(t) !== -1 && tags.indexOf(t) === -1) tags.push(t)
    }
    return tags
  }

  function techLabel(tags) {
    if (tags.indexOf('spring') !== -1) return 'Spring Boot (Java)'
    if (tags.indexOf('vue') !== -1) return tags.indexOf('vite') !== -1 ? 'Vue 3 + Vite' : 'Vue'
    if (tags.indexOf('react') !== -1) return 'React'
    if (tags.indexOf('next') !== -1) return 'Next.js'
    if (tags.indexOf('nuxt') !== -1) return 'Nuxt'
    if (tags.indexOf('fastapi') !== -1) return 'FastAPI (Python)'
    if (tags.indexOf('django') !== -1) return 'Django (Python)'
    if (tags.indexOf('flask') !== -1) return 'Flask (Python)'
    if (tags.indexOf('go') !== -1) return 'Go'
    if (tags.indexOf('node') !== -1) return 'Node.js'
    return '未识别'
  }

  function buildModuleView(mod) {
    const degree = new Map()
    for (const f of mod.files) {
      if (f.imports.length > 0) degree.set(f.id, (degree.get(f.id) || 0) + 1)
      for (const t of f.imports) degree.set(t, (degree.get(t) || 0) + 1)
    }
    let keep = mod.files
    let truncated = false
    if (mod.files.length > MAX_NODES) {
      keep = mod.files.slice().sort(function (a, b) {
        return (degree.get(b.id) || 0) - (degree.get(a.id) || 0)
      }).slice(0, MAX_NODES)
      truncated = true
    }
    const kept = new Set()
    for (const f of keep) kept.add(f.id)
    const kindCounts = {}
    const nodes = []
    for (const f of keep) {
      kindCounts[f.kind] = (kindCounts[f.kind] || 0) + 1
      nodes.push({ id: f.id, label: f.base, path: f.rel, kind: f.kind, deg: degree.get(f.id) || 0, ext: f.ext })
    }
    const edges = []
    const seen = new Set()
    for (const f of keep) {
      for (const t of f.imports) {
        if (!kept.has(t)) continue
        const key = f.id + '>' + t
        if (seen.has(key) || edges.length >= MAX_EDGES) continue
        seen.add(key)
        edges.push({ from: f.id, to: t, kind: 'import' })
      }
    }
    return { nodes: nodes, edges: edges, kindCounts: kindCounts, truncated: truncated }
  }

  function entryPoints(mod) {
    const eps = []
    for (const f of mod.files) {
      if (f.kind === 'entry' || (f.rec.annotations && f.rec.annotations.indexOf('SpringBootApplication') !== -1)) {
        eps.push(f.rel)
        if (eps.length >= 4) break
      }
    }
    return eps
  }

  function buildObservations(views) {
    const obs = []
    const be = views.filter(function (v) { return v.kind === 'backend' })
    const fe = views.filter(function (v) { return v.kind === 'frontend' })
    if (fe.length >= 2) {
      const a = fe[0], b = fe[1]
      const overlap = a.deps.filter(function (d) { return b.deps.indexOf(d) !== -1 }).length
      const min = Math.min(a.deps.length, b.deps.length)
      if (min > 0) obs.push('前端模块依赖重叠 ' + Math.round(overlap / min * 100) + '% (' + a.name + ' / ' + b.name + '), 可评估共享与复用')
    }
    for (const v of be) {
      obs.push(v.name + ': 后端入口 ' + (v.entryPoints[0] || '未识别'))
      const layers = []
      if (v.kindCounts.controller) layers.push('controller ' + v.kindCounts.controller)
      if (v.kindCounts.service) layers.push('service ' + v.kindCounts.service)
      if (v.kindCounts.mapper) layers.push('mapper ' + v.kindCounts.mapper)
      if (v.kindCounts.entity) layers.push('entity ' + v.kindCounts.entity)
      if (layers.length >= 2) obs.push(v.name + ': 分层架构 ' + layers.join(' -> '))
      if (v.tags.indexOf('mybatis') !== -1) obs.push(v.name + ': ORM 为 MyBatis(Plus)')
      if (v.tags.indexOf('redis') !== -1) obs.push(v.name + ': 使用 Redis 缓存')
      if (v.tags.indexOf('security') !== -1 || v.tags.indexOf('jwt') !== -1) obs.push(v.name + ': 含认证/安全相关依赖')
      if (v.tags.indexOf('websocket') !== -1) obs.push(v.name + ': 使用 WebSocket')
      if (v.tags.indexOf('minio') !== -1) obs.push(v.name + ': 使用 MinIO 对象存储')
    }
    for (const v of fe) {
      obs.push(v.name + ': 前端入口 ' + (v.entryPoints[0] || '未识别'))
      if (v.kindCounts.pages) obs.push(v.name + ': 页面 ' + v.kindCounts.pages + ' 个, 组件 ' + (v.kindCounts.components || 0) + ' 个')
      if (v.kindCounts.router) obs.push(v.name + ': 配置了前端路由')
      if (v.tags.indexOf('pinia') !== -1 || v.tags.indexOf('vuex') !== -1) obs.push(v.name + ': 集中状态管理 ' + (v.tags.indexOf('pinia') !== -1 ? 'Pinia' : 'Vuex'))
      if (v.tags.indexOf('element-plus') !== -1 || v.tags.indexOf('ant-design') !== -1 || v.tags.indexOf('antd') !== -1) obs.push(v.name + ': 使用组件库 UI')
      if (v.tags.indexOf('axios') !== -1) obs.push(v.name + ': HTTP 客户端为 axios')
      if (v.tags.indexOf('openapi') !== -1) obs.push(v.name + ': 含 openapi 配置, API 层可由后端契约生成')
    }
    if (obs.length === 0) obs.push('未识别出明显架构特征, 建议人工查看模块文件清单')
    return obs.slice(0, 20)
  }

  async function scanProject(path) {
    const rootTarget = await fs.resolve(path)
    const rootInfo = await fs.stat(rootTarget)
    if (!rootInfo) throw new Error('路径不存在')
    if (rootInfo.type !== 'directory') throw new Error('不是目录: ' + path)
    const rootPath = norm(rootTarget.displayPath || path)
    const rootEntries = await fs.listDir(rootTarget)
    const rootHasManifest = rootEntries.some(function (e) { return isManifestName(e.name) })
    const moduleRoots = []
    if (rootHasManifest) {
      moduleRoots.push({ id: slug(basenameOf(rootPath)), name: basenameOf(rootPath), root: rootPath })
    } else {
      for (const e of rootEntries) {
        if (e.type !== 'directory' || SKIP_DIRS.has(e.name)) continue
        let childEntries
        try { childEntries = await fs.listDir(e.target) } catch { continue }
        if (childEntries.some(function (c) { return isManifestName(c.name) })) {
          moduleRoots.push({ id: slug(e.name), name: e.name, root: rootPath + '/' + e.name })
        }
      }
    }
    if (moduleRoots.length === 0) moduleRoots.push({ id: 'root', name: basenameOf(rootPath), root: rootPath })

    const modules = []
    const pathSets = []
    const classIndex = new Map()
    const fileById = new Map()
    let totalEntries = 0
    let totalSkipped = 0
    let anyTruncated = false

    for (const mr of moduleRoots) {
      const out = { entries: 0, skipped: 0, dirCount: 0, otherFiles: 0, sourceFiles: [], configFiles: [], truncated: false }
      const modTarget = await fs.resolve(mr.root)
      await walkDir(modTarget, mr.root, { maxEntries: MAX_ENTRIES, maxSource: MAX_SOURCE, maxConfig: MAX_CONFIG }, out)
      totalEntries += out.entries
      totalSkipped += out.skipped
      if (out.truncated) anyTruncated = true
      const lowerMap = new Map()
      const files = []
      for (const sf of out.sourceFiles) {
        const rel = sf.path.slice(mr.root.length + 1)
        const rec = await readSource(sf, rel)
        if (!rec) continue
        const id = mr.id + '::' + rel
        rec.id = id
        rec.moduleId = mr.id
        rec.absPath = norm(sf.target.displayPath || (mr.root + '/' + rel))
        rec.imports = []
        rec.externals = []
        files.push(rec)
        lowerMap.set(rel.toLowerCase(), rel)
        fileById.set(id, rec)
        if (rec.rec.fqn) classIndex.set(rec.rec.fqn, id)
      }
      const manifests = []
      for (const cf of out.configFiles) {
        const base = cf.name.toLowerCase()
        if (!MANIFEST_NAMES.has(base) && !DOC_NAMES.has(base)) continue
        if (cf.size > 200000) continue
        let text
        try { text = await fs.readText(cf.target) } catch { continue }
        manifests.push({ name: cf.name, rel: cf.path.slice(mr.root.length + 1), text: text })
      }
      const aliasMap = { '@': 'src', '~': 'src', '@@': 'src' }
      const hasSrc = out.sourceFiles.some(function (sf) { return sf.path.indexOf('/src/') !== -1 })
      if (!hasSrc) { aliasMap['@'] = null; aliasMap['~'] = null; aliasMap['@@'] = null }
      modules.push({ id: mr.id, name: mr.name, root: mr.root, files: files, lowerMap: lowerMap, aliasMap: aliasMap, manifests: manifests, out: out })
      pathSets.push({ moduleId: mr.id, lowerMap: lowerMap })
    }

    for (const mod of modules) {
      const others = pathSets.filter(function (ps) { return ps.moduleId !== mod.id })
      const sets = [{ moduleId: mod.id, lowerMap: mod.lowerMap }].concat(others)
      for (const f of mod.files) {
        for (const imp of f.rec.imports) {
          let target = null
          if (imp.kind === 'fqcn') {
            const hit = classIndex.get(imp.spec)
            if (hit) target = fileById.get(hit)
          } else {
            let hit = null
            const p = resolveModuleSpec(imp.spec, f.dir, mod.aliasMap)
            if (p) hit = lookupPath(p, sets)
            if (!hit && imp.kind === 'python' && imp.spec.indexOf('.') !== -1) {
              hit = lookupPath(imp.spec.split('.').join('/'), sets)
            }
            if (!hit && f.ext === '.go' && imp.spec.indexOf('/') !== -1) {
              hit = lookupPath(imp.spec, sets)
            }
            if (hit) target = fileById.get(hit.moduleId + '::' + hit.rel)
          }
          if (!target) {
            if (f.externals.indexOf(imp.spec) === -1 && f.externals.length < 60) f.externals.push(imp.spec)
          } else {
            if (f.imports.indexOf(target.id) === -1) f.imports.push(target.id)
            if (target.moduleId !== mod.id) {
              const cross = mod.cross || (mod.cross = {})
              cross[target.moduleId] = (cross[target.moduleId] || 0) + 1
            }
          }
        }
      }
    }

    const views = []
    const stackTags = []
    for (const mod of modules) {
      const summary = summarizeManifests(mod)
      const tags = tagsOf(summary)
      if (mod.manifests.some(function (m) { return m.name === 'go.mod' }) && tags.indexOf('go') === -1) tags.push('go')
      if (mod.manifests.some(function (m) { return m.name === 'package.json' }) && tags.indexOf('node') === -1) tags.push('node')
      if (mod.manifests.some(function (m) { return m.name === 'requirements.txt' || m.name === 'pyproject.toml' }) && tags.indexOf('python') === -1) tags.push('python')
      for (const t of tags) if (stackTags.indexOf(t) === -1) stackTags.push(t)
      const kind = (tags.indexOf('vue') !== -1 || tags.indexOf('react') !== -1 || tags.indexOf('next') !== -1 || tags.indexOf('nuxt') !== -1 || tags.indexOf('vite') !== -1 || tags.indexOf('webpack') !== -1 || tags.indexOf('pinia') !== -1 || tags.indexOf('vuex') !== -1)
        ? 'frontend'
        : ((tags.indexOf('spring') !== -1 || tags.indexOf('maven') !== -1 || tags.indexOf('gradle') !== -1 || tags.indexOf('mybatis') !== -1 || summary.javaVersion) ? 'backend' : 'other')
      const gv = buildModuleView(mod)
      views.push({
        id: mod.id, name: mod.name, root: mod.root, kind: kind, tech: techLabel(tags), tags: tags,
        deps: summary.deps, scripts: summary.scripts, readme: summary.readme, dockerFrom: summary.dockerFrom, javaVersion: summary.javaVersion,
        entryPoints: entryPoints(mod), fileCount: mod.files.length, kindCounts: gv.kindCounts,
        nodes: gv.nodes, edges: gv.edges, truncated: gv.truncated,
        cross: mod.cross || {}
      })
    }

    const obs = buildObservations(views)
    const moduleNodes = [{ id: 'root', label: basenameOf(rootPath), kind: 'root' }]
    const moduleEdges = []
    const seenE = new Set()
    for (const v of views) {
      moduleNodes.push({ id: v.id, label: v.name, kind: v.kind })
      moduleEdges.push({ from: 'root', to: v.id, kind: 'contains' })
      for (const otherId of Object.keys(v.cross)) {
        const key = v.id + '>' + otherId
        if (!seenE.has(key)) { seenE.add(key); moduleEdges.push({ from: v.id, to: otherId, kind: 'import', count: v.cross[otherId] }) }
      }
    }
    const totalSource = views.reduce(function (n, v) { return n + v.fileCount }, 0)
    const data = {
      root: rootPath,
      scannedAt: new Date().toISOString(),
      stats: { modules: views.length, sourceFiles: totalSource, entries: totalEntries, skipped: totalSkipped, truncated: anyTruncated },
      techStack: stackTags.slice(0, 40),
      modules: views,
      moduleGraph: { nodes: moduleNodes, edges: moduleEdges },
      observations: obs
    }
    return { data: data, files: fileById }
  }

  async function runScan(input) {
    try {
      const path = norm(input && input.path)
      if (!path) return { error: '请提供项目路径 (path)' }
      const key = path.toLowerCase()
      if (!(input && input.force) && cache.has(key)) return cache.get(key)
      const result = await scanProject(path)
      cache.set(key, result.data)
      fileCache.set(key, result.files)
      return result.data
    } catch (e) {
      return { error: String(e && e.message || e) }
    }
  }

  async function runDetail(args) {
    try {
      const path = norm(args && args.path)
      const id = String((args && args.id) || '')
      if (!path || !id) return { error: '缺少 path 或 id' }
      const files = fileCache.get(path.toLowerCase())
      if (!files) return { error: '请先扫描该路径' }
      const f = files.get(id)
      if (!f) return { error: '未找到文件: ' + id }
      const target = await fs.resolve(f.absPath)
      const text = await fs.readText(target)
      const head = text.split('\n').slice(0, 26).join('\n').slice(0, 3000)
      return { id, path: f.rel, kind: f.kind, head, imports: f.imports, externals: f.externals }
    } catch (e) {
      return { error: String(e && e.message || e) }
    }
  }

  // ---- 模型工具: project_kgraph ----
  const tool = defineTool({
    name: 'project_kgraph',
    description: 'Scan a project directory READ-ONLY and return its knowledge graph: modules, tech stack, architecture layers, file-level import graphs, and observations. Call it to understand a codebase architecture before planning changes.',
    parameters: {
      path: { type: 'string', required: true, description: 'Absolute path of the project directory to analyze.' },
      force: { type: 'boolean', description: 'Rescan even when a cached result exists.' }
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }]
    },
    execute: async (args) => runScan(args),
  })
  ctx.tools.register(tool)

  // ---- 浏览器 UI 数据通道 (供 client bundle fetch) ----
  const webServer = ctx.get('webServer')
  if (webServer !== undefined) {
    const sendJson = (res, status, body) => {
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(body))
    }
    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: '/api/kgraph/scan',
      handler: async (req, res) => {
        try {
          const u = new URL(req.url || '/', 'http://localhost')
          const path = norm(u.searchParams.get('path'))
          if (!path) return sendJson(res, 400, { error: '缺少 path 参数' })
          sendJson(res, 200, await runScan({ path }))
        } catch (e) {
          sendJson(res, 500, { error: String(e && e.message || e) })
        }
      },
    }))
    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: '/api/kgraph/detail',
      handler: async (req, res) => {
        try {
          const u = new URL(req.url || '/', 'http://localhost')
          const path = norm(u.searchParams.get('path'))
          const id = String(u.searchParams.get('id') || '')
          if (!path || !id) return sendJson(res, 400, { error: '缺少 path 或 id 参数' })
          sendJson(res, 200, await runDetail({ path, id }))
        } catch (e) {
          sendJson(res, 500, { error: String(e && e.message || e) })
        }
      },
    }))
  }

  console.log('[kgraph-plugin] loaded (project_kgraph tool + web UI routes)')
}
