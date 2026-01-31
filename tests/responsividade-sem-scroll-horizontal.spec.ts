import { test, expect } from '@playwright/test'

const viewports = [
  { name: 'smartphone-320-portrait', width: 320, height: 568 },
  { name: 'smartphone-320-landscape', width: 568, height: 320 },
  { name: 'tablet-768-portrait', width: 768, height: 1024 },
  { name: 'tablet-768-landscape', width: 1024, height: 768 },
]

test.describe('Responsividade: sem scroll horizontal', () => {
  for (const vp of viewports) {
    test(`${vp.name} - não deve haver overflow horizontal em /`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/')

      const result = await page.evaluate(() => {
        const el = document.documentElement
        const body = document.body
        return {
          htmlClientWidth: el.clientWidth,
          htmlScrollWidth: el.scrollWidth,
          bodyClientWidth: body.clientWidth,
          bodyScrollWidth: body.scrollWidth,
        }
      })

      expect(result.htmlScrollWidth).toBeLessThanOrEqual(result.htmlClientWidth)
      expect(result.bodyScrollWidth).toBeLessThanOrEqual(result.bodyClientWidth)
    })
  }
})

