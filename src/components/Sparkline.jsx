import { ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts'

export default function Sparkline({ data, modelSwitchPoints = [], isIdle }) {
  return (
    <div style={{ width: '100%', height: '100%', opacity: isIdle ? 0.3 : 1, transition: 'opacity 0.8s ease' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#00e5ff" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity={0} />
            </linearGradient>
          </defs>

          {modelSwitchPoints.map((pt, i) => (
            <ReferenceLine
              key={`ms-${i}`}
              x={pt.index}
              stroke="#ffb300"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              label={{
                value: pt.label,
                position: 'insideTopLeft',
                fill: '#ffb300',
                fontSize: 9,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          ))}

          <Area
            type="monotone"
            dataKey="tokensPerSec"
            stroke="#00e5ff"
            strokeWidth={2}
            fill="url(#cyanGradient)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
