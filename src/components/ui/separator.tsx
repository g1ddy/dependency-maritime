import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

export interface SeparatorProps extends React.ComponentProps<typeof SeparatorPrimitive.Root> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const Separator = ({
  className,
  orientation = "horizontal",
  decorative = true,
  ref,
  ...props
}: SeparatorProps) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )}
    {...props}
  />
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
