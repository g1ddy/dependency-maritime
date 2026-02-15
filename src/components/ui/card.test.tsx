import { render, screen, cleanup } from '@testing-library/react'
import { createRef, type ElementType } from 'react'
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card'
import { describe, it, expect, afterEach } from 'vitest'

describe('Card Component', () => {
  afterEach(() => {
    cleanup()
  })

  it('should render card with content', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    )

    expect(screen.getByText('Title')).toBeTruthy()
    expect(screen.getByText('Description')).toBeTruthy()
    expect(screen.getByText('Content')).toBeTruthy()
    expect(screen.getByText('Footer')).toBeTruthy()
  })

  it('should forward ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Card ref={ref} data-testid="card" />)

    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current).toBe(screen.getByTestId('card'))
  })

  interface TestCase {
    Component: ElementType;
    name: string;
    testId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expectedInstance: any;
  }

  const testCases: TestCase[] = [
    { Component: CardHeader, name: 'CardHeader', testId: 'header', expectedInstance: HTMLDivElement },
    { Component: CardTitle, name: 'CardTitle', testId: 'title', expectedInstance: HTMLHeadingElement },
    { Component: CardDescription, name: 'CardDescription', testId: 'desc', expectedInstance: HTMLParagraphElement },
    { Component: CardContent, name: 'CardContent', testId: 'content', expectedInstance: HTMLDivElement },
    { Component: CardFooter, name: 'CardFooter', testId: 'footer', expectedInstance: HTMLDivElement },
  ]

  it.each(testCases)('should forward ref to $name', ({ Component, testId, expectedInstance }) => {
    // We use a generic HTMLElement ref here since the actual type varies (Div, Heading, Paragraph)
    // but they all inherit from HTMLElement
    const ref = createRef<HTMLElement>()

    // We cast the Component to any to bypass strict prop type checks for this generic test loop
    // knowing that all our components accept a ref.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const Comp = Component as any

    render(<Comp ref={ref} data-testid={testId} />)

    expect(ref.current).toBeInstanceOf(expectedInstance)
    expect(ref.current).toBe(screen.getByTestId(testId))
  })
})
