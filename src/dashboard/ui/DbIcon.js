// Stroke icons used by the package (shapes from the Lucide set, ISC licence).
import { h } from 'vue'

const ICONS = {
  bookmark: [['path', { d: 'm19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z' }]],
  'chevron-down': [['path', { d: 'm6 9 6 6 6-6' }]],
  download: [
    ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }],
    ['polyline', { points: '7 10 12 15 17 10' }],
    ['line', { x1: 12, x2: 12, y1: 15, y2: 3 }],
  ],
  refresh: [
    ['path', { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' }],
    ['path', { d: 'M21 3v5h-5' }],
    ['path', { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' }],
    ['path', { d: 'M8 16H3v5' }],
  ],
  settings: [
    [
      'path',
      {
        d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
      },
    ],
    ['circle', { cx: 12, cy: 12, r: 3 }],
  ],
  sliders: [
    ['line', { x1: 21, x2: 14, y1: 4, y2: 4 }],
    ['line', { x1: 10, x2: 3, y1: 4, y2: 4 }],
    ['line', { x1: 21, x2: 12, y1: 12, y2: 12 }],
    ['line', { x1: 8, x2: 3, y1: 12, y2: 12 }],
    ['line', { x1: 21, x2: 16, y1: 20, y2: 20 }],
    ['line', { x1: 12, x2: 3, y1: 20, y2: 20 }],
    ['line', { x1: 14, x2: 14, y1: 2, y2: 6 }],
    ['line', { x1: 8, x2: 8, y1: 10, y2: 14 }],
    ['line', { x1: 16, x2: 16, y1: 18, y2: 22 }],
  ],
  maximize: [
    ['polyline', { points: '15 3 21 3 21 9' }],
    ['polyline', { points: '9 21 3 21 3 15' }],
    ['line', { x1: 21, x2: 14, y1: 3, y2: 10 }],
    ['line', { x1: 3, x2: 10, y1: 21, y2: 14 }],
  ],
  minimize: [
    ['polyline', { points: '4 14 10 14 10 20' }],
    ['polyline', { points: '20 10 14 10 14 4' }],
    ['line', { x1: 14, x2: 21, y1: 10, y2: 3 }],
    ['line', { x1: 3, x2: 10, y1: 21, y2: 14 }],
  ],
  more: [
    ['circle', { cx: 12, cy: 12, r: 1 }],
    ['circle', { cx: 19, cy: 12, r: 1 }],
    ['circle', { cx: 5, cy: 12, r: 1 }],
  ],
  star: [['polygon', { points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' }]],
  pencil: [['path', { d: 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z' }]],
  trash: [
    ['path', { d: 'M3 6h18' }],
    ['path', { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' }],
    ['path', { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' }],
  ],
  x: [
    ['path', { d: 'M18 6 6 18' }],
    ['path', { d: 'm6 6 12 12' }],
  ],
  plus: [
    ['path', { d: 'M5 12h14' }],
    ['path', { d: 'M12 5v14' }],
  ],
  check: [['path', { d: 'M20 6 9 17l-5-5' }]],
  grid: [
    ['rect', { width: 7, height: 7, x: 3, y: 3, rx: 1 }],
    ['rect', { width: 7, height: 7, x: 14, y: 3, rx: 1 }],
    ['rect', { width: 7, height: 7, x: 14, y: 14, rx: 1 }],
    ['rect', { width: 7, height: 7, x: 3, y: 14, rx: 1 }],
  ],
  grip: [
    ['circle', { cx: 9, cy: 12, r: 1 }],
    ['circle', { cx: 9, cy: 5, r: 1 }],
    ['circle', { cx: 9, cy: 19, r: 1 }],
    ['circle', { cx: 15, cy: 12, r: 1 }],
    ['circle', { cx: 15, cy: 5, r: 1 }],
    ['circle', { cx: 15, cy: 19, r: 1 }],
  ],
  search: [
    ['circle', { cx: 11, cy: 11, r: 8 }],
    ['path', { d: 'm21 21-4.3-4.3' }],
  ],
  filter: [['polygon', { points: '22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' }]],
  'chevrons-left': [
    ['path', { d: 'm11 17-5-5 5-5' }],
    ['path', { d: 'm18 17-5-5 5-5' }],
  ],
  'chevrons-right': [
    ['path', { d: 'm6 17 5-5-5-5' }],
    ['path', { d: 'm13 17 5-5-5-5' }],
  ],
  undo: [
    ['path', { d: 'M9 14 4 9l5-5' }],
    ['path', { d: 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11' }],
  ],
  redo: [
    ['path', { d: 'm15 14 5-5-5-5' }],
    ['path', { d: 'M20 9H9.5a5.5 5.5 0 0 0 0 11H13' }],
  ],
  lock: [
    ['rect', { width: 18, height: 11, x: 3, y: 11, rx: 2, ry: 2 }],
    ['path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }],
  ],
}

export const DbIcon = (props) => {
  const shapes = ICONS[props.name] ?? []
  return h(
    'svg',
    {
      class: 'db-icon',
      width: props.size ?? 16,
      height: props.size ?? 16,
      viewBox: '0 0 24 24',
      fill: props.filled ? 'currentColor' : 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    },
    shapes.map(([tag, attrs]) => h(tag, attrs)),
  )
}
DbIcon.props = ['name', 'size', 'filled']

export default DbIcon
