import { Counter } from './counter'

// Server component — fetches data, renders with a client component
export async function Chart({ dataSource }: { dataSource?: string }) {
  const source = dataSource || 'default'
  const data = [10, 25, 15, 30, 20] // simulated server data

  return (
    <div data-testid="remote-chart">
      <h2>Chart: {source}</h2>
      <ul>
        {data.map((value, i) => (
          <li key={i}>
            Point {i + 1}: {value}
          </li>
        ))}
      </ul>
      <Counter label={`${source} chart`} />
    </div>
  )
}
