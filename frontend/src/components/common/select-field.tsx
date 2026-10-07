"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

/** Single-value select over string options; the trigger shows the selected option's label. */
export function SelectField({ value, onChange, options, placeholder, className, id, ...aria }: SelectFieldProps) {
  return (
    <Select items={options} value={value} onValueChange={(next) => next !== null && onChange(String(next))}>
      <SelectTrigger id={id} aria-label={aria["aria-label"]} className={cn("h-9 bg-white", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
