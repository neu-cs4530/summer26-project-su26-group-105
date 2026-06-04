import { useId } from "react";
import "./TextInput.css";

type BaseProps =
  | (React.InputHTMLAttributes<HTMLInputElement> & { isTextArea?: false })
  | (React.TextareaHTMLAttributes<HTMLTextAreaElement> & { isTextArea: true });

type TextInputProps = BaseProps & {
  error?: string;
  buttons?: React.ReactNode;
  containerClassName?: string;
  label?: string;
};

function Input(props: BaseProps) {
  if (props.isTextArea) {
    return <textarea {...props} />;
  } else {
    return <input {...props} />;
  }
}

export default function TextInput({
  buttons,
  className,
  containerClassName,
  error,
  label,
  ...props
}: TextInputProps) {
  const id = useId();
  return (
    <div className={`text-input-container ${containerClassName ?? ""}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className={`text-input ${className ?? ""}`}>
        <Input id={id} {...props} />
        {buttons && <div className="buttons">{buttons}</div>}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
