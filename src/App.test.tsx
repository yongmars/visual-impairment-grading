import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('判定フロー', () => {
  beforeEach(() => localStorage.clear())

  it('矯正視力確認後に視力判定し、視野ステップへ進む', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('右眼 矯正視力'), { target: { value: '0.04' } })
    fireEvent.change(screen.getByLabelText('左眼 矯正視力'), { target: { value: 'hand' } })
    fireEvent.click(screen.getByLabelText(/入力値は矯正視力です/))
    fireEvent.click(screen.getByRole('button', { name: /視力を判定する/ }))
    expect(screen.getByRole('heading', { name: '視野障害の判定' })).toBeInTheDocument()
  })

  it('未確認の矯正視力は判定しない', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('右眼 矯正視力'), { target: { value: '0.04' } })
    fireEvent.change(screen.getByLabelText('左眼 矯正視力'), { target: { value: 'hand' } })
    fireEvent.click(screen.getByRole('button', { name: /視力を判定する/ }))
    expect(screen.getByRole('alert')).toHaveTextContent('矯正視力であることを確認')
  })
})
