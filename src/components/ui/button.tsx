import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Primário — azul pastel sobre fundo escuro
        default:
          "bg-[#7DD3FC] text-[#061923] font-semibold hover:bg-[#67E8F9] shadow-sm shadow-[#7DD3FC]/10 focus-visible:ring-[#7DD3FC]/40",
        // Secundário — transparente com borda petróleo
        outline:
          "border border-[#1F4D5C] bg-transparent text-[#F8FAFC] hover:bg-[#123340] hover:border-[#7DD3FC] aria-expanded:bg-[#123340]",
        secondary:
          "border border-[#1F4D5C] bg-transparent text-[#F8FAFC] hover:bg-[#123340] hover:border-[#7DD3FC] aria-expanded:bg-[#123340] aria-expanded:text-[#F8FAFC]",
        // Fantasma — hover suave em petróleo
        ghost:
          "text-[#CBD5E1] hover:bg-[#123340] hover:text-[#F8FAFC] aria-expanded:bg-[#123340] aria-expanded:text-[#F8FAFC]",
        // Destrutivo — melancia pastel
        destructive:
          "border border-[#FB7185]/20 bg-[#FB7185]/10 text-[#FB7185] hover:bg-[#FB7185]/20 focus-visible:border-[#FB7185]/40 focus-visible:ring-[#FB7185]/20",
        // Link — azul pastel sublinhado
        link: "text-[#7DD3FC] underline-offset-4 hover:underline hover:text-[#67E8F9]",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
