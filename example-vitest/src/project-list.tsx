"use client"
import { useLoaderData } from 'spiceflow/react'

export function ProjectList() {
  const data = useLoaderData('/dashboard')
  return (
    <div data-testid="project-list">
      <h2>Projects from loader</h2>
      <p>Count: {data?.projects?.length ?? 0}</p>
      {data?.projects?.map((name: string) => (
        <span key={name}>{name}</span>
      ))}
    </div>
  )
}
