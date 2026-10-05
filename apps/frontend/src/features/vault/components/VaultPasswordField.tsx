import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  autoComplete?: string
}

/** Render a labelled secret input without storing it outside component memory. */
export function VaultPasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
  autoComplete = 'off',
}: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required
        disabled={disabled}
      />
    </div>
  )
}
