import { Toaster as Sonner } from "sonner";

export { toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      expand={false}
      richColors={false}
      closeButton={false}
      duration={3500}
      gap={8}
      toastOptions={{
        classNames: {
          toast:   "nt-toast",
          success: "nt-success",
          error:   "nt-error",
          warning: "nt-warning",
          info:    "nt-info",
          loading: "nt-loading",
        },
      }}
      {...props}
    />
  );
}
