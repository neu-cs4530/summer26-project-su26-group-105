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

/**
 * Component for displaying a text input field.
 * @param buttons Buttons to display next to the input
 * @param className Additional classes for the input
 * @param containerClassName Additional classes for the container
 * @param error Error message to display
 * @param label Label for the input
 * @param props Props for the underlying input element
 */
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
