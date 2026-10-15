import { TASK_COLORS } from './priority'

interface ColorPickerProps {
  value: string | null
  onChange: (color: string | null) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`h-6 w-6 rounded-full border-2 border-dashed ${value === null ? 'border-gray-900' : 'border-gray-300'}`}
        title="Aucune couleur"
      />
      {TASK_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`h-6 w-6 rounded-full border-2 ${value === c ? 'border-gray-900' : 'border-transparent'}`}
          style={{ backgroundColor: c }}
          aria-label={`Couleur ${c}`}
        />
      ))}
    </div>
  )
}
