interface FieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
}

export function Field({ label, required, children }: FieldProps) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">
        {label}{required && <span className="text-[#3ab690] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export const inputCls = "w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#3ab690] transition-colors"

export const selectCls = inputCls
