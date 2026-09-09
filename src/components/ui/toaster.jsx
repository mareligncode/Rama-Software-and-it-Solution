import { Toaster as SonnerToaster } from "sonner"

function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "border-border bg-card",
          error: "border-destructive bg-destructive/10",
          success: "border-green-500 bg-green-500/10",
        },
      }}
    />
  )
}

export { Toaster }
