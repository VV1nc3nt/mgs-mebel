import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const eslint = new ESLint()
const lint = async (code: string, filePath = 'src/components/ui/Fixture.tsx') => {
  const [result] = await eslint.lintText(code, { filePath })
  return result.messages.filter((m) => m.ruleId === 'no-restricted-syntax').map((m) => m.message)
}

describe('magic values lint rule', () => {
  it.each([
    ['px in an arbitrary Tailwind value', '<div className="w-[24px]" />'],
    ['arbitrary color', '<div className="bg-[#C9D730]" />'],
    ['hex color', '<div style={{ color: "#C9D730" }} />'],
    ['rgba color', '<div style={{ background: "rgba(20,20,19,.6)" }} />'],
    ['px in a template', '<div style={{ width: `${4}px` }} />'],
    ['number in style', '<div style={{ width: 24 }} />'],
  ])('fails on %s', async (_, jsx) => {
    expect(await lint(`export const A = () => ${jsx}`)).not.toHaveLength(0)
  })

  it('passes token classes, anchors and percentages', async () => {
    const code = `export const A = () => (
      <a href="#new" className="h-10 rounded-pill bg-bg/60 px-4.5 aspect-9/16" style={{ objectPosition: '50% 50%' }}>
        #новости
      </a>
    )`
    expect(await lint(code)).toEqual([])
  })

  it('applies to frontend pages but not to lib', async () => {
    const code = 'export const a = "24px"'
    expect(await lint(code, 'src/app/(frontend)/page.tsx')).not.toHaveLength(0)
    expect(await lint(code, 'src/lib/media.ts')).toEqual([])
  })
})
