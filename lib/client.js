// dsh-kgraph-plugin 浏览器端 (client bundle)
// 标准 web 插件协议: window.__ModuleLoader__.load({ id, factory })
// 数据通道: 同源 fetch → /api/kgraph/scan 与 /api/kgraph/detail (Host webServer 路由)
window.__ModuleLoader__.load({
  id: 'dsh-kgraph-plugin',
  factory: (require) => {
    'use strict'

    const NAME = 'kgraph-client'
    const API = '/api/kgraph'

    const KIND_COLORS = {
      root: '#1e293b', backend: '#0369a1', frontend: '#7c3aed', other: '#64748b',
      entry: '#16a34a', controller: '#dc2626', service: '#0284c7', mapper: '#7c3aed', entity: '#d97706',
      dto: '#0d9488', vo: '#0d9488', input: '#0d9488', domain: '#0d9488', config: '#57534e',
      util: '#65a30d', exception: '#b91c1c', pages: '#ea580c', components: '#0891b2', layouts: '#4f46e5',
      router: '#2563eb', store: '#9333ea', api: '#db2777', composable: '#0e7490', constant: '#a16207',
      assets: '#78716c', test: '#4b5563'
    }
    const BACKEND_ORDER = ['entry', 'controller', 'service', 'mapper', 'entity', 'dto', 'vo', 'input', 'domain', 'config', 'util', 'exception', 'constant', 'test', 'other']
    const FRONTEND_ORDER = ['entry', 'router', 'store', 'api', 'pages', 'layouts', 'components', 'composable', 'config', 'constant', 'util', 'assets', 'test', 'other']
    const GENERIC_ORDER = ['entry', 'config', 'src', 'test', 'other']

    const CSS = `.kg-panel{position:fixed;right:16px;bottom:16px;width:480px;max-width:calc(100vw - 32px);max-height:74vh;display:flex;flex-direction:column;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);font-family:system-ui,'Microsoft YaHei',sans-serif;font-size:13px;z-index:9999;overflow:hidden}
.kg-panel.kg-full{inset:10px;width:auto;max-width:none;max-height:none}
.kg-panel.kg-collapsed{width:44px!important;min-width:44px;max-width:44px}
.kg-panel.kg-collapsed .kg-head{justify-content:center;padding:6px 4px;border-bottom:none}
.kg-panel.kg-full .kg-body{flex:1}
.kg-panel.kg-full .kg-scroll{max-height:calc(100vh - 210px)}
.kg-head{display:flex;gap:6px;align-items:center;padding:8px 10px;border-bottom:1px solid #1e293b;background:#0b1220;flex-wrap:wrap}
.kg-title{font-weight:600;font-size:13px;white-space:nowrap}
.kg-input{flex:1;min-width:90px;padding:4px 7px;border-radius:6px;border:1px solid #334155;background:#1e293b;color:inherit;font-size:12px}
.kg-btn{padding:4px 8px;border-radius:6px;border:1px solid #334155;background:#3b82f6;color:#fff;cursor:pointer;font-size:11px;white-space:nowrap;line-height:1.4}
.kg-btn-ghost{background:transparent;color:inherit}
.kg-btn:disabled{opacity:.5;cursor:default}
.kg-fold,.kg-full-btn{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:13px;padding:2px 6px;line-height:1}
.kg-fold:hover,.kg-full-btn:hover{color:#e2e8f0}
.kg-body{overflow:auto;padding:12px}
.kg-status,.kg-error{font-size:12px;margin:6px 0;color:#94a3b8}
.kg-error{color:#f87171}
.kg-hint{font-size:12px;color:#94a3b8;background:#1e293b;border:1px dashed #334155;border-radius:8px;padding:10px;line-height:1.8}
.kg-stats{display:flex;gap:14px;font-size:12px;color:#94a3b8;margin-bottom:8px}
.kg-tech{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;align-items:center}
.kg-tech-label{font-size:12px;color:#94a3b8}
.kg-tech-chip{font-size:11px;padding:2px 8px;border-radius:999px;background:#1e293b;border:1px solid #334155}
.kg-modgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.kg-modcard{border:1px solid #334155;border-radius:8px;padding:8px;background:#1e293b;cursor:pointer}
.kg-modcard:hover{border-color:#3b82f6}
.kg-modhead{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:4px}
.kg-modname{font-weight:600;font-size:12px}
.kg-modtech{font-size:11px;color:#94a3b8}
.kg-modkind{font-size:10px;padding:1px 6px;border-radius:999px;color:#fff;text-transform:uppercase}
.kg-modentry{font-size:11px;color:#94a3b8;word-break:break-all}
.kg-legend{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}
.kg-chip{font-size:11px;padding:2px 7px;border-radius:999px;background:#1e293b;border:1px solid #334155;display:inline-flex;align-items:center;gap:4px}
.kg-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.kg-sec{font-weight:600;font-size:13px;margin:12px 0 6px}
.kg-svg{display:block;border:1px solid #334155;border-radius:8px;background:#1e293b}
.kg-node{cursor:pointer}
.kg-scroll{overflow:auto;max-height:420px}
.kg-obs{font-size:12px;margin:4px 0 0 18px;line-height:1.7;padding-left:0}
.kg-detail{margin-top:10px;border:1px solid #334155;border-radius:8px;padding:8px}
.kg-pre{font-size:11px;white-space:pre-wrap;word-break:break-all;max-height:240px;overflow:auto;margin:4px 0 0;color:#cbd5e1}`

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    }
    function trunc(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s }

    function moduleOrder(kind) {
      return kind === 'backend' ? BACKEND_ORDER : (kind === 'frontend' ? FRONTEND_ORDER : GENERIC_ORDER)
    }

    function legendHtml(counts) {
      const keys = Object.keys(counts || {})
      if (keys.length === 0) return ''
      return '<div class="kg-legend">' + keys.map((k) =>
        `<span class="kg-chip"><span class="kg-dot" style="background:${KIND_COLORS[k] || '#64748b'}"></span>${esc(k)} ${counts[k]}</span>`
      ).join('') + '</div>'
    }

    function graphSvg(nodes, edges, colors, order, selectedId) {
      if (!nodes || nodes.length === 0) return '<div class="kg-status">无节点</div>'
      const NODE_W = 168, NODE_H = 30, COL_W = 208, ROW_H = 46, PAD = 14
      const columns = {}
      for (const n of nodes) { (columns[n.kind] || (columns[n.kind] = [])).push(n) }
      const present = Object.keys(columns)
      const ordered = order.filter((k) => columns[k]).concat(present.filter((k) => order.indexOf(k) === -1))
      const colX = {}
      let x = PAD
      for (const k of ordered) { colX[k] = x; x += COL_W }
      const pos = {}
      let maxRows = 1
      for (const k of ordered) {
        const col = columns[k]
        for (let i = 0; i < col.length; i++) pos[col[i].id] = { x: colX[k], y: PAD + 10 + i * ROW_H }
        maxRows = Math.max(maxRows, col.length)
      }
      const W = Math.max(x + PAD, 360)
      const H = maxRows * ROW_H + PAD * 2 + 24
      const edgeSvg = edges.map((e) => {
        const a = pos[e.from], b = pos[e.to]
        if (!a || !b) return ''
        const sx = a.x + NODE_W, sy = a.y + NODE_H / 2
        const tx = b.x, ty = b.y + NODE_H / 2
        const cx = (sx + tx) / 2
        return `<path d="M ${sx} ${sy} C ${cx} ${sy}, ${cx} ${ty}, ${tx} ${ty}" stroke="${e.kind === 'contains' ? '#94a3b8' : '#60a5fa'}" stroke-width="1.2" fill="none" opacity="0.75" marker-end="url(#kg-arrow)"></path>`
      }).join('')
      const nodeSvg = nodes.map((n) => {
        const p = pos[n.id]
        if (!p) return ''
        const color = colors[n.kind] || '#64748b'
        const sel = selectedId === n.id
        return `<g class="kg-node" data-id="${esc(n.id)}" transform="translate(${p.x},${p.y})">
          <title>${esc(n.path || n.label)}</title>
          <rect width="${NODE_W}" height="${NODE_H}" rx="6" fill="${color}" stroke="${sel ? '#fbbf24' : 'none'}" stroke-width="${sel ? 2 : 0}" opacity="${sel ? 1 : 0.92}"></rect>
          <text x="8" y="${NODE_H / 2 + 4}" font-size="11" fill="#fff">${esc(trunc(n.label, 18))}</text>
        </g>`
      }).join('')
      return `<svg class="kg-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
        <defs><marker id="kg-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill="#60a5fa"></path></marker></defs>
        ${edgeSvg}${nodeSvg}</svg>`
    }

    function overviewHtml(data) {
      const modColors = { root: '#1e293b', backend: '#0369a1', frontend: '#7c3aed', other: '#64748b' }
      const tech = (data.techStack || []).length
        ? '<div class="kg-tech"><span class="kg-tech-label">技术栈</span>' + data.techStack.map((t) => `<span class="kg-tech-chip">${esc(t)}</span>`).join('') + '</div>'
        : ''
      const cards = data.modules.map((m) => `
        <div class="kg-modcard" data-action="open-module" data-module="${esc(m.id)}">
          <div class="kg-modhead">
            <span class="kg-modname">${esc(m.name)}</span>
            <span class="kg-modtech">${esc(m.tech)}</span>
            <span class="kg-modkind" style="background:${modColors[m.kind] || '#64748b'}">${esc(m.kind)}</span>
          </div>
          ${m.entryPoints && m.entryPoints.length ? `<div class="kg-modentry">入口: ${esc(m.entryPoints[0])}</div>` : ''}
          ${legendHtml(m.kindCounts)}
          <div class="kg-status">${m.fileCount} 文件 · 点击查看文件图谱</div>
        </div>`).join('')
      return `<div class="kg-stats">
          <span>模块: ${data.stats.modules}</span><span>源文件: ${data.stats.sourceFiles}</span><span>扫描条目: ${data.stats.entries}</span>
          ${data.stats.truncated ? '<span style="color:#fbbf24">(已截断)</span>' : ''}
        </div>${tech}
        <div class="kg-modgrid">${cards}</div>
        <div class="kg-sec">模块依赖图</div>
        <div class="kg-scroll">${graphSvg(data.moduleGraph.nodes, data.moduleGraph.edges, modColors, ['root', 'backend', 'frontend', 'other'])}</div>
        <div class="kg-sec">架构观察</div>
        <ol class="kg-obs">${data.observations.map((o) => `<li>${esc(o)}</li>`).join('')}</ol>`
    }

    function fileViewHtml(mod, sel, detail) {
      const order = moduleOrder(mod.kind)
      const detailHtml = detail
        ? `<div class="kg-detail"><div class="kg-modhead">
            <span class="kg-modname">${esc((detail.path || '').split('/').pop())}</span>
            <span class="kg-chip">${esc(detail.kind)}</span><span class="kg-chip">${esc(detail.path)}</span>
          </div>${detail.error ? `<div class="kg-error">${esc(detail.error)}</div>` : `<pre class="kg-pre">${esc(detail.head)}</pre>`}</div>`
        : ''
      return `<div class="kg-modhead">
          <button class="kg-btn kg-btn-ghost" data-action="back">← 返回总览</button>
          <span class="kg-modname">${esc(mod.name)}</span>
          <span class="kg-modtech">${esc(mod.tech)}</span>
          ${mod.truncated ? '<span style="color:#fbbf24">节点过多已截断</span>' : ''}
        </div>${legendHtml(mod.kindCounts)}
        <div class="kg-scroll">${graphSvg(mod.nodes, mod.edges, KIND_COLORS, order, sel)}</div>
        <div class="kg-status">点击节点查看代码详情</div>${detailHtml}`
    }

    function apply() {
      if (typeof document === 'undefined') return
      const style = document.createElement('style')
      style.textContent = CSS
      document.head.appendChild(style)

      let collapsed = false
      const state = { path: '', data: null, tab: 'overview', moduleId: null, sel: null, detail: null, loading: false, error: '', full: false }

      const panel = document.createElement('div')
      panel.className = 'kg-panel'
      panel.innerHTML = `
        <div class="kg-head">
          <span class="kg-title">项目知识图谱</span>
          <span class="kg-spacer" style="flex:1"></span>
          <button class="kg-full-btn" data-action="full" title="全屏/还原">⛶</button>
          <button class="kg-fold" data-action="fold" title="折叠/展开">—</button>
        </div>
        <div class="kg-head" id="kg-controls">
          <input class="kg-input" id="kg-path" placeholder="项目路径, 例如 G:/code/xxx" />
          <button class="kg-btn" data-action="scan">扫描</button>
          <button class="kg-btn kg-btn-ghost" data-action="rescan">重新扫描</button>
        </div>
        <div class="kg-body" id="kg-body"></div>`
      document.body.appendChild(panel)

      const bodyEl = panel.querySelector('#kg-body')
      const pathInput = panel.querySelector('#kg-path')
      const controls = panel.querySelector('#kg-controls')
      const foldBtn = panel.querySelector('.kg-fold')
      const fullBtn = panel.querySelector('.kg-full-btn')
      const titleEl = panel.querySelector('.kg-title')
      const spacerEl = panel.querySelector('.kg-spacer')

      function render() {
        if (collapsed) {
          panel.classList.add('kg-collapsed')
          panel.classList.remove('kg-full')
          panel.style.width = ''
          controls.style.display = 'none'
          bodyEl.style.display = 'none'
          foldBtn.textContent = '+'
          foldBtn.title = '展开'
          titleEl.style.display = 'none'
          fullBtn.style.display = 'none'
          spacerEl.style.display = 'none'
          return
        }
        panel.classList.remove('kg-collapsed')
        panel.style.width = state.full ? 'auto' : '480px'
        panel.classList.toggle('kg-full', state.full)
        controls.style.display = 'flex'
        bodyEl.style.display = 'block'
        foldBtn.textContent = '—'
        foldBtn.title = '折叠'
        titleEl.style.display = ''
        fullBtn.style.display = ''
        spacerEl.style.display = ''
        fullBtn.textContent = state.full ? '✕' : '⛶'
        fullBtn.title = state.full ? '还原' : '全屏'
        if (state.loading) { bodyEl.innerHTML = '<div class="kg-status">正在扫描项目, 请稍候…</div>'; return }
        if (state.error) { bodyEl.innerHTML = `<div class="kg-error">扫描失败: ${esc(state.error)}</div>`; return }
        if (!state.data) {
          bodyEl.innerHTML = '<div class="kg-hint">在输入框填写项目路径后点击「扫描」，即可查看模块总览、依赖图谱与架构观察。</div>'
          return
        }
        if (state.tab === 'files' && state.moduleId) {
          const mod = state.data.modules.find((m) => m.id === state.moduleId)
          if (mod) { bodyEl.innerHTML = fileViewHtml(mod, state.sel, state.detail); return }
        }
        bodyEl.innerHTML = overviewHtml(state.data)
      }

      async function scan(force) {
        const p = pathInput.value.trim()
        if (!p) { state.error = '请先输入项目路径'; state.data = null; render(); return }
        state.loading = true; state.error = ''; state.data = null; state.tab = 'overview'; state.moduleId = null; state.sel = null; state.detail = null
        render()
        try {
          const res = await fetch(`${API}/scan?path=${encodeURIComponent(p)}${force ? '&force=1' : ''}`)
          const json = await res.json()
          if (json.error) { state.error = json.error } else { state.data = json }
        } catch (e) { state.error = String(e && e.message || e) }
        finally { state.loading = false; render() }
      }

      async function pickFile(id) {
        state.sel = id; state.detail = null; render()
        try {
          const res = await fetch(`${API}/detail?path=${encodeURIComponent(pathInput.value.trim())}&id=${encodeURIComponent(id)}`)
          state.detail = await res.json()
        } catch (e) { state.detail = { error: String(e && e.message || e) } }
        render()
      }

      panel.addEventListener('click', (ev) => {
        const t = ev.target
        const node = t.closest('[data-action]')
        if (node) {
          const action = node.getAttribute('data-action')
          if (action === 'fold') { collapsed = !collapsed; render(); return }
          if (action === 'full') { state.full = !state.full; render(); return }
          if (action === 'scan') { scan(false); return }
          if (action === 'rescan') { scan(true); return }
          if (action === 'back') { state.tab = 'overview'; state.moduleId = null; state.sel = null; state.detail = null; render(); return }
          if (action === 'open-module') {
            state.moduleId = node.getAttribute('data-module'); state.tab = 'files'; state.sel = null; state.detail = null; render(); return
          }
        }
        const g = t.closest('.kg-node')
        if (g && state.tab === 'files' && state.data) { pickFile(g.getAttribute('data-id')); return }
        const card = t.closest('.kg-modcard')
        if (card) {
          state.moduleId = card.getAttribute('data-module'); state.tab = 'files'; state.sel = null; state.detail = null; render()
        }
      })

      render()
      console.log('[kgraph-client] UI ready — 在输入框填写路径后点「扫描」')
    }

    return { name: NAME, apply }
  },
})
