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
      duration={4500}
      gap={10}
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
