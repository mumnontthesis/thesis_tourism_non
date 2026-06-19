import { useEffect, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "./utils"
import { Button } from "../components/ui/button.tsx"

let showAlertImpl = null
let showConfirmImpl = null

export function showAppAlert(message, options = {}) {
  const {
    title = "แจ้งเตือน",
    confirmText = "ตกลง",
    variant = "default",
  } = options

  if (showAlertImpl) {
    return showAlertImpl({ title, message, confirmText, variant })
  }

  window.alert(message)
  return Promise.resolve()
}

export function showAppConfirm(message, options = {}) {
  const {
    title = "ยืนยัน",
    confirmText = "ตกลง",
    cancelText = "ยกเลิก",
  } = options

  if (showConfirmImpl) {
    return showConfirmImpl({ title, message, confirmText, cancelText })
  }

  return Promise.resolve(window.confirm(message))
}

function AlertOverlay({ className, ...props }) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-[200] bg-black/40 backdrop-blur-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  )
}

function AlertBox({ open, onOpenChange, title, message, footer }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <AlertOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-[201] w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border bg-background p-6 shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {message}
          </DialogPrimitive.Description>
          <div className="mt-6 flex justify-end gap-2">{footer}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function AppAlertProvider({ children }) {
  const [alertState, setAlertState] = useState(null)
  const [confirmState, setConfirmState] = useState(null)

  useEffect(() => {
    showAlertImpl = (payload) =>
      new Promise((resolve) => {
        setAlertState({ ...payload, resolve })
      })

    showConfirmImpl = (payload) =>
      new Promise((resolve) => {
        setConfirmState({ ...payload, resolve })
      })

    return () => {
      showAlertImpl = null
      showConfirmImpl = null
    }
  }, [])

  const closeAlert = () => {
    alertState?.resolve?.()
    setAlertState(null)
  }

  const closeConfirm = (result) => {
    confirmState?.resolve?.(result)
    setConfirmState(null)
  }

  return (
    <>
      {children}

      <AlertBox
        open={Boolean(alertState)}
        onOpenChange={(open) => {
          if (!open) closeAlert()
        }}
        title={alertState?.title || "แจ้งเตือน"}
        message={alertState?.message || ""}
        footer={
          <Button
            type="button"
            onClick={closeAlert}
            variant={alertState?.variant === "destructive" ? "destructive" : "default"}
          >
            {alertState?.confirmText || "ตกลง"}
          </Button>
        }
      />

      <AlertBox
        open={Boolean(confirmState)}
        onOpenChange={(open) => {
          if (!open) closeConfirm(false)
        }}
        title={confirmState?.title || "ยืนยัน"}
        message={confirmState?.message || ""}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => closeConfirm(false)}>
              {confirmState?.cancelText || "ยกเลิก"}
            </Button>
            <Button type="button" onClick={() => closeConfirm(true)}>
              {confirmState?.confirmText || "ตกลง"}
            </Button>
          </>
        }
      />
    </>
  )
}
