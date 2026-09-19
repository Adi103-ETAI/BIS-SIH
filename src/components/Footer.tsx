interface FooterProps {
  visible?: boolean;
}

const Footer = ({ visible = true }: FooterProps) => {
  return (
    <footer
      className={`py-4 px-4 text-center transition-all duration-500 ease-in-out overflow-hidden ${
        visible ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0 py-0'
      }`}
    >
      <span className="text-[11px] font-body text-secondary/40 tracking-[0.15em] uppercase">
        SentArc Labs
      </span>
    </footer>
  );
};

export default Footer;
