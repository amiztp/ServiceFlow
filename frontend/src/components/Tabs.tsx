import { useId, type KeyboardEvent, type ReactNode } from 'react'

type Props<T extends string> = {
  label: string
  items: readonly { key: T; label: string }[]
  value: T
  onChange: (value: T) => void
  children: ReactNode
}

export function Tabs<T extends string>({ label, items, value, onChange, children }: Props<T>) {
  const id = useId()
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const offsets: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: items.length - 1 - index }
    if (!(event.key in offsets)) return
    event.preventDefault()
    const next = (index + offsets[event.key] + items.length) % items.length
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
    onChange(items[next].key)
  }
  return <>
    <div role="tablist" aria-label={label} className="sf-dashboard-tabs">
      {items.map((item, index) => <button
        key={item.key}
        type="button"
        role="tab"
        id={`${id}-${item.key}`}
        aria-selected={value === item.key}
        aria-controls={`${id}-panel`}
        tabIndex={value === item.key ? 0 : -1}
        onKeyDown={event => navigate(event, index)}
        onClick={() => onChange(item.key)}
      >{item.label}</button>)}
    </div>
    <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${value}`} tabIndex={0}>
      {children}
    </div>
  </>
}
