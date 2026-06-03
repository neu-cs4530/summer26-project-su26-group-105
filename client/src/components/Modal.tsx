import "./Modal.css";

type ModalProps = React.PropsWithChildren<{
  close: () => void;
}>;

export default function Modal({ close, children }: ModalProps) {
  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      close();
    }
  };

  return (
    <div className="overlay" onClick={onOverlayClick}>
      <div className="modal">{children}</div>
    </div>
  );
}
