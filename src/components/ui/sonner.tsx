import { Toaster as Sonner } from "sonner";

export { toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      expand={false}
      richColors={false}
      closeButton={false}
      duration={3500}
      toastOptions={{
        style: {
          background: 'rgba(12, 12, 22, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px',
          padding: '12px 16px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
          color: '#fff',
          fontSize: '13px',
          fontWeight: '500',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minWidth: '280px',
          maxWidth: '380px',
        },
        classNames: {
          toast: 'toast-premium',
          success: 'toast-success',
          error: 'toast-error',
          warning: 'toast-warning',
          info: 'toast-info',
          loading: 'toast-loading',
        },
      }}
      {...props}
    />
  );
}
