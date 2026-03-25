import { Toaster as Sonner } from "sonner";

export { toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      expand={false}
      richColors={false}
      closeButton={true}
      duration={3500}
      toastOptions={{
        style: {
          border: 'none',
          borderRadius: '999px',
          padding: '12px 14px',
          boxShadow: '0 0 10px rgba(0,0,0,0.2)',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '500',
          fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Open Sans","Helvetica Neue",sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '8px',
          minWidth: '320px',
          maxWidth: '320px',
        },
        classNames: {
          toast: 'toast-pill',
          success: 'toast-pill-success',
          error: 'toast-pill-error',
          warning: 'toast-pill-warning',
          info: 'toast-pill-info',
          loading: 'toast-pill-info',
        },
      }}
      {...props}
    />
  );
}
