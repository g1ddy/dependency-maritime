import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Button } from './button'
import { describe, it, expect, vi, afterEach } from 'vitest'
import * as React from 'react'

describe('Button', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeTruthy()
  })

  it('forwards ref to the button element', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Click me</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('calls onClick handler', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByRole('button', { name: /click me/i }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button', { name: /delete/i })
    expect(button.className).toContain('bg-destructive')
  })

  it('supports asChild prop', () => {
    // We use generic ref here because strict ButtonProps expects HTMLButtonElement
    // but asChild renders an anchor.
    const ref = React.createRef<HTMLElement>()
    render(
      <Button asChild ref={ref as React.RefObject<HTMLButtonElement>}>
        <a href="#">Link</a>
      </Button>
    )
    const link = screen.getByRole('link', { name: /link/i })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('#')
    expect(ref.current).toBeInstanceOf(HTMLAnchorElement)
  })
})
