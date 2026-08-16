return {
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return
    const h = React.createElement
    const useState = React.useState

    styles.insert('.kg-panel{font-family:var(--dsh-font,system-ui);padding:10px 4px;color:var(--dsh-text,#e2e8f0)}.kg-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.kg-title{font-weight:600;font-size:14px}.kg-input{flex:1;min-width:220px;padding:6px 8px;border-radius:6px;border:1px solid var(--dsh-border,#334155);background:var(--dsh-bg2,#1e293b);color:inherit;font-size:12px}.kg-btn{padding:6px 12px;border-radius:6px;border:1px solid var(--dsh-border,#334155);background:var(--dsh-accent,#3b82f6);color:#fff;cursor:pointer;font-size:12px}.kg-btn-ghost{background:transparent;color:inherit}.kg-btn:disabled{opacity:.5;cursor:default}.kg-status,.kg-error{font-size:12px;margin:8px 0}.kg-error{color:#f87171}.kg-hint{font-size:12px;color:var(--dsh-dim,#94a3b8);background:var(--dsh-bg2,#1e293b);border:1px dashed var(--dsh-border,#334155);border-radius:8px;padding:10px;margin-bottom:10px;line-height:1.8}.kg-stats{display:flex;gap:14px;font-size:12px;color:var(--dsh-dim,#94a3b8);margin-bottom:8px}.kg-tech{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;align-items:center}.kg-tech-label{font-size:12px;color:var(--dsh-dim,#94a3b8)}.kg-tech-chip{font-size:11px;padding:2px 8px;border-radius:999px;background:var(--dsh-bg2,#1e293b);border:1px solid var(--dsh-border,#334155)}.kg-modgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;margin-bottom:12px}.kg-modcard{border:1px solid var(--dsh-border,#334155);border-radius:8px;padding:10px;background:var(--dsh-bg2,#1e293b)}.kg-modhead{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px}.kg-modname{font-weight:600;font-size:13px}.kg-modtech{font-size:11px;color:var(--dsh-dim,#94a3b8)}.kg-modkind{font-size:10px;padding:2px 8px;border-radius:999px;color:#fff;text-transform:uppercase}.kg-modentry{font-size:11px;color:var(--dsh-dim,#94a3b8);margin-bottom:6px;word-break:break-all}.kg-legend{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.kg-chip{font-size:11px;padding:2px 8px;border-radius:999px;background:var(--dsh-bg2,#1e293b);border:1px solid var(--dsh-border,#334155);display:inline-flex;align-items:center;gap:5px}.kg-chip2{font-size:11px;color:var(--dsh-dim,#94a3b8);word-break:break-all}.kg-dot{width:8px;height:8px;border-radius:50%;display:inline-block}.kg-sec{font-weight:600;font-size:13px;margin:14px 0 6px}.kg-svg{display:block}.kg-node{cursor:pointer}.kg-node text{user-select:none}.kg-scroll{overflow:auto;max-height:600px}.kg-obs{font-size:12px;margin:4px 0 0 18px;line-height:1.7}.kg-detail{margin-top:10px;border:1px solid var(--dsh-border,#334155);border-radius:8px;padding:10px}.kg-detailhead{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}.kg-pre{font-size:11px;white-space:pre-wrap;word-break:break-all;max-height:300px;overflow:auto;margin:0;color:var(--dsh-dim,#cbd5e1)}.kg-warn{font-size:11px;color:#fbbf24}.kg-empty{font-size:12px;color:var(--dsh-dim,#94a3b8);padding:20px;text-align:center}')

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

    function trunc(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s }

    function moduleOrder(kind) {
      return kind === 'backend' ? BACKEND_ORDER : (kind === 'frontend' ? FRONTEND_ORDER : GENERIC_ORDER)
    }

    function Legend(props) {
      const counts = props.counts || {}
      const colors = props.colors || {}
      const items = Object.keys(counts)
      if (items.length === 0) return null
      return h('div', { className: 'kg-legend' }, items.map(function (k) {
        return h('span', { key: k, className: 'kg-chip' },
          h('span', { className: 'kg-dot', style: { background: colors[k] || '#64748b' } }),
          k + ' ' + counts[k])
      }))
    }

    function GraphSvg(props) {
      const nodes = props.nodes || []
      const edges = props.edges || []
      const colors = props.colors || {}
      const order = props.order || []
      const onPick = props.onPick
      const selected = props.selected
      if (nodes.length === 0) return h('div', { className: 'kg-empty' }, '无节点')
      const NODE_W = 168, NODE_H = 30, COL_W = 208, ROW_H = 46, PAD = 14
      const columns = {}
      for (const n of nodes) {
        const list = columns[n.kind] || (columns[n.kind] = [])
        list.push(n)
      }
      const present = Object.keys(columns)
      const ordered = order.filter(function (k) { return columns[k] !== undefined }).concat(present.filter(function (k) { return order.indexOf(k) === -1 }))
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
      const edgeEls = []
      for (const e of edges) {
        const a = pos[e.from], b = pos[e.to]
        if (!a || !b) continue
        const sx = a.x + NODE_W, sy = a.y + NODE_H / 2
        const tx = b.x, ty = b.y + NODE_H / 2
        const cx = (sx + tx) / 2
        edgeEls.push(h('path', {
          key: e.from + '>' + e.to,
          d: 'M ' + sx + ' ' + sy + ' C ' + cx + ' ' + sy + ', ' + cx + ' ' + ty + ', ' + tx + ' ' + ty,
          stroke: e.kind === 'contains' ? '#94a3b8' : '#60a5fa',
          strokeWidth: 1.2, fill: 'none', opacity: 0.75,
          markerEnd: 'url(#kg-arrow)'
        }))
      }
      const nodeEls = []
      for (const n of nodes) {
        const p = pos[n.id]
        if (!p) continue
        const color = colors[n.kind] || '#64748b'
        const sel = selected === n.id
        nodeEls.push(h('g', {
          key: n.id,
          transform: 'translate(' + p.x + ',' + p.y + ')',
          onClick: function () { if (onPick) onPick(n) },
          className: 'kg-node'
        },
          h('title', null, n.path || n.label),
          h('rect', { width: NODE_W, height: NODE_H, rx: 6, fill: color, stroke: sel ? '#fbbf24' : 'none', strokeWidth: sel ? 2 : 0, opacity: sel ? 1 : 0.92 }),
          h('text', { x: 8, y: NODE_H / 2 + 4, fontSize: 11, fill: '#fff' }, trunc(n.label, 18))
        ))
      }
      return h('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, className: 'kg-svg' },
        h('defs', null, h('marker', { id: 'kg-arrow', markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: 'auto' },
          h('path', { d: 'M 0 0 L 8 4 L 0 8 z', fill: '#60a5fa' }))),
        edgeEls,
        nodeEls)
    }

    function Overview(props) {
      const data = props.data
      const onOpenModule = props.onOpenModule
      const modColors = { root: '#1e293b', backend: '#0369a1', frontend: '#7c3aed', other: '#64748b' }
      return h('div', { className: 'kg-overview' },
        h('div', { className: 'kg-stats' },
          h('span', { className: 'kg-stat' }, '模块: ' + data.stats.modules),
          h('span', { className: 'kg-stat' }, '源文件: ' + data.stats.sourceFiles),
          h('span', { className: 'kg-stat' }, '扫描条目: ' + data.stats.entries),
          data.stats.truncated && h('span', { className: 'kg-warn' }, ' (已截断)')),
        data.techStack && data.techStack.length > 0 && h('div', { className: 'kg-tech' },
          h('span', { className: 'kg-tech-label' }, '技术栈'),
          data.techStack.map(function (t) { return h('span', { key: t, className: 'kg-tech-chip' }, t) })),
        h('div', { className: 'kg-modgrid' }, data.modules.map(function (m) {
          return h('div', { key: m.id, className: 'kg-modcard' },
            h('div', { className: 'kg-modhead' },
              h('span', { className: 'kg-modname' }, m.name),
              h('span', { className: 'kg-modtech' }, m.tech),
              h('span', { className: 'kg-modkind', style: { background: modColors[m.kind] || '#64748b' } }, m.kind)),
            m.entryPoints && m.entryPoints.length > 0 && h('div', { className: 'kg-modentry' }, '入口: ' + m.entryPoints[0]),
            h(Legend, { counts: m.kindCounts, colors: KIND_COLORS }),
            h('button', { className: 'kg-btn', onClick: function () { onOpenModule(m.id) } }, '查看文件知识图谱 (' + m.fileCount + ' 文件)'))
        })),
        h('div', { className: 'kg-sec' }, '模块依赖图'),
        h('div', { className: 'kg-scroll' },
          h(GraphSvg, {
            nodes: data.moduleGraph.nodes, edges: data.moduleGraph.edges, colors: modColors,
            order: ['root', 'backend', 'frontend', 'other'],
            onPick: function (n) { if (n.kind !== 'root') onOpenModule(n.id) }
          })),
        h('div', { className: 'kg-sec' }, '架构观察'),
        h('ol', { className: 'kg-obs' }, data.observations.map(function (o, i) { return h('li', { key: i }, o) })))
    }

    function FileView(props) {
      const mod = props.mod
      const sel = props.sel
      const onPick = props.onPick
      const onBack = props.onBack
      const detail = props.detail
      const detailBusy = props.detailBusy
      return h('div', { className: 'kg-fileview' },
        h('div', { className: 'kg-modhead' },
          h('button', { className: 'kg-btn', onClick: onBack }, '← 返回总览'),
          h('span', { className: 'kg-modname' }, mod.name),
          h('span', { className: 'kg-modtech' }, mod.tech),
          mod.truncated && h('span', { className: 'kg-warn' }, '节点过多已截断')),
        h(Legend, { counts: mod.kindCounts, colors: KIND_COLORS }),
        h('div', { className: 'kg-scroll' },
          h(GraphSvg, { nodes: mod.nodes, edges: mod.edges, colors: KIND_COLORS, order: moduleOrder(mod.kind), onPick: onPick, selected: sel })),
        detailBusy && h('div', { className: 'kg-status' }, '读取文件详情…'),
        detail && !detailBusy && h('div', { className: 'kg-detail' },
          h('div', { className: 'kg-detailhead' },
            h('span', { className: 'kg-modname' }, (detail.path || '').split('/').pop()),
            h('span', { className: 'kg-chip' }, detail.kind),
            h('span', { className: 'kg-chip2' }, detail.path)),
          detail.error ? h('div', { className: 'kg-error' }, detail.error)
            : h('pre', { className: 'kg-pre' }, detail.head)))
    }

    function Panel() {
      const [pathInput, setPathInput] = useState('')
      const [data, setData] = useState(null)
      const [loading, setLoading] = useState(false)
      const [error, setError] = useState('')
      const [tab, setTab] = useState('overview')
      const [moduleId, setModuleId] = useState(null)
      const [sel, setSel] = useState(null)
      const [detail, setDetail] = useState(null)
      const [detailBusy, setDetailBusy] = useState(false)

      async function scan(force) {
        const p = pathInput.trim()
        if (!p) { setError('请先输入项目路径'); return }
        setLoading(true)
        setError('')
        try {
          const res = await host.call('scan', { path: p, force: !!force })
          if (res && res.error) { setError(res.error); return }
          setData(res)
          setModuleId(null); setSel(null); setDetail(null)
          setTab('overview')
        } catch (e) {
          setError(String(e && e.message || e))
        } finally {
          setLoading(false)
        }
      }

      async function pickFile(n) {
        setSel(n.id)
        setDetail(null)
        setDetailBusy(true)
        try {
          const d = await host.call('detail', { path: pathInput.trim(), id: n.id })
          setDetail(d)
        } catch (e) {
          setDetail({ error: String(e && e.message || e) })
        } finally {
          setDetailBusy(false)
        }
      }

      const mod = data && data.modules ? data.modules.find(function (m) { return m.id === moduleId }) : null
      return h('div', { className: 'kg-panel' },
        h('div', { className: 'kg-head' },
          h('span', { className: 'kg-title' }, '项目知识图谱'),
          h('input', { className: 'kg-input', value: pathInput, onChange: function (e) { setPathInput(e.target.value) }, placeholder: '项目路径, 例如 G:/code/xxx (或用 /kgraph 命令)' }),
          h('button', { className: 'kg-btn', onClick: function () { scan(false) }, disabled: loading }, loading ? '扫描中…' : '扫描'),
          h('button', { className: 'kg-btn kg-btn-ghost', onClick: function () { scan(true) }, disabled: loading }, '重新扫描')),
        !data && !loading && h('div', { className: 'kg-hint' },
          '使用方式: ① 在输入框填写项目路径后点击「扫描」; ② 或在聊天中直接输入命令 ',
          h('code', null, '/kgraph {项目路径}'),
          ', 例如 ',
          h('code', null, '/kgraph G:/code/my-project')),
        loading && h('div', { className: 'kg-status' }, '正在扫描项目, 请稍候…'),
        error && h('div', { className: 'kg-error' }, '扫描失败: ' + error),
        data && tab === 'overview' && h(Overview, {
          data: data,
          onOpenModule: function (id) { setModuleId(id); setSel(null); setDetail(null); setTab('files') }
        }),
        data && tab === 'files' && mod && h(FileView, {
          mod: mod, sel: sel, onPick: pickFile,
          onBack: function () { setTab('overview') },
          detail: detail, detailBusy: detailBusy
        }),
        data && tab === 'files' && !mod && h('div', { className: 'kg-status' }, '模块不存在'))
    }

    slots.inject('tool.view.cordis', function () {
      return slots.register(
        { name: 'tool.view.cordis', key: 'self' },
        function () { return h(Panel) }
      )
    })
  }
}
