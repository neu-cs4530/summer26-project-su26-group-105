import "./TextInput.css";

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  buttons?: React.ReactNode;
};

export default function TextInput({ buttons, className, ...props }: TextInputProps) {
  return (
    <div className={`text-input-container ${className ?? ""}`}>
      <input {...props} />
      {buttons && <div className="buttons">{buttons}</div>}
    </div>
  );
}
