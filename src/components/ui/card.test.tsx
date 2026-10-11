import { render, screen, cleanup } from '@testing-library/react'
import { createRef } from 'react'
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
    Component: React.ElementType<{ ref?: React.Ref<HTMLElement>; 'data-testid'?: string }>;
    name: string;
    testId: string;
    expectedInstance: typeof HTMLElement;
  }

  const testCases: TestCase[] = [
    { Component: CardHeader as React.ElementType<{ ref?: React.Ref<HTMLElement>; 'data-testid'?: string }>, name: 'CardHeader', testId: 'header', expectedInstance: HTMLDivElement },
    { Component: CardTitle as React.ElementType<{ ref?: React.Ref<HTMLElement>; 'data-testid'?: string }>, name: 'CardTitle', testId: 'title', expectedInstance: HTMLHeadingElement },
    { Component: CardDescription as React.ElementType<{ ref?: React.Ref<HTMLElement>; 'data-testid'?: string }>, name: 'CardDescription', testId: 'desc', expectedInstance: HTMLParagraphElement },
    { Component: CardContent as React.ElementType<{ ref?: React.Ref<HTMLElement>; 'data-testid'?: string }>, name: 'CardContent', testId: 'content', expectedInstance: HTMLDivElement },
    { Component: CardFooter as React.ElementType<{ ref?: React.Ref<HTMLElement>; 'data-testid'?: string }>, name: 'CardFooter', testId: 'footer', expectedInstance: HTMLDivElement },
  ]

  it.each(testCases)('should forward ref to $name', ({ Component, testId, expectedInstance }) => {
    // We use a generic HTMLElement ref here since the actual type varies (Div, Heading, Paragraph)
    // but they all inherit from HTMLElement
    const ref = createRef<HTMLElement>()

    render(<Component ref={ref} data-testid={testId} />)

    expect(ref.current).toBeInstanceOf(expectedInstance)
    expect(ref.current).toBe(screen.getByTestId(testId))
  })
})
