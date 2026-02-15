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

  it('should forward ref to sub-components', () => {
    const headerRef = createRef<HTMLDivElement>()
    render(<CardHeader ref={headerRef} data-testid="header" />)
    expect(headerRef.current).toBe(screen.getByTestId('header'))

    const titleRef = createRef<HTMLDivElement>()
    render(<CardTitle ref={titleRef} data-testid="title" />)
    expect(titleRef.current).toBe(screen.getByTestId('title'))

    const descRef = createRef<HTMLDivElement>()
    render(<CardDescription ref={descRef} data-testid="desc" />)
    expect(descRef.current).toBe(screen.getByTestId('desc'))

    const contentRef = createRef<HTMLDivElement>()
    render(<CardContent ref={contentRef} data-testid="content" />)
    expect(contentRef.current).toBe(screen.getByTestId('content'))

    const footerRef = createRef<HTMLDivElement>()
    render(<CardFooter ref={footerRef} data-testid="footer" />)
    expect(footerRef.current).toBe(screen.getByTestId('footer'))
  })
})
