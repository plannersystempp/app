import { describe, it, expect } from 'vitest'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

describe('TabsTrigger', () => {
  it('usa type="button" por padrão', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = ReactDOM.createRoot(container)

    await act(async () => {
      root.render(
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">A</TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
          </TabsList>
          <TabsContent value="a">A content</TabsContent>
          <TabsContent value="b">B content</TabsContent>
        </Tabs>
      )
      await new Promise((r) => setTimeout(r, 0))
    })

    const triggers = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[]
    expect(triggers.length).toBeGreaterThan(0)
    for (const trigger of triggers) {
      expect(trigger.getAttribute('type')).toBe('button')
    }

    await act(async () => {
      root.unmount()
      await new Promise((r) => setTimeout(r, 0))
    })
    container.remove()
  })

  it('permite sobrescrever type explicitamente', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = ReactDOM.createRoot(container)

    await act(async () => {
      root.render(
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a" type="submit">
              A
            </TabsTrigger>
          </TabsList>
          <TabsContent value="a">A content</TabsContent>
        </Tabs>
      )
      await new Promise((r) => setTimeout(r, 0))
    })

    const trigger = container.querySelector('button') as HTMLButtonElement | null
    expect(trigger).toBeTruthy()
    expect(trigger?.getAttribute('type')).toBe('submit')

    await act(async () => {
      root.unmount()
      await new Promise((r) => setTimeout(r, 0))
    })
    container.remove()
  })
})
